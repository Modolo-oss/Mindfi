export interface TokenPriceData {
  symbol: string;
  price: number;
  priceUsd: number;
  change24h: number;
  marketCap?: number;
  volume24h?: number;
  coingeckoId: string;
}

export class CoinGeckoService {
  private readonly baseUrl = "https://api.coingecko.com/api/v3";
  private readonly apiKey?: string;

  private readonly tokenMap: Record<string, string> = {
    eth: "ethereum",
    ethereum: "ethereum",
    btc: "bitcoin",
    bitcoin: "bitcoin",
    usdc: "usd-coin",
    usdt: "tether",
  };

  constructor(apiKey?: string) {
    this.apiKey = apiKey;
  }

  resolveTokenId(symbol: string, providedId?: string): string {
    if (providedId) {
      return providedId;
    }
    const lowerSymbol = symbol.toLowerCase();
    return this.tokenMap[lowerSymbol] || lowerSymbol;
  }

  async getTokenPrice(
    tokenSymbol: string, 
    tokenId?: string,
    userContext?: string
  ): Promise<TokenPriceData> {
    if (tokenId) {
      return this.fetchPriceById(tokenId, tokenSymbol);
    }

    const lowerSymbol = tokenSymbol.toLowerCase();
    if (lowerSymbol === "tao" || lowerSymbol === "bittensor") {
      return this.fetchPriceById("bittensor", "TAO");
    }

    const directId = this.resolveTokenId(tokenSymbol);
    const isTrustedToken = Object.values(this.tokenMap).includes(directId) || 
                          Object.keys(this.tokenMap).includes(lowerSymbol);
    
    if (isTrustedToken) {
      try {
        return await this.fetchPriceById(directId, tokenSymbol);
      } catch (error) {
        // Continue to search
      }
    }

    const searchResults = await this.searchToken(tokenSymbol);
    
    if (searchResults.length === 0) {
      throw new Error(`Token "${tokenSymbol}" not found in CoinGecko`);
    }

    if (searchResults.length === 1) {
      const match = searchResults[0];
      return this.fetchPriceById(match.id, match.symbol);
    }

    const topResults = searchResults.slice(0, 5);
    const idsToCheck = topResults.map(r => r.id);
    
    try {
      const prices = await this.getMultipleTokenPrices(idsToCheck);
      
      const resultsWithPrices = topResults
        .map(result => ({
          ...result,
          priceData: prices[result.id],
          marketCap: prices[result.id]?.marketCap || 0,
        }))
        .filter(r => r.priceData)
        .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0));

      if (resultsWithPrices.length === 0) {
        throw new Error(`No valid price data found for "${tokenSymbol}"`);
      }

      const bestMatch = resultsWithPrices[0];
      return {
        symbol: bestMatch.symbol.toUpperCase(),
        price: bestMatch.priceData!.price,
        priceUsd: bestMatch.priceData!.priceUsd,
        change24h: bestMatch.priceData!.change24h,
        marketCap: bestMatch.priceData!.marketCap,
        volume24h: bestMatch.priceData!.volume24h,
        coingeckoId: bestMatch.id,
      };
    } catch (error) {
      const fallback = topResults[0];
      return this.fetchPriceById(fallback.id, fallback.symbol);
    }
  }

  private async fetchPriceById(coingeckoId: string, symbol: string): Promise<TokenPriceData> {
    const url = new URL(`${this.baseUrl}/simple/price`);
    url.searchParams.set("ids", coingeckoId);
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_24hr_change", "true");
    url.searchParams.set("include_market_cap", "true");
    url.searchParams.set("include_24hr_vol", "true");

    const headers: HeadersInit = {
      Accept: "application/json",
    };

    if (this.apiKey) {
      headers["x-cg-demo-api-key"] = this.apiKey;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, {
      usd?: number;
      usd_24h_change?: number;
      usd_market_cap?: number;
      usd_24h_vol?: number;
    }>;

    const priceData = data[coingeckoId];

    if (!priceData || !priceData.usd) {
      throw new Error(`Token "${symbol}" (ID: ${coingeckoId}) not found in CoinGecko`);
    }

    return {
      symbol: symbol.toUpperCase(),
      price: priceData.usd,
      priceUsd: priceData.usd,
      change24h: priceData.usd_24h_change || 0,
      marketCap: priceData.usd_market_cap,
      volume24h: priceData.usd_24h_vol,
      coingeckoId,
    };
  }

  async getMultipleTokenPrices(tokenIds: string[]): Promise<Record<string, TokenPriceData>> {
    const url = new URL(`${this.baseUrl}/simple/price`);
    url.searchParams.set("ids", tokenIds.join(","));
    url.searchParams.set("vs_currencies", "usd");
    url.searchParams.set("include_24hr_change", "true");
    url.searchParams.set("include_market_cap", "true");
    url.searchParams.set("include_24hr_vol", "true");

    const headers: HeadersInit = {
      Accept: "application/json",
    };

    if (this.apiKey) {
      headers["x-cg-demo-api-key"] = this.apiKey;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, {
      usd?: number;
      usd_24h_change?: number;
      usd_market_cap?: number;
      usd_24h_vol?: number;
    }>;

    const result: Record<string, TokenPriceData> = {};

    for (const [id, priceData] of Object.entries(data)) {
      if (priceData.usd) {
        result[id] = {
          symbol: id.toUpperCase(),
          price: priceData.usd,
          priceUsd: priceData.usd,
          change24h: priceData.usd_24h_change || 0,
          marketCap: priceData.usd_market_cap,
          volume24h: priceData.usd_24h_vol,
          coingeckoId: id,
        };
      }
    }

    return result;
  }

  async searchToken(query: string): Promise<Array<{ id: string; name: string; symbol: string }>> {
    const url = new URL(`${this.baseUrl}/search`);
    url.searchParams.set("query", query);

    const headers: HeadersInit = {
      Accept: "application/json",
    };

    if (this.apiKey) {
      headers["x-cg-demo-api-key"] = this.apiKey;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as {
      coins?: Array<{
        id: string;
        name: string;
        symbol: string;
      }>;
    };
    
    if (!data.coins || data.coins.length === 0) {
      return [];
    }

    return data.coins.slice(0, 10).map((coin) => ({
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol,
    }));
  }
}

