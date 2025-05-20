"use client";

import { components } from "@/lib/tambo";
import { cn } from "@/lib/utils";
import { TamboComponent } from "@tambo-ai/react";
import {
  CheckIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
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
  const [activeCanvasId, setActiveCanvasId] = React.useState<string | null>(
    null
  );
  const [editingCanvasId, setEditingCanvasId] = React.useState<string | null>(
    null
  );
  const [pendingDeleteCanvasId, setPendingDeleteCanvasId] = React.useState<
    string | null
  >(null);
  const [editingName, setEditingName] = React.useState("");

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
          setActiveCanvasId(
            parsed.activeCanvasId || parsed.canvases[0]?.id || null
          );
          return;
        }
      }
    } catch (err) {
      console.error("Failed to load canvases", err);
    }

    const defaultCanvas: Canvas = {
      id: generateId(),
      name: "New Canvas 1",
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
                  (comp) => comp.componentId !== componentProps.componentId
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
                        componentId: componentProps.componentId || generateId(),
                        canvasId: activeCanvasId,
                        _componentType: parsed.component,
                      },
                    ],
                  }
                : c
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
                  (comp) => comp.componentId !== componentId
                ),
              }
            : c
        )
      );
    },
    []
  );

  const clearCanvas = React.useCallback((canvasId: string) => {
    setCanvases((prev) =>
      prev.map((c) => (c.id === canvasId ? { ...c, components: [] } : c))
    );
  }, []);

  // Find component definition from registry
  const renderComponent = (componentProps: CanvasComponentProps) => {
    const componentType = componentProps._componentType;
    const componentDef = components.find(
      (comp: TamboComponent) => comp.name === componentType
    );

    if (!componentDef) {
      return (
        <div key={componentProps.componentId}>
          Unknown component type: {componentType}
        </div>
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
          onClick={() =>
            canvasId && componentId && removeComponent(canvasId, componentId)
          }
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
    const id = generateId();
    const newCanvasIndex = canvases.length + 1;
    const name = `New Canvas ${newCanvasIndex}`;
    setCanvases((prev) => [...prev, { id, name, components: [] }]);
    setActiveCanvasId(id);
  }, [canvases]);

  const startRenameCanvas = React.useCallback(
    (id: string) => {
      const canvas = canvases.find((c) => c.id === id);
      if (!canvas) return;
      setEditingCanvasId(id);
      setEditingName(canvas.name);
      setPendingDeleteCanvasId(null);
    },
    [canvases]
  );

  const saveRenameCanvas = React.useCallback(() => {
    if (!editingCanvasId) return;
    const name = editingName.trim();
    if (name) {
      setCanvases((prev) =>
        prev.map((c) => (c.id === editingCanvasId ? { ...c, name } : c))
      );
    }
    setEditingCanvasId(null);
  }, [editingCanvasId, editingName]);

  const handleDeleteCanvas = React.useCallback(
    (id: string) => {
      if (pendingDeleteCanvasId === id) {
        // Confirmed deletion, actually delete the canvas
        setCanvases((prev) => prev.filter((c) => c.id !== id));
        setActiveCanvasId((prev) => {
          if (prev === id) {
            const remaining = canvases.filter((c) => c.id !== id);
            return remaining[0]?.id || null;
          }
          return prev;
        });
        setPendingDeleteCanvasId(null);
      } else {
        // First click, mark as pending deletion
        setPendingDeleteCanvasId(id);
        // Clear pending deletion after a timeout
        setTimeout(() => {
          setPendingDeleteCanvasId((current) =>
            current === id ? null : current
          );
        }, 3000);
      }
    },
    [canvases, pendingDeleteCanvasId]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn("w-full h-full flex flex-col relative", className)}
      {...props}
    >
      <div
        className={cn(
          "flex items-center overflow-x-auto p-2 pr-10 gap-1",
          "[&::-webkit-scrollbar]:w-[6px]",
          "[&::-webkit-scrollbar-thumb]:bg-gray-300",
          "[&::-webkit-scrollbar:horizontal]:h-[4px]"
        )}
      >
        {canvases.map((c) => (
          <div
            key={c.id}
            onClick={() => {
              setActiveCanvasId(c.id);
              setPendingDeleteCanvasId(null);
            }}
            className={cn(
              "px-3 py-1 text-sm cursor-pointer whitespace-nowrap flex items-center gap-1 border-b-2",
              activeCanvasId === c.id
                ? "border-border text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {editingCanvasId === c.id ? (
              <>
                <input
                  autoFocus
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="bg-transparent border-b border-border/50 focus:outline-none text-sm w-24"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    saveRenameCanvas();
                  }}
                  className="ml-1 p-0.5 hover:text-foreground"
                  title="Save"
                >
                  <CheckIcon className="h-3 w-3" />
                </button>
              </>
            ) : (
              <>
                <span>{c.name}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    startRenameCanvas(c.id);
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
                  className={cn(
                    "ml-1 p-0.5 hover:text-foreground",
                    pendingDeleteCanvasId === c.id &&
                      "text-red-500 hover:text-red-600"
                  )}
                  title={
                    pendingDeleteCanvasId === c.id ? "Confirm delete" : "Delete"
                  }
                >
                  {pendingDeleteCanvasId === c.id ? (
                    <CheckIcon className="h-3 w-3" />
                  ) : (
                    <TrashIcon className="h-3 w-3" />
                  )}
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="absolute top-2 right-2">
        <button
          onClick={handleCreateCanvas}
          className="p-1 hover:text-foreground bg-background/80 backdrop-blur-sm rounded"
          title="New canvas"
        >
          <PlusIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="absolute bottom-4 right-4">
        {activeCanvasId && (
          <button
            onClick={() => clearCanvas(activeCanvasId)}
            className="px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800 rounded-md shadow-sm flex items-center gap-1.5 text-sm"
            title="Clear canvas"
          >
            <XIcon className="h-4 w-4" />
            <span>Clear Canvas</span>
          </button>
        )}
      </div>

      <div
        className={cn(
          "flex-1 overflow-auto p-4",
          "[&::-webkit-scrollbar]:w-[6px]",
          "[&::-webkit-scrollbar-thumb]:bg-gray-300",
          "[&::-webkit-scrollbar:horizontal]:h-[4px]"
        )}
      >
        {!activeCanvas || activeCanvas.components.length === 0 ? (
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
