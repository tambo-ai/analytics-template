"use client";

import { Graph, GraphProps } from "@/components/ui/graph";
import { cn } from "@/lib/utils";
import * as React from "react";

export interface GraphCanvasProps extends React.HTMLAttributes<HTMLDivElement> {}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  className,
  ...props
}) => {
  const [graphs, setGraphs] = React.useState<GraphProps[]>([]);

  const handleDrop = React.useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const data = e.dataTransfer.getData("application/json");
      if (!data) return;
      try {
        const parsed = JSON.parse(data);
        if (parsed.component === "Graph" && parsed.props) {
          setGraphs((prev) => [...prev, parsed.props as GraphProps]);
        }
      } catch (err) {
        console.error("Invalid drop data", err);
      }
    },
    [],
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  return (
    <div
      data-canvas-space="true"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={cn(
        "w-[800px] h-[600px] overflow-auto p-4 border border-border",
        className,
      )}
      {...props}
    >
      {graphs.length === 0 ? (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
          Drag graphs here
        </div>
      ) : (
        <div className="grid gap-4">
          {graphs.map((g, idx) => (
            <Graph key={idx} {...g} />
          ))}
        </div>
      )}
    </div>
  );
};

export default GraphCanvas;
