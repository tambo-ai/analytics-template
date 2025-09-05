"use client";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import ComponentsCanvas from "@/components/ui/components-canvas";
import { InteractableCanvasDetails } from "@/components/ui/interactable-canvas-details";
import { InteractableTabs } from "@/components/ui/interactable-tabs";
import { components, tools } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";
import { TamboMcpProvider } from "@tambo-ai/react/mcp";

export default function Home() {
  const mcpServers = useMcpServers();

  // You can customize default suggestions via MessageThreadFull internals

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <TamboProvider
        apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
        tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL!}
        components={components}
        tools={tools}
      >
        <TamboMcpProvider mcpServers={mcpServers}>
          <div className="flex h-full overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <MessageThreadFull contextKey="tambo-template" />
            </div>
            <div className="hidden md:block w-[60%] overflow-auto">
              {/* Tabs interactable manages tabs state only */}
              <InteractableTabs interactableId="Tabs" />

              {/* Canvas details for active tab charts */}
              <InteractableCanvasDetails interactableId="CanvasDetails" />

              {/* Visual canvas renderer for the active tab */}
              <ComponentsCanvas className="h-full" />
            </div>
          </div>
        </TamboMcpProvider>
      </TamboProvider>
    </div>
  );
}
