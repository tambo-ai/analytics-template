"use client";

import { components } from "@/lib/tambo";
import { cn } from "@/lib/utils";
import { TamboComponent } from "@tambo-ai/react";
import {
  PlusIcon,
  TrashIcon,
  XIcon,
  PencilIcon,
} from "lucide-react";
import * as React from "react";

// Generate a unique ID for components or canvases
const generateId = () =>
  `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Define a generic component props interface that includes our canvas-specific props
interface CanvasComponentProps {
  _inCanvas?: boolean;
  /** Unique id for this component */
  componentId?: string;
  /** Id of the canvas this component belongs to */
  canvasId?: string;
  _componentType?: string;
  // Using Record instead of any for better type safety while maintaining flexibility
  [key: string]: unknown;
}

interface Canvas {
  id: string;
  name: string;
  components: CanvasComponentProps[];
}

export const ComponentsCanvas: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => {
  const [canvases, setCanvases] = React.useState<Canvas[]>([]);
  const [activeCanvasId, setActiveCanvasId] = React.useState<string | null>(null);

  const STORAGE_KEY = "tambo_canvases";

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as {
          canvases: Canvas[];
          activeCanvasId?: string;
        };
        if (Array.isArray(parsed.canvases)) {
          setCanvases(parsed.canvases);
          setActiveCanvasId(parsed.activeCanvasId || parsed.canvases[0]?.id || null);
          return;
        }
      }
    } catch (err) {
      console.error("Failed to load canvases", err);
    }

    const defaultCanvas: Canvas = {
      id: generateId(),
      name: "Canvas 1",
      components: [],
    };
    setCanvases([defaultCanvas]);
    setActiveCanvasId(defaultCanvas.id);
  }, []);

  React.useEffect(() => {
    try {
      const payload = JSON.stringify({ canvases, activeCanvasId });
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (err) {
      console.error("Failed to save canvases", err);
    }
  }, [canvases, activeCanvasId]);

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!activeCanvasId) return;
      const data = e.dataTransfer.getData("application/json");
      if (!data) return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.component && parsed.props) {
          const componentProps = parsed.props as CanvasComponentProps;

          if (componentProps._inCanvas && componentProps.componentId) {
            setCanvases((prev) =>
              prev.map((c) => ({
                ...c,
                components: c.components.filter(
                  (comp) => comp.componentId !== componentProps.componentId,
                ),
              }))
            );
          }

          setCanvases((prev) =>
            prev.map((c) =>
              c.id === activeCanvasId
                ? {
                    ...c,
                    components: [
                      ...c.components,
                      {
                        ...componentProps,
                        _inCanvas: true,
                        componentId:
                          componentProps.componentId || generateId(),
                        canvasId: activeCanvasId,
                        _componentType: parsed.component,
                      },
                    ],
                  }
                : c,
            )
          );
        }
      } catch (err) {
        console.error("Invalid drop data", err);
      }
    },
    [activeCanvasId]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect =
      e.dataTransfer.effectAllowed === "move" ? "move" : "copy";
  };

  const removeComponent = React.useCallback(
    (canvasId: string, componentId: string) => {
      setCanvases((prev) =>
        prev.map((c) =>
          c.id === canvasId
            ? {
                ...c,
                components: c.components.filter(
                  (comp) => comp.componentId !== componentId,
                ),
              }
            : c,
        )
      );
    },
    [],
  );

  const clearCanvas = React.useCallback((canvasId: string) => {
    setCanvases((prev) =>
      prev.map((c) => (c.id === canvasId ? { ...c, components: [] } : c)),
    );
  }, []);

  // Find component definition from registry
  const renderComponent = (componentProps: CanvasComponentProps) => {
    const componentType = componentProps._componentType;
    const componentDef = components.find(
      (comp: TamboComponent) => comp.name === componentType,
    );

    if (!componentDef) {
      return (
        <div key={componentProps.componentId}>Unknown component type: {componentType}</div>
      );
    }

    const Component = componentDef.component;
    // Filter out our custom props that shouldn't be passed to the component
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _componentType, componentId, canvasId, ...cleanProps } =
      componentProps;

    return (
      <div key={componentId} className="relative group">
        <button
          onClick={() => canvasId && componentId && removeComponent(canvasId, componentId)}
          className="absolute -top-2 -right-2 bg-background border border-border rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Remove"
        >
          <XIcon className="h-3 w-3" />
        </button>
        <Component {...cleanProps} />
      </div>
    );
  };

  const activeCanvas = canvases.find((c) => c.id === activeCanvasId);

  const handleCreateCanvas = React.useCallback(() => {
    const name = prompt("Canvas name")?.trim();
    if (!name) return;
    const id = generateId();
    setCanvases((prev) => [...prev, { id, name, components: [] }]);
    setActiveCanvasId(id);
  }, []);

  const handleRenameCanvas = React.useCallback((id: string) => {
    const canvas = canvases.find((c) => c.id === id);
    const name = prompt("Canvas name", canvas?.name) ?? undefined;
    if (!name) return;
    setCanvases((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }, [canvases]);

  const handleDeleteCanvas = React.useCallback((id: string) => {
    if (!confirm("Delete this canvas?")) return;
    setCanvases((prev) => prev.filter((c) => c.id !== id));
    setActiveCanvasId((prev) => {
      if (prev === id) {
        const remaining = canvases.filter((c) => c.id !== id);
        return remaining[0]?.id || null;
      }
      return prev;
    });
  }, [canvases]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn("w-full h-full flex flex-col border border-border", className)}
      {...props}
    >
      <div className="flex items-center overflow-x-auto border-b p-2 gap-1">
        {canvases.map((c) => (
          <div
            key={c.id}
            onClick={() => setActiveCanvasId(c.id)}
            className={cn(
              "px-3 py-1 text-sm rounded-t-md cursor-pointer whitespace-nowrap flex items-center gap-1",
              activeCanvasId === c.id
                ? "bg-background border border-border border-b-transparent"
                : "bg-muted text-muted-foreground"
            )}
          >
            <span>{c.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRenameCanvas(c.id);
              }}
              className="ml-1 p-0.5 hover:text-foreground"
              title="Rename"
            >
              <PencilIcon className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteCanvas(c.id);
              }}
              className="ml-1 p-0.5 hover:text-foreground"
              title="Delete"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        ))}
        <button
          onClick={handleCreateCanvas}
          className="ml-auto p-1 hover:text-foreground"
          title="New canvas"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
        {activeCanvasId && (
          <button
            onClick={() => clearCanvas(activeCanvasId)}
            className="p-1 hover:text-foreground"
            title="Clear canvas"
          >
            <XIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        {(!activeCanvas || activeCanvas.components.length === 0) ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Drag components here
          </div>
        ) : (
          <div className="grid gap-4">
            {activeCanvas.components.map(renderComponent)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComponentsCanvas;
