"use client";

import { ComponentsCanvas } from "@/components/ui/components-canvas";
import { useCanvasStore } from "@/lib/canvas-storage";
import { useTamboInteractable, withInteractable } from "@tambo-ai/react";
import { useEffect, useRef } from "react";
import { z } from "zod";

// Interactable: Dashboard wrapper using state-in/state-out model
// Docs: https://docs.tambo.co/concepts/components/interactable-components

const canvasSchema = z.object({
  id: z.string(),
  name: z.string(),
  components: z.array(z.any()),
});

const dashboardPropsSchema = z.object({
  className: z.string().optional(),
  state: z
    .object({
      canvases: z.array(canvasSchema),
      activeCanvasId: z.string().nullable().optional(),
    })
    .optional(),
  version: z.number().optional(),
});

type DashboardProps = z.infer<typeof dashboardPropsSchema> & {
  onPropsUpdate?: (newProps: Record<string, unknown>) => void;
  interactableId?: string;
  onInteractableReady?: (id: string) => void;
};

function DashboardWrapper(props: DashboardProps) {
  const { className, state, onPropsUpdate, version, interactableId } = props;
  const { updateInteractableComponentProps, interactableComponents } =
    useTamboInteractable();

  // Guard against feedback loops while applying inbound props
  const applyingRef = useRef(false);
  const lastEmittedKeyRef = useRef("");
  const lastAppliedVersionRef = useRef<number | undefined>(undefined);

  // Inbound: when props.state changes, reconcile Zustand store
  useEffect(() => {
    if (!state) return;
    if (version !== undefined && lastAppliedVersionRef.current === version) {
      return;
    }
    applyingRef.current = true;
    // Ensure activeCanvasId is valid
    const incomingCanvases = state.canvases || [];
    const incomingActive = state.activeCanvasId ?? null;
    const validActive = incomingCanvases.some((c) => c.id === incomingActive)
      ? incomingActive
      : incomingCanvases[0]?.id || null;
    useCanvasStore.setState({
      canvases: incomingCanvases,
      activeCanvasId: validActive,
    });
    lastAppliedVersionRef.current = version;
    // allow subscribers to run before we clear the flag
    setTimeout(() => {
      applyingRef.current = false;
    }, 0);
  }, [state, version]);

  // Outbound: when local store changes (user edits), push state up via onPropsUpdate
  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe((s) => {
      if (applyingRef.current) return;
      const nextState = {
        canvases: s.canvases,
        activeCanvasId: s.activeCanvasId,
      };
      const key = JSON.stringify(nextState);
      if (key === lastEmittedKeyRef.current) return;
      lastEmittedKeyRef.current = key;
      onPropsUpdate?.({ state: nextState, className });
      if (interactableId) {
        updateInteractableComponentProps(interactableId, { state: nextState });
      }
    });
    return () => unsubscribe();
  }, [
    onPropsUpdate,
    updateInteractableComponentProps,
    interactableId,
    className,
  ]);

  // Emit initial state once on mount so the model has a baseline
  useEffect(() => {
    const s = useCanvasStore.getState();
    const initial = {
      canvases: s.canvases,
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

  // If we don't know the runtime id, resolve it by matching interactableId prop
  useEffect(() => {
    if (!interactableId) return;
    const match = interactableComponents.find(
      (c) => c.props?.interactableId === interactableId
    );
    if (!match) return;
    const s = useCanvasStore.getState();
    const snapshot = {
      canvases: s.canvases,
      activeCanvasId: s.activeCanvasId,
    };
    updateInteractableComponentProps(match.id, {
      state: snapshot,
      className,
    });
    // Also mark emitted key so subsequent store subscriptions don't immediately re-emit identical payload
    lastEmittedKeyRef.current = JSON.stringify(snapshot);
  }, [
    interactableComponents,
    interactableId,
    updateInteractableComponentProps,
    className,
  ]);

  return <ComponentsCanvas className={className} />;
}

export const InteractableDashboard = withInteractable(DashboardWrapper, {
  componentName: "Dashboard",
  description:
    "Dashboard showing canvases and components. Accepts full state via props and emits updates when users edit.",
  propsSchema: dashboardPropsSchema,
});
