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

  // Map common token symbols to CoinGecko IDs (fallback for very common tokens)
  // Most tokens will be resolved via search API
  private readonly tokenMap: Record<string, string> = {
    eth: "ethereum",
    ethereum: "ethereum",
    btc: "bitcoin",
    bitcoin: "bitcoin",
    usdc: "usd-coin",
    usdt: "tether",
  };

  constructor(apiKey?: string) {
    // CoinGecko now requires API key even for free tier (Demo)
    // Free tier: x-cg-demo-api-key header
    // Pro tier: x-cg-pro-api-key header
    // Without API key: very strict rate limits (10-50 calls/minute)
    this.apiKey = apiKey;
  }

  /**
   * Resolve token symbol to CoinGecko ID
   * Public method so it can be used by other services
   */
  resolveTokenId(symbol: string, providedId?: string): string {
    if (providedId) {
      return providedId;
    }
    const lowerSymbol = symbol.toLowerCase();
    return this.tokenMap[lowerSymbol] || lowerSymbol;
  }

  /**
   * Get token price data from CoinGecko
   * Smart token resolution: search if not found, use LLM to pick best match if multiple results
   */
  async getTokenPrice(
    tokenSymbol: string, 
    tokenId?: string,
    userContext?: string // Original user message for context
  ): Promise<TokenPriceData> {
    // If explicit ID provided, use it directly
    if (tokenId) {
      return this.fetchPriceById(tokenId, tokenSymbol);
    }

    // Special case: TAO should always resolve to Bittensor
    const lowerSymbol = tokenSymbol.toLowerCase();
    if (lowerSymbol === "tao" || lowerSymbol === "bittensor") {
      console.log(`[CoinGecko] TAO detected, using Bittensor directly`);
      return this.fetchPriceById("bittensor", "TAO");
    }

    // Try direct lookup first (from tokenMap or symbol) - only for very common tokens
    const directId = this.resolveTokenId(tokenSymbol);
    
    // Only use direct lookup if it's in our trusted tokenMap (very common tokens)
    const isTrustedToken = Object.values(this.tokenMap).includes(directId) || 
                          Object.keys(this.tokenMap).includes(lowerSymbol);
    
    if (isTrustedToken) {
      console.log(`[CoinGecko] Attempting direct lookup for trusted token: ${tokenSymbol} -> ${directId}`);
      try {
        const priceData = await this.fetchPriceById(directId, tokenSymbol);
        console.log(`[CoinGecko] ✅ Direct lookup successful`);
        return priceData;
      } catch (error) {
        console.log(`[CoinGecko] Direct lookup failed, searching for "${tokenSymbol}"...`);
      }
    } else {
      console.log(`[CoinGecko] Token "${tokenSymbol}" not in trusted list, searching...`);
    }

    // Search for token (always search for unknown tokens to get most popular match)
    const searchResults = await this.searchToken(tokenSymbol);
    
    if (searchResults.length === 0) {
      throw new Error(`Token "${tokenSymbol}" not found in CoinGecko`);
    }

    // If only one result, use it
    if (searchResults.length === 1) {
      const match = searchResults[0];
      console.log(`[CoinGecko] Single match found: ${match.name} (${match.symbol})`);
      return this.fetchPriceById(match.id, match.symbol);
    }

    // Multiple results - need to pick the best one
    console.log(`[CoinGecko] Found ${searchResults.length} matches, selecting best match...`);
    
    // Get prices for top 5 results to help with selection
    const topResults = searchResults.slice(0, 5);
    const idsToCheck = topResults.map(r => r.id);
    
    try {
      const prices = await this.getMultipleTokenPrices(idsToCheck);
      
      // Sort by market cap (most popular) or use first result
      const resultsWithPrices = topResults
        .map(result => ({
          ...result,
          priceData: prices[result.id],
          marketCap: prices[result.id]?.marketCap || 0,
        }))
        .filter(r => r.priceData) // Only include tokens with price data
        .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0)); // Sort by market cap descending

      if (resultsWithPrices.length === 0) {
        throw new Error(`No valid price data found for "${tokenSymbol}"`);
      }

      // Use the token with highest market cap (most popular)
      const bestMatch = resultsWithPrices[0];
      const secondMatch = resultsWithPrices[1];
      
      // If there are multiple results with similar market cap, might be ambiguous
      // For now, use the most popular one (highest market cap)
      // Future: could use LLM to pick based on user context
      const isAmbiguous = secondMatch && 
        bestMatch.marketCap && secondMatch.marketCap &&
        (bestMatch.marketCap / secondMatch.marketCap) < 10; // Less than 10x difference
      
      if (isAmbiguous) {
        console.log(`[CoinGecko] ⚠️ Multiple similar tokens found, using most popular: ${bestMatch.name}`);
      }
      
      console.log(`[CoinGecko] Selected best match: ${bestMatch.name} (${bestMatch.symbol}) - Market Cap: $${bestMatch.marketCap?.toLocaleString() || 'N/A'}`);

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
      // Fallback: use first search result
      const fallback = topResults[0];
      console.log(`[CoinGecko] Using fallback: ${fallback.name} (${fallback.symbol})`);
      return this.fetchPriceById(fallback.id, fallback.symbol);
    }
  }

  /**
   * Fetch price by CoinGecko ID
   */
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

    const price = priceData.usd;
    const change24h = priceData.usd_24h_change || 0;
    const marketCap = priceData.usd_market_cap;
    const volume24h = priceData.usd_24h_vol;

    console.log(`[CoinGecko] ✅ Fetched price: $${price} (24h: ${change24h}%)`);

    return {
      symbol: symbol.toUpperCase(),
      price,
      priceUsd: price,
      change24h,
      marketCap,
      volume24h,
      coingeckoId,
    };
  }

  /**
   * Get multiple token prices at once
   */
  async getMultipleTokenPrices(tokenIds: string[]): Promise<Record<string, TokenPriceData>> {
    console.log(`[CoinGecko] Fetching prices for ${tokenIds.length} tokens`);

    try {
      const url = new URL(`${this.baseUrl}/simple/price`);
      url.searchParams.set("ids", tokenIds.join(","));
      url.searchParams.set("vs_currencies", "usd");
      url.searchParams.set("include_24hr_change", "true");
      url.searchParams.set("include_market_cap", "true");
      url.searchParams.set("include_24hr_vol", "true");

      const headers: HeadersInit = {
        Accept: "application/json",
      };

      // Add API key if available (free tier uses x-cg-demo-api-key)
      if (this.apiKey) {
        headers["x-cg-demo-api-key"] = this.apiKey;
      }

      const response = await fetch(url.toString(), {
        headers,
      });

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

      console.log(`[CoinGecko] ✅ Successfully fetched ${Object.keys(result).length} token prices`);
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[CoinGecko] ❌ Failed to fetch multiple prices:`, errorMsg);
      throw error;
    }
  }

  /**
   * Search for token by symbol or name
   */
  async searchToken(query: string): Promise<Array<{ id: string; name: string; symbol: string }>> {
    console.log(`[CoinGecko] Searching for token: "${query}"`);

    try {
      const url = new URL(`${this.baseUrl}/search`);
      url.searchParams.set("query", query);

      const headers: HeadersInit = {
        Accept: "application/json",
      };

      // Add API key if available (free tier uses x-cg-demo-api-key)
      if (this.apiKey) {
        headers["x-cg-demo-api-key"] = this.apiKey;
      }

      const response = await fetch(url.toString(), {
        headers,
      });

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
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[CoinGecko] ❌ Search failed:`, errorMsg);
      throw error;
    }
  }
}

