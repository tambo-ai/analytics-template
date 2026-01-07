/**
 * @file tambo.ts
 * @description Central configuration file for Tambo components and tools
 *
 * This file serves as the central place to register your Tambo components and tools.
 * It exports arrays that will be used by the TamboProvider.
 *
 * Read more about Tambo at https://tambo.co/docs
 */

import { Graph, graphSchema } from "@/components/tambo/graph";
import { SelectForm, selectFormSchema } from "@/components/tambo/select-form";
import type { TamboComponent } from "@tambo-ai/react";
import { TamboTool } from "@tambo-ai/react";
import { z } from "zod";
import {
  getSalesData,
  getProducts,
  getUserData,
  getKPIs,
} from "@/services/analytics-data";

/**
 * tools
 *
 * This array contains all the Tambo tools that are registered for use within the application.
 * Each tool is defined with its name, description, and expected props. The tools
 * can be controlled by AI to dynamically fetch data based on user interactions.
 */

export const tools: TamboTool[] = [
  {
    name: "getSalesData",
    description:
      "Get monthly sales revenue and units data. Can filter by region (North, South, East, West) or category (Electronics, Clothing, Home)",
    tool: getSalesData,
    toolSchema: z.function().args(
      z
        .object({
          region: z.string().optional(),
          category: z.string().optional(),
        })
        .default({}),
    ),
  },
  {
    name: "getProducts",
    description:
      "Get top products with sales and revenue information. Can filter by category (Electronics, Furniture, Appliances)",
    tool: getProducts,
    toolSchema: z.function().args(
      z
        .object({
          category: z.string().optional(),
        })
        .default({}),
    ),
  },
  {
    name: "getUserData",
    description:
      "Get monthly user growth and activity data. Can filter by segment (Free, Premium, Enterprise)",
    tool: getUserData,
    toolSchema: z.function().args(
      z
        .object({
          segment: z.string().optional(),
        })
        .default({}),
    ),
  },
  {
    name: "getKPIs",
    description:
      "Get key business performance indicators. Can filter by category (Financial, Growth, Quality, Retention, Marketing)",
    tool: getKPIs,
    toolSchema: z.function().args(
      z
        .object({
          category: z.string().optional(),
        })
        .default({}),
    ),
  },
];

/**
 * components
 *
 * This array contains all the Tambo components that are registered for use within the application.
 * Each component is defined with its name, description, and expected props. The components
 * can be controlled by AI to dynamically render UI elements based on user interactions.
 */
export const components: TamboComponent[] = [
  {
    name: "Graph",
    description:
      "Use this when you want to display a chart. It supports bar, line, and pie charts. When you see data generally use this component. IMPORTANT: When asked to create a graph, always generate it first in the chat - do NOT add it directly to the canvas/dashboard. Let the user decide if they want to add it.",
    component: Graph,
    propsSchema: graphSchema,
  },
  {
    name: "SelectForm",
    description:
      "ALWAYS use this component instead of listing options as bullet points in text. Whenever you need to ask the user a question and would normally follow up with bullet points or numbered options, use this component instead. For yes/no or single-choice questions, use mode='single'. For questions where the user can select multiple options, use mode='multi' (default). Each group has a label (the question) and options (the choices). Examples: 'Would you like to continue?' with Yes/No options, or 'Which regions interest you?' with multiple region options.",
    component: SelectForm,
    propsSchema: selectFormSchema,
  },
  // Add more components here
];
