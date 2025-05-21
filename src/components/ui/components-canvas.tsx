"use client";

import { CanvasComponent, useCanvasStore } from "@/lib/canvas-storage";
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

// Define a generic component props interface that includes our canvas-specific props
type CanvasComponentProps = CanvasComponent;

export const ComponentsCanvas: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => {
  const {
    canvases,
    activeCanvasId,
    createCanvas,
    updateCanvas,
    removeCanvas,
    setActiveCanvas,
    clearCanvas,
    removeComponent,
    addComponent,
    moveComponent,
  } = useCanvasStore();

  const [editingCanvasId, setEditingCanvasId] = React.useState<string | null>(
    null
  );
  const [pendingDeleteCanvasId, setPendingDeleteCanvasId] = React.useState<
    string | null
  >(null);
  const [editingName, setEditingName] = React.useState("");

  // Set default canvas if none exists
  React.useEffect(() => {
    if (canvases.length === 0) {
      createCanvas("New Canvas 1");
    } else if (!activeCanvasId && canvases.length > 0) {
      setActiveCanvas(canvases[0].id);
    }
  }, [canvases, activeCanvasId, createCanvas, setActiveCanvas]);

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!activeCanvasId) return;

      const data = e.dataTransfer.getData("application/json");
      if (!data) return;

      try {
        const parsed = JSON.parse(data);
        if (!parsed.component || !parsed.props) return;

        const componentProps = parsed.props as CanvasComponentProps;
        const isMovingExisting =
          componentProps._inCanvas &&
          componentProps.componentId &&
          componentProps.canvasId;
        const sourceCanvasId = componentProps.canvasId;
        const componentId =
          componentProps.componentId ||
          `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

        // Get drop position information from the event
        const dropTarget = e.target as HTMLElement;
        const dropRect = dropTarget.getBoundingClientRect();
        const dropY = e.clientY - dropRect.top;
        const dropRatio = dropY / dropRect.height;

        // If it's an existing component being reordered in the same canvas
        if (isMovingExisting && sourceCanvasId === activeCanvasId) {
          // Get target canvas components
          const canvas = canvases.find((c) => c.id === activeCanvasId);
          if (!canvas) return;

          // Determine drop index based on position
          let targetIndex = Math.floor(dropRatio * canvas.components.length);

          // Ensure index is valid
          targetIndex = Math.max(
            0,
            Math.min(canvas.components.length - 1, targetIndex)
          );

          // Use store to reorder component
          useCanvasStore
            .getState()
            .reorderComponent(activeCanvasId, componentId, targetIndex);
          return;
        }

        // If moving component between different canvases
        if (
          isMovingExisting &&
          sourceCanvasId &&
          sourceCanvasId !== activeCanvasId
        ) {
          moveComponent(sourceCanvasId, activeCanvasId, componentId);
          return;
        }

        // If it's a new component or was dragged from palette
        addComponent(activeCanvasId, {
          ...componentProps,
          componentId,
          _inCanvas: true,
          _componentType: parsed.component,
        });
      } catch (err) {
        console.error("Invalid drop data", err);
      }
    },
    [activeCanvasId, addComponent, moveComponent, canvases]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect =
      e.dataTransfer.effectAllowed === "move" ? "move" : "copy";
  };

  const handleCreateCanvas = React.useCallback(() => {
    createCanvas();
  }, [createCanvas]);

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
      updateCanvas(editingCanvasId, name);
    }
    setEditingCanvasId(null);
  }, [editingCanvasId, editingName, updateCanvas]);

  const handleDeleteCanvas = React.useCallback(
    (id: string) => {
      if (pendingDeleteCanvasId === id) {
        // Confirmed deletion, actually delete the canvas
        removeCanvas(id);
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
    [pendingDeleteCanvasId, removeCanvas]
  );

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
    const { _componentType, componentId, canvasId, _inCanvas, ...cleanProps } =
      componentProps;

    return (
      <div
        key={componentId}
        className="relative group"
        draggable={true}
        onDragStart={(e) => {
          // Set drag data for internal reordering
          const dragData = {
            component: _componentType,
            props: {
              ...componentProps,
              _inCanvas: true,
              componentId,
              canvasId,
            },
          };
          e.dataTransfer.setData("application/json", JSON.stringify(dragData));
          e.dataTransfer.effectAllowed = "move";
        }}
      >
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
              setActiveCanvas(c.id);
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
            onClick={() => activeCanvasId && clearCanvas(activeCanvasId)}
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
