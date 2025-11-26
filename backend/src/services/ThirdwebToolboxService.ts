import type { Env } from "../index.js";

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

  async getWalletBalance(address: string, chainId: string) {
    return this.request<{ balance: unknown }>(
      "GET",
      `/v1/wallets/${address}/balance`,
      undefined,
      { chainId },
    );
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

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string>,
  ): Promise<{ ok: boolean; data?: T; error?: string }> {
    await this.ensureReady();

    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      const normalizedEntries = Object.entries(query).map(([key, value]) => [
        key,
        String(value),
      ]);
      const search = new URLSearchParams(normalizedEntries);
      search.forEach((value, key) => url.searchParams.set(key, value));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: this.buildHeaders(),
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      let text: string | undefined;
      if (!response.ok) {
        text = await response.text();
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

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "x-secret-key": this.secretKey,
    };

    if (this.clientId) {
      headers["x-client-id"] = this.clientId;
    }

    return headers;
  }
}

