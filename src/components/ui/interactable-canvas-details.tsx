"use client";

import { useCanvasStore } from "@/lib/canvas-storage";
import { useTamboInteractable, withInteractable } from "@tambo-ai/react";
import { useEffect, useRef } from "react";
import { z } from "zod";

// Interactable that exposes/edit charts of the active canvas only

const chartSchema = z.object({
  id: z.string().describe("Canvas component id (Graph only)"),
  title: z.string().describe("Chart title"),
  type: z.enum(["bar", "line", "pie"]).describe("Chart type"),
});

const canvasDetailsPropsSchema = z.object({
  className: z.string().optional(),
  state: z
    .object({
      charts: z
        .array(chartSchema)
        .describe(
          "Active canvas charts in desired order (Graph components only)",
        ),
    })
    .optional(),
});

type CanvasDetailsProps = z.infer<typeof canvasDetailsPropsSchema> & {
  onPropsUpdate?: (newProps: Record<string, unknown>) => void;
  interactableId?: string;
};

function CanvasDetailsWrapper(props: CanvasDetailsProps) {
  const { className, state, onPropsUpdate, interactableId } = props;
  const { updateInteractableComponentProps, interactableComponents } =
    useTamboInteractable();

  const applyingRef = useRef(false);
  const lastEmittedKeyRef = useRef("");

  // Use ref to avoid infinite re-render loops when interactableComponents changes
  const interactableComponentsRef = useRef(interactableComponents);
  interactableComponentsRef.current = interactableComponents;

  // Inbound: apply edits to active canvas
  useEffect(() => {
    if (!state) return;
    applyingRef.current = true;
    const s = useCanvasStore.getState();
    const activeId = s.activeCanvasId;
    if (!activeId) {
      applyingRef.current = false;
      return;
    }
    const shards = state.charts ?? [];

    // Reorder based on provided order and update title/type
    // Build a map for quick lookup
    const idToIndex: Record<string, number> = {};
    shards.forEach((c, idx) => (idToIndex[c.id] = idx));

    // Apply updates
    shards.forEach((c) => {
      const current = useCanvasStore
        .getState()
        .getComponents(activeId)
        .find((x) => x.componentId === c.id) as
        | (Record<string, unknown> & { data?: Record<string, unknown> })
        | undefined;

      useCanvasStore.getState().updateComponent(activeId, c.id, {
        title: c.title,
        data: {
          ...(typeof current?.data === "object" && current?.data
            ? (current.data as Record<string, unknown>)
            : {}),
          type: c.type,
          // Keep title in data as well for backward compatibility
          title: c.title,
        },
      });
    });

    // Reorder according to charts order using store helper for stability
    shards.forEach((c, targetIndex) => {
      useCanvasStore.getState().reorderComponent(activeId, c.id, targetIndex);
    });

    setTimeout(() => {
      applyingRef.current = false;
    }, 0);
  }, [state]);

  // Helper to build charts payload
  const buildChartsPayload = () => {
    const s = useCanvasStore.getState();
    const active = s.activeCanvasId
      ? s.canvases.find((c) => c.id === s.activeCanvasId)
      : undefined;
    const charts = (active?.components || [])
      .filter((c) => c._componentType === "Graph")
      .map((c) => ({
        id: c.componentId,
        title:
          (c as { title?: string }).title ??
          (c as { data?: { title?: string } }).data?.title ??
          "",
        type: ((c as { data?: { type?: string } }).data?.type ?? "bar") as
          | "bar"
          | "line"
          | "pie",
      }));
    return { charts };
  };

  // Ref to track if we've done initial publish
  const hasPublishedInitialRef = useRef(false);

  // Helper to publish payload
  const publishPayload = (payload: { charts: { id: string; title: string; type: "bar" | "line" | "pie" }[] }) => {
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
  };

  // Outbound: publish simplified charts snapshot for active canvas on store changes
  useEffect(() => {
    const unsubscribe = useCanvasStore.subscribe(() => {
      if (applyingRef.current) return;
      const payload = buildChartsPayload();
      publishPayload(payload);
    });
    return () => unsubscribe();
  }, [
    onPropsUpdate,
    updateInteractableComponentProps,
    interactableId,
    className,
  ]);

  // Initial publish: poll until interactable components are registered
  useEffect(() => {
    if (hasPublishedInitialRef.current) return;

    const tryPublishInitial = () => {
      if (hasPublishedInitialRef.current) return true;
      if (interactableComponentsRef.current.length > 0) {
        const payload = buildChartsPayload();
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
  }, []);

  // Minimal UI (hidden content is fine; needs to be rendered for MCP)
  return (
    <div className={className} aria-hidden>
      {/* CanvasDetails interactable (no visible UI) */}
    </div>
  );
}

export const InteractableCanvasDetails = withInteractable(
  CanvasDetailsWrapper,
  {
    componentName: "CanvasDetails",
    description:
      "Active tab charts (Graph only). To edit charts, update 'state.charts' with desired order, titles, and types.",
    propsSchema: canvasDetailsPropsSchema,
  },
);
