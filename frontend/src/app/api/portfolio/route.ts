import { NextResponse } from "next/server";

interface TokenData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap?: number;
}

const tokenNames: Record<string, string> = {
  bitcoin: "Bitcoin",
  ethereum: "Ethereum",
  solana: "Solana",
};

export async function GET() {
  const watchlist = ["bitcoin", "ethereum", "solana"];
  
  try {
    const ids = watchlist.join(",");
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;
    
    const response = await fetch(url, { 
      cache: "no-store",
      headers: {
        "Accept": "application/json",
      }
    });

    if (!response.ok) {
      console.error("CoinGecko API error:", response.status, response.statusText);
      return NextResponse.json({
        tokens: [
          { symbol: "BTC", name: "Bitcoin", price: 0, change24h: 0 },
          { symbol: "ETH", name: "Ethereum", price: 0, change24h: 0 },
          { symbol: "SOL", name: "Solana", price: 0, change24h: 0 },
        ],
        error: `CoinGecko API returned ${response.status}`,
      });
    }

    const data = await response.json();
    
    const tokens: TokenData[] = watchlist.map(coinId => {
      const coinData = data[coinId];
      if (!coinData) {
        return {
          symbol: coinId.slice(0, 3).toUpperCase(),
          name: tokenNames[coinId] || coinId,
          price: 0,
          change24h: 0,
        };
      }
      
      const symbolMap: Record<string, string> = {
        bitcoin: "BTC",
        ethereum: "ETH",
        solana: "SOL",
      };
      
      return {
        symbol: symbolMap[coinId] || coinId.toUpperCase(),
        name: tokenNames[coinId] || coinId,
        price: coinData.usd || 0,
        change24h: coinData.usd_24h_change || 0,
        marketCap: coinData.usd_market_cap,
      };
    });

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error("Portfolio API error:", error);
    return NextResponse.json({
      tokens: [
        { symbol: "BTC", name: "Bitcoin", price: 0, change24h: 0 },
        { symbol: "ETH", name: "Ethereum", price: 0, change24h: 0 },
        { symbol: "SOL", name: "Solana", price: 0, change24h: 0 },
      ],
      error: "Failed to fetch portfolio data",
    });
  }
}
