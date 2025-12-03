import type { Env } from "./types.js";

export type { Env };

export { DefiMcpServer } from "./server.js";

// Worker entrypoint for handling incoming requests
// This follows the Nullshot MCP Framework pattern for routing to Durable Objects
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // Debug logging
    console.log(`[MCP Worker] Request: ${request.method} ${path}`);

    // Handle health check endpoint
    if (path === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", timestamp: Date.now() }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle list tools endpoint (for OpenAI function definitions)
    // MUST check exact match BEFORE checking startsWith
    if (path === "/api/tools") {
      console.log(`[MCP Worker] Matched /api/tools endpoint`);
      const sessionId = url.searchParams.get("sessionId") || "default";
      
      try {
        const id = env.DEFI_MCP_SERVER.idFromName(sessionId);
        const stub = env.DEFI_MCP_SERVER.get(id);
        
        // Use custom /tools route added to DefiMcpServer
        const toolsRequest = new Request(`${url.origin}/tools`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        
        const response = await stub.fetch(toolsRequest);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[MCP Worker] Error from DO: ${response.status} ${errorText}`);
          return new Response(
            JSON.stringify({
              ok: false,
              error: `Durable Object error: ${response.status} ${errorText}`,
            }),
            {
              status: response.status,
              headers: { "Content-Type": "application/json" },
            }
          );
        }
        
        const result = await response.json() as { ok: boolean; tools: Array<{ name: string; description: string }>; count: number };
        
        // Convert to OpenAI function format
        if (result.ok && result.tools) {
          const openaiFunctions = result.tools.map((tool) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description || "",
              parameters: { type: "object", properties: {} },
            },
          }));
          
          return new Response(JSON.stringify({ ok: true, tools: openaiFunctions, count: result.count }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("[MCP Worker] Error in /api/tools:", error);
        return new Response(
          JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Handle root endpoint
    if (path === "/" || path === "") {
      return new Response(
        JSON.stringify({
          name: "MindFi MCP Server",
          version: "1.0.0",
          status: "online",
          description: "AI-native DeFi platform via Model Context Protocol",
          endpoints: {
            mcp: "/mcp/:sessionId/*",
            sse: "/ (root path for SSE connections)",
            health: "/health",
            status: "/status",
            tools: "/api/tools?sessionId=:sessionId"
          },
          usage: "Connect via MCP client (Claude Desktop, MCP Inspector) using SSE transport at the root URL"
        }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get sessionId from query params or path
    let sessionIdStr = url.searchParams.get('sessionId');
    if (!sessionIdStr && path.startsWith('/mcp/')) {
      const pathParts = path.split('/');
      sessionIdStr = pathParts[2] || 'default';
    }
    if (!sessionIdStr) {
      sessionIdStr = 'default';
    }
    
    // Create or get Durable Object ID from sessionId
    // Use idFromName for string-based session IDs (not idFromString which requires hex)
    const id = env.DEFI_MCP_SERVER.idFromName(sessionIdStr);

    console.log(`[MCP Worker] Routing request - path: ${path}, sessionId: ${sessionIdStr}, DO id: ${id}`);
    
    // Set sessionId in URL for Durable Object
    url.searchParams.set('sessionId', sessionIdStr);
    
    // Forward request to Durable Object MCP server
    // The McpHonoServerDO base class handles SSE/WebSocket transport automatically
    return env.DEFI_MCP_SERVER.get(id).fetch(new Request(
        url.toString(),
        request
    ));
  },
};
