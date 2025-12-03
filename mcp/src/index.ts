import type { Env } from "./types.js";

export type { Env };

// Ultra-minimal proxy - completely hides server.ts import from bundler
// Uses string-based dynamic import that can't be statically analyzed
export class DefiMcpServer {
  private realServer: any;
  private initPromise: Promise<any> | null = null;
  
  constructor(private state: any, private env: Env) {
    // Constructor must be completely trivial - NO code execution
  }
  
  private async loadServer(): Promise<any> {
    if (this.realServer) return this.realServer;
    
    if (!this.initPromise) {
      this.initPromise = (async () => {
        // Use indirect string-based import to hide from static analysis
        const modulePath = ['./server', 'js'].join('.');
        const mod = await eval(`import("${modulePath}")`);
        this.realServer = new mod.DefiMcpServer(this.state, this.env);
        return this.realServer;
      })();
    }
    
    return this.initPromise;
  }
  
  async fetch(request: Request): Promise<Response> {
    const server = await this.loadServer();
    return server.fetch(request);
  }
  
  async alarm(): Promise<void> {
    const server = await this.loadServer();
    return server.alarm?.();
  }
}

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
        
        // Get tools list via MCP protocol
        const mcpRequest = new Request(
          `${url.origin}/mcp/${sessionId}/tools/list`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "tools/list",
              params: {},
            }),
          }
        );
        
        const response = await stub.fetch(mcpRequest);
        
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
        
        const result = await response.json();
        
        // Convert MCP tools to OpenAI function format
        if (result.result && result.result.tools) {
          const openaiFunctions = result.result.tools.map((tool: any) => ({
            type: "function",
            function: {
              name: tool.name,
              description: tool.description || "",
              parameters: tool.inputSchema || {},
            },
          }));
          
          return new Response(JSON.stringify(openaiFunctions), {
            headers: { "Content-Type": "application/json" },
          });
        }
        
        // If no tools in result, return empty array
        return new Response(JSON.stringify([]), {
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

    // Handle REST API for calling specific tool
    if (path.startsWith("/api/tools/")) {
      const toolName = path.split("/api/tools/")[1];
      const sessionId = url.searchParams.get("sessionId") || "default";
      
      try {
        const id = env.DEFI_MCP_SERVER.idFromName(sessionId);
        const stub = env.DEFI_MCP_SERVER.get(id);
        
        // Get request body (tool arguments)
        const args = await request.json().catch(() => ({}));
        
        // Call tool via MCP protocol
        const mcpRequest = new Request(
          `${url.origin}/mcp/${sessionId}/tools/call`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "tools/call",
              params: {
                name: toolName,
                arguments: args,
              },
            }),
          }
        );
        
        const response = await stub.fetch(mcpRequest);
        const result = await response.json();
        
        // Extract result from MCP response format
        if (result.result && result.result.content) {
          const content = result.result.content[0];
          if (content && content.text) {
            try {
              const parsed = JSON.parse(content.text);
              return new Response(JSON.stringify(parsed), {
                headers: { "Content-Type": "application/json" },
              });
            } catch {
              return new Response(content.text, {
                headers: { "Content-Type": "application/json" },
              });
            }
          }
        }
        
        return new Response(JSON.stringify(result), {
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
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
          endpoints: {
            mcp: "/mcp/:sessionId/*",
            sse: "/sse?sessionId=:sessionId",
            health: "/health",
            api: {
              listTools: "/api/tools?sessionId=:sessionId",
              callTool: "/api/tools/:toolName?sessionId=:sessionId"
            }
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
