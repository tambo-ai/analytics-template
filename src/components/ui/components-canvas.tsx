"use client";

import { CanvasComponent, useCanvasStore } from "@/lib/canvas-storage";
import { components } from "@/lib/tambo";
import { cn } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
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

  const sensors = useSensors(useSensor(PointerSensor));

  // Set default canvas if none exists
  React.useEffect(() => {
    // Check if localStorage already has canvases before creating a new one
    const existingStore = localStorage.getItem("tambo-canvas-storage");
    const hasExistingCanvases =
      existingStore && JSON.parse(existingStore)?.state?.canvases?.length > 0;

    // Only create a default canvas if we don't have any in storage
    if (!hasExistingCanvases && canvases.length === 0) {
      createCanvas("New Canvas 1");
    } else if (!activeCanvasId && canvases.length > 0) {
      setActiveCanvas(canvases[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on first mount

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

        // Skip if reordering within the same canvas (handled by dnd-kit)
        if (isMovingExisting && sourceCanvasId === activeCanvasId) {
          return;
        }

        // Move component between different canvases
        if (
          isMovingExisting &&
          sourceCanvasId &&
          sourceCanvasId !== activeCanvasId
        ) {
          moveComponent(sourceCanvasId, activeCanvasId, componentId);
          return;
        }

        // Add new component to canvas
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
    [activeCanvasId, addComponent, moveComponent]
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

    return <Component {...cleanProps} />;
  };

  const SortableItem: React.FC<{ componentProps: CanvasComponentProps }> = ({
    componentProps,
  }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: componentProps.componentId });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    // Extract the necessary props for the delete button
    const { canvasId, componentId, _componentType } = componentProps;

    return (
      <div className="relative group">
        {/* Delete button outside the sortable area */}
        <div className="absolute -top-2 -right-2 z-50">
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (canvasId && componentId) {
                removeComponent(canvasId, componentId);
              }
            }}
            className="bg-background border border-border rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove"
          >
            <XIcon className="h-3 w-3" />
          </button>
        </div>

        {/* Sortable content - make it draggable to other canvases */}
        <div 
          ref={setNodeRef} 
          style={style} 
          {...attributes} 
          {...listeners}
          draggable={true}
          onDragStart={(e) => {
            // Set drag data for moving between canvases
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
          className="cursor-move"
        >
          {renderComponent(componentProps)}
        </div>
      </div>
    );
  };

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || !activeCanvasId) return;

      if (active.id !== over.id) {
        const overIndex = useCanvasStore
          .getState()
          .getComponents(activeCanvasId)
          .findIndex((c) => c.componentId === over.id);
        if (overIndex === -1) return;
        useCanvasStore
          .getState()
          .reorderComponent(activeCanvasId, active.id as string, overIndex);
      }
    },
    [activeCanvasId]
  );

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

      <div className="absolute bottom-4 right-4 z-50 bg-background rounded-md">
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
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext
              items={activeCanvas.components.map((c) => c.componentId)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid gap-4">
                {activeCanvas.components.map((c) => (
                  <SortableItem key={c.componentId} componentProps={c} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
};

export default ComponentsCanvas;
