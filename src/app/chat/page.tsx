"use client";
import { ComponentsCanvas } from "@/components/ui/components-canvas";
import { MessageThreadFull } from "@/components/ui/message-thread-full";
import { components, tools } from "@/lib/tambo";
import { Suggestion, TamboProvider } from "@tambo-ai/react";
import { TamboMcpProvider } from "@tambo-ai/react/mcp";

// Define MCP transport types
export enum MCPTransport {
  SSE = "sse",
  HTTP = "http",
}

// Define MCP server configuration types
export type MCPServerConfig =
  | string
  | {
      url: string;
      transport?: MCPTransport;
      name?: string;
    };

export default function Home() {
  // Load MCP server configurations
  const mcpServers: MCPServerConfig[] = [
    {
      name: "federal-reserve-api",
      url: process.env.NEXT_PUBLIC_FRED_SMITHERY_AI_URL!,
      transport: MCPTransport.HTTP,
    },
  ];

  // Define default suggestions for the chat
  const defaultSuggestions: Suggestion[] = [
    {
      id: "suggestion-1",
      title: "Sales performance",
      detailedSuggestion: "Show me our sales performance for the last quarter",
      messageId: "analytics-query",
    },
    {
      id: "suggestion-2",
      title: "User growth trends",
      detailedSuggestion: "What are our user growth trends over the past year?",
      messageId: "analytics-query",
    },
    {
      id: "suggestion-3",
      title: "Revenue breakdown",
      detailedSuggestion:
        "Can you provide a breakdown of our revenue by product category?",
      messageId: "analytics-query",
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <TamboProvider
        apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
        components={components}
        tools={tools}
      >
        <TamboMcpProvider mcpServers={mcpServers}>
          <div className="flex h-full overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <MessageThreadFull
                contextKey="tambo-template"
                suggestions={defaultSuggestions}
              />
            </div>
            <div className="hidden md:block w-[60%] overflow-auto">
              <ComponentsCanvas className="h-full" />
            </div>
          </div>
        </TamboMcpProvider>
      </TamboProvider>
    </div>
  );
}
