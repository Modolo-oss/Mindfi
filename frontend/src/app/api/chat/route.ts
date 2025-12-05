import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "https://mindfi-mcp.akusiapasij252.workers.dev";

interface MCPTool {
  name?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  parameters?: Record<string, unknown>;
  type?: string;
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

async function fetchMCPTools(sessionId: string): Promise<MCPTool[]> {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/api/tools?sessionId=${sessionId}`);
    if (response.ok) {
      const data = await response.json();
      return data.tools || data || [];
    }
  } catch (error) {
    console.error("Failed to fetch MCP tools:", error);
  }
  return [];
}

async function callMCPTool(sessionId: string, name: string, args: Record<string, unknown>): Promise<string> {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/sse?sessionId=${sessionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name, arguments: args },
      }),
    });

    if (!response.ok) {
      const directResult = await callToolDirect(name, args);
      if (directResult) return directResult;
      return JSON.stringify({ error: `Tool call failed: ${response.statusText}` });
    }

    const result = await response.json();
    if (result.content && result.content[0]) {
      return result.content[0].text || JSON.stringify(result.content[0]);
    }
    return JSON.stringify(result);
  } catch (error) {
    console.error(`Failed to call MCP tool ${name}:`, error);
    const directResult = await callToolDirect(name, args);
    if (directResult) return directResult;
    return JSON.stringify({ error: `Failed to call tool: ${name}` });
  }
}

async function callToolDirect(name: string, args: Record<string, unknown>): Promise<string | null> {
  if (name === "get_token_price") {
    const symbol = (args.symbol as string) || (args.tokenSymbol as string) || "bitcoin";
    const coinIds: Record<string, string> = {
      btc: "bitcoin", bitcoin: "bitcoin",
      eth: "ethereum", ethereum: "ethereum",
      sol: "solana", solana: "solana",
      bnb: "binancecoin",
      xrp: "ripple",
      ada: "cardano",
      doge: "dogecoin",
      matic: "matic-network",
      dot: "polkadot",
      link: "chainlink",
    };
    
    const coinId = coinIds[symbol.toLowerCase()] || symbol.toLowerCase();
    
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`,
        { cache: "no-store" }
      );
      
      if (response.ok) {
        const data = await response.json();
        const coinData = data[coinId];
        if (coinData) {
          return JSON.stringify({
            symbol: symbol.toUpperCase(),
            coinId,
            price: coinData.usd,
            change24h: coinData.usd_24h_change,
            marketCap: coinData.usd_market_cap,
            source: "CoinGecko",
          });
        }
      }
    } catch (error) {
      console.error("CoinGecko price fetch failed:", error);
    }
  }
  
  if (name === "get_global_market") {
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/global",
        { cache: "no-store" }
      );
      
      if (response.ok) {
        const data = await response.json();
        return JSON.stringify({
          totalMarketCap: data.data?.total_market_cap?.usd,
          totalVolume24h: data.data?.total_volume?.usd,
          btcDominance: data.data?.market_cap_percentage?.btc,
          ethDominance: data.data?.market_cap_percentage?.eth,
          activeCryptocurrencies: data.data?.active_cryptocurrencies,
          markets: data.data?.markets,
          source: "CoinGecko",
        });
      }
    } catch (error) {
      console.error("CoinGecko global market fetch failed:", error);
    }
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 }
      );
    }

    const { messages, sessionId } = await request.json();
    
    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    const anthropic = new Anthropic({ apiKey });
    const mcpTools = await fetchMCPTools(sessionId || "default");

    const claudeTools: Anthropic.Tool[] = mcpTools.slice(0, 20).map(tool => {
      const name = tool.function?.name || tool.name || "unknown";
      const description = tool.function?.description || tool.description || `Execute ${name} tool`;
      const params = tool.function?.parameters || tool.inputSchema || tool.parameters;
      
      return {
        name,
        description,
        input_schema: {
          type: "object" as const,
          properties: (params as any)?.properties || {},
          required: (params as any)?.required || [],
        },
      };
    });

    const systemPrompt = `You are MindFi Terminal, an AI-powered DeFi assistant. You help users with cryptocurrency trading, portfolio management, and blockchain operations.

You have access to tools that can:
- Check token prices and market data
- View wallet balances and portfolios
- Execute token swaps across 200+ chains
- Set price alerts and automatic trading triggers
- Analyze market conditions and portfolio health

When users ask about crypto prices, wallets, or trading, use the appropriate tools to get real data.
Keep responses concise and terminal-style. Use formatting sparingly.
If a tool call fails, explain what happened and suggest alternatives.`;

    const claudeMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    let response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: systemPrompt,
      tools: claudeTools.length > 0 ? claudeTools : undefined,
      messages: claudeMessages,
    });

    const toolCalls: Array<{ name: string; input: Record<string, unknown>; result: string }> = [];

    while (response.stop_reason === "tool_use") {
      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      );

      const toolResults: Anthropic.ToolResultBlockParam[] = [];

      for (const toolUse of toolUseBlocks) {
        console.log(`Calling tool: ${toolUse.name}`, toolUse.input);
        const result = await callMCPTool(sessionId || "default", toolUse.name, toolUse.input as Record<string, unknown>);
        
        toolCalls.push({
          name: toolUse.name,
          input: toolUse.input as Record<string, unknown>,
          result,
        });

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      }

      response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        tools: claudeTools,
        messages: [
          ...claudeMessages,
          { role: "assistant", content: response.content },
          { role: "user", content: toolResults },
        ],
      });
    }

    const textBlocks = response.content.filter(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    const responseText = textBlocks.map(block => block.text).join("\n");

    return NextResponse.json({
      message: responseText,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: response.usage,
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
