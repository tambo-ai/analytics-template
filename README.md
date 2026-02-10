# Generative UI Analytics Template

A Next.js analytics dashboard powered by [Tambo AI](https://tambo.co) for generative UI. Ask questions in natural language to generate charts and visualizations, then drag them onto a canvas to build custom dashboards.

## Features

- Generate bar, line, and pie charts via natural language
- Built-in mock analytics data (sales, products, users, KPIs) with filtering
- Drag and drop generated components onto a canvas
- Manage multiple canvas tabs as separate workspaces
- Interactive select forms for structured AI follow-up questions
- MCP (Model Context Protocol) server integration for external data sources
- Thread history with persistent context per session

## Demo

<video src="./2025-08-30-tambo-analytics.mp4" controls width="720"></video>

## Get Started

1. Create a new project:

   ```bash
   npm create-tambo@latest my-tambo-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Initialize Tambo (sets up your API key):

   ```bash
   npx tambo init
   ```

   Or rename `example.env.local` to `.env.local` and add your API key manually:

   ```env
   NEXT_PUBLIC_TAMBO_API_KEY=your-api-key
   ```

   Get an API key from [tambo.co/dashboard](https://tambo.co/dashboard).

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open `localhost:3000` and navigate to the chat interface.

You can also clone directly from GitHub:

```bash
gh repo clone tambo-ai/analytics-template
cd analytics-template
npm install
npx tambo init
npm run dev
```

## App Structure

```
src/
├── app/
│   ├── page.tsx                # Landing page with setup checklist
│   └── chat/page.tsx           # Main chat + canvas interface
├── components/
│   ├── tambo/                  # Chat UI components
│   │   ├── graph.tsx           # Chart component (bar/line/pie via Recharts)
│   │   ├── select-form.tsx     # Interactive select/multi-select form
│   │   ├── message-thread-full.tsx
│   │   ├── message-input.tsx
│   │   ├── message.tsx
│   │   ├── mcp-config-modal.tsx
│   │   └── ...
│   └── ui/                     # Canvas and interactable components
│       ├── components-canvas.tsx         # Drag & drop canvas
│       ├── interactable-tabs.tsx         # Canvas tab management
│       └── interactable-canvas-details.tsx
├── lib/
│   ├── tambo.ts                # Component & tool registration
│   ├── canvas-storage.ts       # Zustand canvas state management
│   ├── thread-hooks.ts         # Thread utility hooks
│   └── utils.ts
└── services/
    └── analytics-data.ts       # Mock analytics data with filtering
```

## How It Works

### Registering Components

Components registered with Tambo can be rendered by the AI inside the chat thread. Each component needs a name, description, React component, and a Zod schema for props validation.

```tsx
// src/lib/tambo.ts (excerpt)
import { Graph, graphSchema } from "@/components/tambo/graph";
import { SelectForm, selectFormSchema } from "@/components/tambo/select-form";
import type { TamboComponent } from "@tambo-ai/react";

export const components: TamboComponent[] = [
  {
    name: "Graph",
    description: "Renders bar, line, and pie charts using Recharts.",
    component: Graph,
    propsSchema: graphSchema,
  },
  {
    name: "SelectForm",
    description: "Interactive select form for structured follow-up questions.",
    component: SelectForm,
    propsSchema: selectFormSchema,
  },
];
```

### Registering Tools

Tools let the AI fetch data or perform actions. This template includes tools for querying mock analytics data with optional filters:

```tsx
// src/lib/tambo.ts (excerpt)
import { TamboTool } from "@tambo-ai/react";
import { getSalesData, getProducts, getUserData, getKPIs } from "@/services/analytics-data";

export const tools: TamboTool[] = [
  {
    name: "getSalesData",
    description: "Get monthly sales revenue and units. Filter by region or category.",
    tool: getSalesData,
    toolSchema: z.function().args(
      z.object({
        region: z.string().optional(),
        category: z.string().optional(),
      }).default({}),
    ),
  },
  { name: "getProducts", /* ... */ },
  { name: "getUserData", /* ... */ },
  { name: "getKPIs", /* ... */ },
];
```

### Wiring It Together

The chat page sets up `TamboProvider` with the registered components and tools, and wraps everything with `TamboMcpProvider` for MCP support:

```tsx
// src/app/chat/page.tsx (excerpt)
export default function Home() {
  const mcpServers = useMcpServers();
  const contextKey = useContextKey();

  return (
    <TamboProvider
      apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
      components={components}
      tools={tools}
      mcpServers={mcpServers}
      contextKey={contextKey}
    >
      <TamboMcpProvider>
        <div className="flex h-full overflow-hidden">
          <MessageThreadFull />
          <div className="hidden md:block w-[60%] overflow-auto">
            <InteractableTabs interactableId="Tabs" />
            <InteractableCanvasDetails interactableId="CanvasDetails" />
            <ComponentsCanvas className="h-full" />
          </div>
        </div>
      </TamboMcpProvider>
    </TamboProvider>
  );
}
```

### Canvas System

- **State management**: Zustand store in `src/lib/canvas-storage.ts` manages canvases and their items.
- **Drag & drop**: Uses `@dnd-kit` for dragging generated components from the chat onto canvas workspaces.
- **Tabs**: `InteractableTabs` lets users switch between multiple canvas workspaces.

### MCP Integration

Connect external data sources via MCP servers:

1. Configure MCP servers through the settings modal in the chat interface.
2. Server configs are stored in browser localStorage.
3. Supports SSE and HTTP MCP server transports.

## Customizing

### Add new components

Add a new React component with a Zod schema and register it in `src/lib/tambo.ts`:

```tsx
export const components: TamboComponent[] = [
  // ... existing components
  {
    name: "MyComponent",
    description: "Describe when the AI should use this component.",
    component: MyComponent,
    propsSchema: myComponentSchema,
  },
];
```

See the [Tambo docs on registering components](https://tambo.co/docs/concepts/registering-components) for more details.

### Add new data tools

Create a data-fetching function and register it as a tool in `src/lib/tambo.ts` with a Zod schema for its arguments. The AI will call these tools to retrieve data before rendering components.

### Connect real data sources

Replace the mock data in `src/services/analytics-data.ts` with calls to your actual API, database, or connect an MCP server for external data.

## Built With

- [Tambo AI](https://tambo.co) - Generative UI framework
- [Next.js](https://nextjs.org) - React framework
- [Recharts](https://recharts.org) - Charting library
- [Zustand](https://zustand.docs.pmnd.rs) - State management
- [@dnd-kit](https://dndkit.com) - Drag and drop
- [Tailwind CSS](https://tailwindcss.com) - Styling

P.S. We use Tambo under the hood to manage chat state, which components the AI can render, and which components the AI can interact with. Tambo is 100% open source — see the repository at [tambo-ai/tambo](https://github.com/tambo-ai/tambo).
