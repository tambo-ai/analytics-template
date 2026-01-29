"use client";
import { useMcpServers } from "@/components/tambo/mcp-config-modal";
import { MessageThreadFull } from "@/components/tambo/message-thread-full";
import ComponentsCanvas from "@/components/ui/components-canvas";
import { InteractableCanvasDetails } from "@/components/ui/interactable-canvas-details";
import { InteractableTabs } from "@/components/ui/interactable-tabs";
import { components, tools } from "@/lib/tambo";
import { TamboProvider } from "@tambo-ai/react";
import { TamboMcpProvider } from "@tambo-ai/react/mcp";
import { useSyncExternalStore } from "react";

const STORAGE_KEY = "tambo-demo-context-key";

function getContextKey(): string {
  let key = localStorage.getItem(STORAGE_KEY);
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem(STORAGE_KEY, key);
  }
  return key;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/**
 * Gets or creates a unique context key for thread isolation.
 *
 * NOTE: For production, use `userToken` prop instead of `contextKey`.
 * The userToken integrates with your auth provider (e.g., Better Auth, Clerk)
 * for proper user isolation with token refresh handling.
 *
 * Example:
 *   const userToken = useUserToken(); // from your auth provider
 *   <TamboProvider userToken={userToken} ... />
 */
function useContextKey(): string | null {
  return useSyncExternalStore(subscribe, getContextKey, () => null);
}

/**
 * Home page component that renders the Tambo chat interface.
 *
 * @remarks
 * The `NEXT_PUBLIC_TAMBO_URL` environment variable specifies the URL of the Tambo server.
 * You do not need to set it if you are using the default Tambo server.
 * It is only required if you are running the API server locally.
 *
 * @see {@link https://github.com/tambo-ai/tambo/blob/main/CONTRIBUTING.md} for instructions on running the API server locally.
 */
export default function Home() {
  const mcpServers = useMcpServers();
  const contextKey = useContextKey();

  // Wait for contextKey to be loaded from localStorage
  if (!contextKey) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden relative">
      <TamboProvider
        apiKey={process.env.NEXT_PUBLIC_TAMBO_API_KEY!}
        tamboUrl={process.env.NEXT_PUBLIC_TAMBO_URL!}
        components={components}
        tools={tools}
        mcpServers={mcpServers}
        contextKey={contextKey}
      >
        <TamboMcpProvider>
          <div className="flex h-full overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <MessageThreadFull />
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
