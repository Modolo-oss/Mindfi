const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || "https://mindfi-mcp.akusiapasij252.workers.dev";

interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

interface MCPToolResult {
  content: Array<{ type: string; text: string }>;
  isError?: boolean;
}

export class MCPClient {
  private baseUrl: string;
  private sessionId: string;
  private eventSource: EventSource | null = null;
  private tools: MCPTool[] = [];
  private requestId = 0;
  private pendingRequests: Map<number, { resolve: (value: unknown) => void; reject: (reason: unknown) => void }> = new Map();

  constructor(sessionId: string) {
    this.baseUrl = MCP_SERVER_URL;
    this.sessionId = sessionId;
  }

  async connect(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (response.ok) {
        await this.fetchTools();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      return false;
    }
  }

  private async fetchTools(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tools?sessionId=${this.sessionId}`);
      if (response.ok) {
        const data = await response.json();
        this.tools = data.tools || data;
      }
    } catch (error) {
      console.error("Failed to fetch tools:", error);
    }
  }

  getTools(): MCPTool[] {
    return this.tools;
  }

  getToolsForClaude(): Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }> {
    return this.tools.map(tool => ({
      name: tool.name,
      description: tool.description || `Execute ${tool.name} tool`,
      input_schema: tool.inputSchema || { type: "object", properties: {} }
    }));
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPToolResult> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tools/call`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          name,
          arguments: args,
        }),
      });

      if (!response.ok) {
        throw new Error(`Tool call failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Failed to call tool ${name}:`, error);
      return {
        content: [{ type: "text", text: `Error: Failed to call tool ${name}` }],
        isError: true,
      };
    }
  }

  async getTokenPrice(token: string): Promise<{ price: number; change24h: number; marketCap?: number } | null> {
    try {
      const result = await this.callTool("get_token_price", { token });
      if (result.content && result.content[0]) {
        const data = JSON.parse(result.content[0].text);
        return {
          price: data.price || data.current_price || 0,
          change24h: data.price_change_percentage_24h || data.change24h || 0,
          marketCap: data.market_cap || data.marketCap,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  async getGlobalMarket(): Promise<{
    totalMarketCap: number;
    totalVolume: number;
    btcDominance: number;
  } | null> {
    try {
      const result = await this.callTool("get_global_market", {});
      if (result.content && result.content[0]) {
        const data = JSON.parse(result.content[0].text);
        return {
          totalMarketCap: data.totalMarketCap || data.total_market_cap?.usd || 0,
          totalVolume: data.totalVolume || data.total_volume?.usd || 0,
          btcDominance: data.btcDominance || data.market_cap_percentage?.btc || 0,
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

let mcpClientInstance: MCPClient | null = null;

export function getMCPClient(sessionId: string): MCPClient {
  if (!mcpClientInstance || mcpClientInstance["sessionId"] !== sessionId) {
    mcpClientInstance = new MCPClient(sessionId);
  }
  return mcpClientInstance;
}
