"use client";
import { MessageThreadFull } from "@/components/ui/message-thread-full";
import { components } from "@/lib/tambo";
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
  const mcpServers: MCPServerConfig[] = [
    {
      name: "federal-reserve-api",
      url: process.env.NEXT_PUBLIC_FRED_SMITHERY_AI_URL!,
      transport: MCPTransport.HTTP,
    },
  ];

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <TamboProvider
        apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
        components={components}
      >
        <TamboMcpProvider mcpServers={mcpServers}>
          <div className="flex-1 overflow-hidden">
            <MessageThreadFull contextKey="tambo-template" />
          </div>
        </TamboMcpProvider>
      </TamboProvider>
    </div>
  );
}
