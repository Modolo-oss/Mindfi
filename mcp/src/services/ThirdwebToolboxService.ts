import type { Env } from "../types.js";

const DEFAULT_TOOLS = [
  "getWalletBalance",
  "getWalletTokens",
  "listServerWallets",
  "createServerWallet",
  "bridgeSwap",
  "convertFiatToCrypto",
  "createPayment",
  "paymentsPurchase",
  "payments/x402/verify",
  "payments/x402/settle",
  "payments/x402/fetch",
  "fetchWithPayment",
] as const;

export class ThirdwebToolboxService {
  private readonly env: Env;
  private readonly secretKey?: string;
  private readonly clientId?: string;
  private readonly toolLabels: string[];
  private readonly baseUrl = "https://api.thirdweb.com";
  private readonly timeoutMs = 15_000;

  constructor(env: Env) {
    this.env = env;
    this.secretKey = env.THIRDWEB_SECRET_KEY as string | undefined;
    this.clientId = env.THIRDWEB_CLIENT_ID as string | undefined;
    this.toolLabels = [...DEFAULT_TOOLS];
  }

  async ensureReady(): Promise<void> {
    if (!this.secretKey) {
      throw new Error("THIRDWEB_SECRET_KEY is not configured.");
    }
  }

  getToolLabels(): string[] {
    return this.toolLabels;
  }

  getTreasuryAddress(): string | undefined {
    return this.env.XAVA_TREASURY_ADDRESS as string | undefined;
  }

  /**
   * Normalize chain name/ID to format expected by Thirdweb API
   */
  private normalizeChainId(chain: string): string {
    const chainMap: Record<string, string> = {
      // Chain names
      "ethereum": "1",
      "eth": "1",
      "bsc": "56",
      "binance": "56",
      "binancesmartchain": "56",
      "polygon": "137",
      "matic": "137",
      "avalanche": "43114",
      "avax": "43114",
      "arbitrum": "42161",
      "optimism": "10",
      "base": "8453",
      // Chain IDs (pass through)
      "1": "1",
      "56": "56",
      "137": "137",
      "43114": "43114",
      "42161": "42161",
      "10": "10",
      "8453": "8453",
    };
    
    const normalized = chain.toLowerCase().trim();
    return chainMap[normalized] || chain; // Return original if not found
  }

  async getWalletBalance(address: string, chainId: string) {
    // Normalize chain ID to numeric format expected by Thirdweb API
    // Thirdweb API expects chainId as array of integers in query params
    const normalizedChainId = this.normalizeChainId(chainId);
    
    console.log(`[ThirdwebToolboxService] getWalletBalance - address: ${address}, chainId: ${chainId}, normalized: ${normalizedChainId}`);
    
    // Thirdweb API expects chainId as array: ?chainId=1&chainId=137
    // We'll pass it as array in query params
    const result = await this.request<{ result: Array<{
      chainId: number;
      decimals: number;
      displayValue: string;
      name: string;
      symbol: string;
      tokenAddress: string | null;
      value: string;
    }> }>(
      "GET",
      `/v1/wallets/${address}/balance`,
      undefined,
      { chainId: normalizedChainId }, // Will be converted to ?chainId=56 format
    );
    
    if (!result.ok) {
      console.error(`[ThirdwebToolboxService] getWalletBalance failed - error: ${result.error}, chainId: ${normalizedChainId}, address: ${address}`);
    }
    
    return result;
  }

  async listServerWallets() {
    return this.request<{ result: unknown }>("GET", "/v1/wallets/server");
  }

  async getBridgeRoutes(params: Record<string, string>) {
    return this.request<unknown>("GET", "/v1/bridge/routes", undefined, params);
  }

  async getBridgeChains() {
    return this.request<unknown>("GET", "/v1/bridge/chains");
  }

  async convertFiatToCrypto(params: Record<string, string>) {
    return this.request<unknown>("GET", "/v1/bridge/convert", undefined, params);
  }

  async executeBridgeSwap(payload: Record<string, unknown>) {
    return this.request<unknown>("POST", "/v1/bridge/swap", payload);
  }

  async createX402Payment(payload: Record<string, unknown>) {
    return this.request<unknown>("POST", "/v1/payments", payload);
  }

  async verifyX402Payment(payload: Record<string, unknown>) {
    return this.request<unknown>("POST", "/v1/payments/x402/verify", payload);
  }

  async settleX402Payment(payload: Record<string, unknown>) {
    return this.request<unknown>("POST", "/v1/payments/x402/settle", payload);
  }

  async fetchPayableServices() {
    return this.request<unknown>("GET", "/v1/payments/x402/discovery/resources");
  }

  async sendTokens(payload: Record<string, unknown>) {
    return this.request<unknown>("POST", "/v1/wallets/send", payload);
  }

  async transferTokens(payload: Record<string, unknown>) {
    return this.sendTokens(payload);
  }

  /**
   * Validate Ethereum address format
   */
  validateAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string>,
  ): Promise<{ ok: boolean; data?: T; error?: string }> {
    await this.ensureReady();

    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      // Handle query parameters
      // For chainId, Thirdweb API expects array format: ?chainId=1&chainId=137
      // So we need to append multiple values for the same key
      Object.entries(query).forEach(([key, value]) => {
        const stringValue = String(value);
        // If it's chainId, append it (allows multiple chainIds)
        if (key === "chainId") {
          url.searchParams.append(key, stringValue);
        } else {
          url.searchParams.set(key, stringValue);
        }
      });
      
      console.log(`[ThirdwebToolboxService] Request URL: ${url.toString()}`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers = this.buildHeaders();
      console.log(`[ThirdwebToolboxService] Request headers - x-secret-key present: ${!!headers['x-secret-key']}, x-client-id present: ${!!headers['x-client-id']}`);
      
      const response = await fetch(url.toString(), {
        method,
        headers: headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      let text: string | undefined;
      if (!response.ok) {
        text = await response.text();
        console.error(`[ThirdwebToolboxService] Request failed - Status: ${response.status}, URL: ${url.toString()}, Error: ${text}`);
        console.error(`[ThirdwebToolboxService] Response headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
        return { ok: false, error: text || response.statusText };
      }

      text = await response.text();
      if (!text) {
        return { ok: true };
      }
      const data = JSON.parse(text) as T;
      return { ok: true, data };
    } catch (error) {
      clearTimeout(timer);
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  private buildHeaders(): HeadersInit {
    if (!this.secretKey) {
      throw new Error("THIRDWEB_SECRET_KEY is not configured.");
    }

    // Log secret key (first 10 chars only for security)
    console.log(`[ThirdwebToolboxService] buildHeaders - secretKey present: ${!!this.secretKey}, first 10 chars: ${this.secretKey.substring(0, 10)}...`);

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "x-secret-key": this.secretKey,
    };

    if (this.clientId) {
      headers["x-client-id"] = this.clientId;
      console.log(`[ThirdwebToolboxService] buildHeaders - clientId present: ${!!this.clientId}`);
    } else {
      console.log(`[ThirdwebToolboxService] buildHeaders - clientId NOT present (optional)`);
    }

    return headers;
  }
}

