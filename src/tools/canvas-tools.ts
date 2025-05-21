import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

// Simple interfaces for our canvas data model
interface CanvasComponent {
  componentId: string;
  _componentType: string;
  [key: string]: unknown;
}

interface Canvas {
  id: string;
  name: string;
  components: CanvasComponent[];
}

const STORAGE_KEY = "tambo_canvases";

// Storage functions
function loadCanvases(): { canvases: Canvas[]; activeCanvasId?: string } {
  if (typeof localStorage === "undefined") return { canvases: [] };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.canvases)) {
        return {
          canvases: parsed.canvases,
          activeCanvasId: parsed.activeCanvasId,
        };
      }
    }
  } catch (err) {
    console.error("Failed to load canvases", err);
  }
  return { canvases: [] };
}

function saveCanvases(canvases: Canvas[], activeCanvasId?: string) {
  if (typeof localStorage === "undefined") return;
  try {
    const payload = JSON.stringify({ canvases, activeCanvasId });
    localStorage.setItem(STORAGE_KEY, payload);
  } catch (err) {
    console.error("Failed to save canvases", err);
  }
}

const generateId = () =>
  `id-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

// Create canvas tool
export const createCanvasTool: TamboTool = {
  name: "createCanvas",
  description: "Create a new canvas",
  tool: (name: string) => {
    const { canvases, activeCanvasId } = loadCanvases();
    const id = generateId();
    const canvasName = name || `New Canvas ${canvases.length + 1}`;
    const newCanvas: Canvas = { id, name: canvasName, components: [] };
    const updated = [...canvases, newCanvas];
    saveCanvases(updated, activeCanvasId);
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
    const { canvases } = loadCanvases();
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
    const { canvases } = loadCanvases();
    const canvas = canvases.find((c) => c.id === id);
    const components = canvas?.components || [];

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
