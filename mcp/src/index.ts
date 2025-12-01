import { DefiMcpServer } from "./server.js";
import type { Env } from "./types.js";

export type { Env };
export { DefiMcpServer };

// Worker entrypoint for handling incoming requests
// This follows the Nullshot MCP Framework pattern for routing to Durable Objects
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle health check endpoint
    if (path === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", timestamp: Date.now() }),
        {
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle root endpoint
    if (path === "/" || path === "") {
      return new Response(
        JSON.stringify({
          name: "MindFi MCP Server",
          version: "1.0.0",
          status: "online",
          endpoints: {
            mcp: "/mcp/:sessionId/*",
            sse: "/sse?sessionId=:sessionId",
            health: "/health"
          }
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
