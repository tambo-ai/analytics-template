"use client";

import { components } from "@/lib/tambo";
import { cn } from "@/lib/utils";
import { TamboComponent } from "@tambo-ai/react";
import * as React from "react";

// Generate a unique ID for components
const generateId = () =>
  `component-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Define a generic component props interface that includes our canvas-specific props
interface CanvasComponentProps {
  _inCanvas?: boolean;
  canvasId?: string;
  _componentType?: string;
  // Using Record instead of any for better type safety while maintaining flexibility
  [key: string]: unknown;
}

export const ComponentsCanvas: React.FC<
  React.HTMLAttributes<HTMLDivElement>
> = ({ className, ...props }) => {
  const [canvasComponents, setCanvasComponents] = React.useState<
    CanvasComponentProps[]
  >([]);

  const handleDrop = React.useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;
    try {
      const parsed = JSON.parse(data);
      if (parsed.component && parsed.props) {
        const componentProps = parsed.props as CanvasComponentProps;

        // Check if this component is already in the canvas
        if (componentProps._inCanvas && componentProps.canvasId) {
          // Moving within canvas - remove from old position
          setCanvasComponents((prev) =>
            prev.filter((c) => c.canvasId !== componentProps.canvasId)
          );
        }

        // Add component to canvas (for both copy and move operations)
        setCanvasComponents((prev) => [
          ...prev,
          {
            ...componentProps,
            _inCanvas: true,
            canvasId: componentProps.canvasId || generateId(),
            _componentType: parsed.component, // Store the component type
          },
        ]);
      }
    } catch (err) {
      console.error("Invalid drop data", err);
    }
  }, []);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect =
      e.dataTransfer.effectAllowed === "move" ? "move" : "copy";
  };

  // Find component definition from registry
  const renderComponent = (componentProps: CanvasComponentProps) => {
    const componentType = componentProps._componentType;
    const componentDef = components.find(
      (comp: TamboComponent) => comp.name === componentType
    );

    if (!componentDef) {
      return (
        <div key={componentProps.canvasId}>
          Unknown component type: {componentType}
        </div>
      );
    }

    const Component = componentDef.component;
    // Filter out our custom props that shouldn't be passed to the component
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _componentType, ...cleanProps } = componentProps;

    return <Component key={componentProps.canvasId} {...cleanProps} />;
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        "w-full h-full overflow-auto p-4 border border-border",
        className
      )}
      {...props}
    >
      {canvasComponents.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
          Drag components here
        </div>
      ) : (
        <div className="grid gap-4">
          {canvasComponents.map(renderComponent)}
        </div>
      )}
    </div>
  );
};

export default ComponentsCanvas;
