"use client";

import type { Canvas, CanvasComponent } from "@/lib/canvas-storage";
import { useCanvasStore } from "@/lib/canvas-storage";
import { useTamboInteractable, withInteractable } from "@tambo-ai/react";
import { useCallback, useEffect, useRef } from "react";
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

  // Use ref to avoid infinite re-render loops when interactableComponents changes
  const interactableComponentsRef = useRef(interactableComponents);
  useEffect(() => {
    interactableComponentsRef.current = interactableComponents;
  }, [interactableComponents]);

  // Ref to track if we've done initial publish
  const hasPublishedInitialRef = useRef(false);

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

  // Helper to build tabs payload
  const buildTabsPayload = () => {
    const s = useCanvasStore.getState();
    return {
      canvases: s.canvases.map((c) => ({ id: c.id, name: c.name })),
      activeCanvasId: s.activeCanvasId,
    };
  };

  // Helper to publish payload
  const publishPayload = useCallback((payload: {
    canvases: { id: string; name: string }[];
    activeCanvasId: string | null;
  }) => {
    const key = JSON.stringify(payload);
    if (key === lastEmittedKeyRef.current) return;
    lastEmittedKeyRef.current = key;
    onPropsUpdate?.({ state: payload, className });
    if (interactableId) {
      const match = interactableComponentsRef.current.find(
        (c) => c.props?.interactableId === interactableId,
      );
      if (match) {
        updateInteractableComponentProps(match.id, {
          state: payload,
          className,
        });
      }
    }
  }, [onPropsUpdate, className, interactableId, updateInteractableComponentProps]);

  // Outbound: emit tabs slice (ids, names) and activeCanvasId on store changes
  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe(() => {
      if (applyingRef.current) return;
      const payload = buildTabsPayload();
      publishPayload(payload);
    });
    return () => unsubscribe();
  }, [publishPayload]);

  // Initial publish: poll until interactable components are registered
  useEffect(() => {
    if (hasPublishedInitialRef.current) return;

    const tryPublishInitial = () => {
      if (hasPublishedInitialRef.current) return true;
      if (interactableComponentsRef.current.length > 0) {
        const payload = buildTabsPayload();
        publishPayload(payload);
        hasPublishedInitialRef.current = true;
        return true;
      }
      return false;
    };

    // Try immediately
    if (tryPublishInitial()) return;

    // Poll a few times to catch when components are registered
    const intervalId = setInterval(() => {
      if (tryPublishInitial()) {
        clearInterval(intervalId);
      }
    }, 50);

    // Clean up after 1 second max
    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
    }, 1000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [publishPayload]);

  // No visual UI required; tabs UI remains in page via ComponentsCanvas
  return <div className={className} aria-hidden />;
}

export const InteractableTabs = withInteractable(TabsWrapper, {
  componentName: "Tabs",
  description:
    "Tabs-only interactable. Manages canvases (id, name) and activeCanvasId. Use CanvasDetails to edit charts for the selected tab.",
  propsSchema: tabsPropsSchema,
});
