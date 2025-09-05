"use client";

import type { Canvas, CanvasComponent } from "@/lib/canvas-storage";
import { useCanvasStore } from "@/lib/canvas-storage";
import { useTamboInteractable, withInteractable } from "@tambo-ai/react";
import { useEffect, useRef } from "react";
import { z } from "zod";

// Interactable: Tabs-only manager (ids, names, activeCanvasId)

const tabSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const tabsPropsSchema = z.object({
  className: z.string().optional(),
  state: z
    .object({
      canvases: z.array(tabSchema),
      activeCanvasId: z.string().nullable().optional(),
    })
    .optional(),
});

type TabsProps = z.infer<typeof tabsPropsSchema> & {
  onPropsUpdate?: (newProps: Record<string, unknown>) => void;
  interactableId?: string;
};

function TabsWrapper(props: TabsProps) {
  const { className, state, onPropsUpdate, interactableId } = props;
  const { updateInteractableComponentProps, interactableComponents } =
    useTamboInteractable();

  const applyingRef = useRef(false);
  const lastEmittedKeyRef = useRef("");

  // Inbound: reconcile tabs only (ids, names, order, add/remove) and activeCanvasId
  useEffect(() => {
    if (!state) return;
    applyingRef.current = true;

    const incomingTabs = state.canvases || [];
    const incomingActive = state.activeCanvasId ?? null;

    // Build new canvases array preserving existing components by id
    const { canvases: currentCanvases } = useCanvasStore.getState();
    const idToCanvas = new Map(currentCanvases.map((c) => [c.id, c] as const));

    const nextCanvases = incomingTabs.map((t) => {
      const existing = idToCanvas.get(t.id);
      if (existing) {
        return { ...existing, name: t.name };
      }
      return {
        id: t.id,
        name: t.name,
        components: [] as CanvasComponent[],
      } as Canvas;
    });

    const validActive = nextCanvases.some((c) => c.id === incomingActive)
      ? incomingActive
      : nextCanvases[0]?.id || null;

    useCanvasStore.setState({
      canvases: nextCanvases as Canvas[],
      activeCanvasId: validActive,
    });

    setTimeout(() => {
      applyingRef.current = false;
    }, 0);
  }, [state]);

  // Outbound: emit tabs slice (ids, names) and activeCanvasId
  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe((s) => {
      if (applyingRef.current) return;
      const payload = {
        canvases: s.canvases.map((c) => ({ id: c.id, name: c.name })),
        activeCanvasId: s.activeCanvasId,
      };
      const key = JSON.stringify(payload);
      if (key === lastEmittedKeyRef.current) return;
      lastEmittedKeyRef.current = key;
      onPropsUpdate?.({ state: payload, className });
      if (interactableId) {
        const match = interactableComponents.find(
          (c) => c.props?.interactableId === interactableId,
        );
        if (match) {
          updateInteractableComponentProps(match.id, {
            state: payload,
            className,
          });
        }
      }
    });
    return () => unsubscribe();
  }, [
    onPropsUpdate,
    updateInteractableComponentProps,
    interactableId,
    className,
    interactableComponents,
  ]);

  // Initial publish
  useEffect(() => {
    const s = useCanvasStore.getState();
    const initial = {
      canvases: s.canvases.map((c) => ({ id: c.id, name: c.name })),
      activeCanvasId: s.activeCanvasId,
    };
    const key = JSON.stringify(initial);
    lastEmittedKeyRef.current = key;
    onPropsUpdate?.({ state: initial, className });
    if (interactableId) {
      updateInteractableComponentProps(interactableId, { state: initial });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [className, interactableId, updateInteractableComponentProps]);

  // Resolve runtime id and publish snapshot
  useEffect(() => {
    if (!interactableId) return;
    const match = interactableComponents.find(
      (c) => c.props?.interactableId === interactableId,
    );
    if (!match) return;
    const s = useCanvasStore.getState();
    const snapshot = {
      canvases: s.canvases.map((c) => ({ id: c.id, name: c.name })),
      activeCanvasId: s.activeCanvasId,
    };
    updateInteractableComponentProps(match.id, {
      state: snapshot,
      className,
    });
    lastEmittedKeyRef.current = JSON.stringify(snapshot);
  }, [
    interactableComponents,
    interactableId,
    updateInteractableComponentProps,
    className,
  ]);

  // No visual UI required; tabs UI remains in page via ComponentsCanvas
  return <div className={className} aria-hidden />;
}

export const InteractableTabs = withInteractable(TabsWrapper, {
  componentName: "Tabs",
  description:
    "Tabs-only interactable. Manages canvases (id, name) and activeCanvasId. Use CanvasDetails to edit charts for the selected tab.",
  propsSchema: tabsPropsSchema,
});
