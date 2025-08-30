"use client";
import { InteractableDashboard } from "@/components/ui/interactable-dashboard";
import { MessageThreadFull } from "@/components/ui/message-thread-full";
import { components, tools } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";
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
  const mcpServers: MCPServerConfig[] = [];

  // You can customize default suggestions via MessageThreadFull internals

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
              <MessageThreadFull contextKey="tambo-template" />
            </div>
            <div className="hidden md:block w-[60%] overflow-auto">
              <InteractableDashboard
                interactableId="Dashboard"
                className="h-full"
              />
            </div>
          </div>
        </TamboMcpProvider>
      </TamboProvider>
    </div>
  );
}
