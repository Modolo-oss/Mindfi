import { NextRequest, NextResponse } from "next/server";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "https://mindfi-mcp.akusiapasij252.workers.dev";

interface TokenData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap?: number;
}

async function getTokenPrice(token: string): Promise<TokenData | null> {
  try {
    const response = await fetch(`${MCP_SERVER_URL}/sse?sessionId=portfolio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: { name: "get_token_price", arguments: { token } },
      }),
    });

    if (!response.ok) {
      const fallbackData = await fetchCoinGeckoDirect(token);
      if (fallbackData) return fallbackData;
      return null;
    }

    const result = await response.json();
    if (result.content && result.content[0]) {
      const data = JSON.parse(result.content[0].text);
      return {
        symbol: token.toUpperCase(),
        name: data.name || token,
        price: data.price || data.current_price || 0,
        change24h: data.price_change_percentage_24h || data.change24h || 0,
        marketCap: data.market_cap,
      };
    }
    return null;
  } catch (error) {
    console.error(`Failed to get price for ${token}:`, error);
    const fallbackData = await fetchCoinGeckoDirect(token);
    return fallbackData;
  }
}

async function fetchCoinGeckoDirect(symbol: string): Promise<TokenData | null> {
  const coinIds: Record<string, string> = {
    btc: "bitcoin",
    eth: "ethereum",
    sol: "solana",
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
      { next: { revalidate: 60 } }
    );

    if (!response.ok) return null;

    const data = await response.json();
    const coinData = data[coinId];
    
    if (!coinData) return null;

    return {
      symbol: symbol.toUpperCase(),
      name: coinId.charAt(0).toUpperCase() + coinId.slice(1),
      price: coinData.usd || 0,
      change24h: coinData.usd_24h_change || 0,
      marketCap: coinData.usd_market_cap,
    };
  } catch (error) {
    console.error(`CoinGecko fallback failed for ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const watchlist = ["BTC", "ETH", "SOL"];
  
  try {
    const pricePromises = watchlist.map(token => getTokenPrice(token));
    const results = await Promise.all(pricePromises);
    
    const portfolio = results.filter((r): r is TokenData => r !== null);
    
    if (portfolio.length === 0) {
      return NextResponse.json({
        tokens: [
          { symbol: "BTC", name: "Bitcoin", price: 0, change24h: 0 },
          { symbol: "ETH", name: "Ethereum", price: 0, change24h: 0 },
          { symbol: "SOL", name: "Solana", price: 0, change24h: 0 },
        ],
        error: "Unable to fetch live prices",
      });
    }

    return NextResponse.json({ tokens: portfolio });
  } catch (error) {
    console.error("Portfolio API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch portfolio data" },
      { status: 500 }
    );
  }
}
