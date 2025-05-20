
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";

interface CanvasComponent {
  componentId: string;
  _componentType?: string;
  [key: string]: unknown;
}

interface Canvas {
  id: string;
  name: string;
  components: CanvasComponent[];
}

const STORAGE_KEY = "tambo_canvases";

function loadCanvases(): { canvases: Canvas[]; activeCanvasId?: string } {
  if (typeof localStorage === "undefined") return { canvases: [] };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed.canvases)) {
        return { canvases: parsed.canvases, activeCanvasId: parsed.activeCanvasId };
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

/** Create a new canvas */
export const createCanvasTool: TamboTool = {
  name: "createCanvas",
  description: "Create a new canvas and return the id",
  tool: (name?: string) => {
    const { canvases, activeCanvasId } = loadCanvases();
    const id = generateId();
    const canvasName = name || `New Canvas ${canvases.length + 1}`;
    const newCanvas: Canvas = { id, name: canvasName, components: [] };
    const updated = [...canvases, newCanvas];
    saveCanvases(updated, activeCanvasId);
    return newCanvas;
  },
  toolSchema: z
    .function()
    .args(z.string().optional())
    .returns(
      z.object({
        id: z.string(),
        name: z.string(),
        components: z.array(z.any()),
      }),
    ),
};

/** Get all canvases */
export const getCanvasesTool: TamboTool = {
  name: "getCanvases",
  description: "Get the list of canvases",
  tool: () => {
    const { canvases } = loadCanvases();
    return canvases;
  },
  toolSchema: z.function().args().returns(z.array(z.any())),
};

/** Update canvas name */
export const updateCanvasTool: TamboTool = {
  name: "updateCanvas",
  description: "Update a canvas name given its id",
  tool: (id: string, name: string) => {
    const { canvases, activeCanvasId } = loadCanvases();
    const updated = canvases.map((c) => (c.id === id ? { ...c, name } : c));
    saveCanvases(updated, activeCanvasId);
    return updated.find((c) => c.id === id) ?? null;
  },
  toolSchema: z
    .function()
    .args(z.string(), z.string())
    .returns(z.any()),
};

/** Get components for a canvas */
export const getCanvasComponentsTool: TamboTool = {
  name: "getCanvasComponents",
  description: "Get all components for a canvas",
  tool: (id: string) => {
    const { canvases } = loadCanvases();
    return canvases.find((c) => c.id === id)?.components || [];
  },
  toolSchema: z.function().args(z.string()).returns(z.array(z.any())),
};

/** Update a component's props in a canvas */
export const updateCanvasComponentTool: TamboTool = {
  name: "updateCanvasComponent",
  description: "Update component props in a canvas",
  tool: (canvasId: string, componentId: string, props: Record<string, unknown>) => {
    const { canvases, activeCanvasId } = loadCanvases();
    const updated = canvases.map((c) => {
      if (c.id !== canvasId) return c;
      return {
        ...c,
        components: c.components.map((comp) =>
          comp.componentId === componentId ? { ...comp, ...props } : comp,
        ),
      };
    });
    saveCanvases(updated, activeCanvasId);
    return (
      updated
        .find((c) => c.id === canvasId)
        ?.components.find((comp) => comp.componentId === componentId) || null
    );
  },
  toolSchema: z
    .function()
    .args(z.string(), z.string(), z.record(z.any()))
    .returns(z.any()),
};

export const canvasTools = [
  createCanvasTool,
  getCanvasesTool,
  updateCanvasTool,
  getCanvasComponentsTool,
  updateCanvasComponentTool,
];

