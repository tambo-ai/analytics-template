import { useCanvasStore } from "@/lib/canvas-storage";
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

// Create canvas tool
export const createCanvasTool: TamboTool = {
  name: "createCanvas",
  description: "Create a new canvas",
  tool: (name: string) => {
    // Access the store directly to create a canvas
    const store = useCanvasStore.getState();
    const newCanvas = store.createCanvas(name);

    return {
      success: true,
      canvas: newCanvas,
    };
  },
  toolSchema: z
    .function()
    .args(z.string())
    .returns(
      z.object({
        success: z.boolean(),
        canvas: z.record(z.string(), z.unknown()),
      })
    ),
};

// Get canvases tool
export const getCanvasesTool: TamboTool = {
  name: "getCanvases",
  description: "Get the list of all canvases",
  tool: () => {
    // Access the store directly to get canvases
    const store = useCanvasStore.getState();
    const canvases = store.getCanvases();

    return {
      success: true,
      canvases: canvases,
    };
  },
  toolSchema: z
    .function()
    .args()
    .returns(
      z.object({
        success: z.boolean(),
        canvases: z.array(z.record(z.string(), z.unknown())),
      })
    ),
};

// Get canvas components tool
export const getCanvasComponentsTool: TamboTool = {
  name: "getCanvasComponents",
  description: "Get all components for a specific canvas",
  tool: (id: string) => {
    // Access the store directly to get components
    const store = useCanvasStore.getState();
    const canvas = store.getCanvas(id);
    const components = store.getComponents(id);

    return {
      success: true,
      found: !!canvas,
      components: components,
    };
  },
  toolSchema: z
    .function()
    .args(z.string())
    .returns(
      z.object({
        success: z.boolean(),
        found: z.boolean(),
        components: z.array(z.record(z.string(), z.unknown())),
      })
    ),
};

// TODO: Implement update tools that work correctly
// The update tools need a way to:
// 1. Pass component type dynamically
// 2. Validate the props against the correct component schema
// 3. Handle empty props objects correctly
// Current implementation causes schema validation errors with Tambo

// Export all tools
export const canvasTools = [
  createCanvasTool,
  getCanvasesTool,
  getCanvasComponentsTool,
];
