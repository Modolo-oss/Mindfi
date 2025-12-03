import type { Env } from "../types.js";

export interface BackendWallet {
  walletAddress: string;
  label?: string;
  type?: "local" | "smart-wallet";
  createdAt?: string;
}

export interface TransactionResult {
  queueId: string;
  status?: "queued" | "sent" | "mined" | "failed";
  transactionHash?: string;
  errorMessage?: string;
}

export interface WalletBalance {
  chainId: number;
  decimals: number;
  displayValue: string;
  name: string;
  symbol: string;
  tokenAddress: string | null;
  value: string;
}

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  route: unknown;
  estimatedGas?: string;
}

const CHAIN_MAP: Record<string, string> = {
  "ethereum": "1",
  "eth": "1",
  "mainnet": "1",
  "bsc": "56",
  "binance": "56",
  "bnb": "56",
  "polygon": "137",
  "matic": "137",
  "avalanche": "43114",
  "avax": "43114",
  "arbitrum": "42161",
  "arb": "42161",
  "optimism": "10",
  "op": "10",
  "base": "8453",
  "sepolia": "11155111",
  "goerli": "5",
  "mumbai": "80001",
};

const DEFAULT_TRANSACTION_LIMITS = {
  maxTransactionValueUsd: 1000,
  maxDailyTransactions: 10,
  maxDailyVolumeUsd: 5000,
  cooldownSeconds: 60,
};

export class ThirdwebEngineService {
  private readonly env: Env;
  private readonly secretKey?: string;
  private readonly clientId?: string;
  private readonly baseUrl = "https://api.thirdweb.com";
  private readonly engineUrl: string;
  private readonly timeoutMs = 30_000;

  constructor(env: Env) {
    this.env = env;
    this.secretKey = env.THIRDWEB_SECRET_KEY as string | undefined;
    this.clientId = env.THIRDWEB_CLIENT_ID as string | undefined;
    this.engineUrl = (env.THIRDWEB_ENGINE_URL as string) || this.baseUrl;
  }

  async ensureReady(): Promise<void> {
    if (!this.secretKey) {
      throw new Error("THIRDWEB_SECRET_KEY is not configured.");
    }
  }

  private normalizeChainId(chain: string): string {
    const normalized = chain.toLowerCase().trim();
    return CHAIN_MAP[normalized] || chain;
  }

  async createBackendWallet(label: string, type: "local" | "smart-wallet" = "local"): Promise<{ ok: boolean; wallet?: BackendWallet; error?: string }> {
    const result = await this.request<{ result: BackendWallet }>(
      "POST",
      "/v1/wallets/create",
      { 
        label,
        walletType: type === "smart-wallet" ? "smart" : "local"
      }
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { 
      ok: true, 
      wallet: result.data?.result 
    };
  }

  async getBackendWallet(walletAddress: string): Promise<{ ok: boolean; wallet?: BackendWallet; error?: string }> {
    const result = await this.request<{ result: BackendWallet }>(
      "GET",
      `/v1/wallets/${walletAddress}`
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, wallet: result.data?.result };
  }

  async listBackendWallets(): Promise<{ ok: boolean; wallets?: BackendWallet[]; error?: string }> {
    const result = await this.request<{ result: BackendWallet[] }>(
      "GET",
      "/v1/wallets/server"
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, wallets: result.data?.result || [] };
  }

  async getWalletBalance(walletAddress: string, chainId: string): Promise<{ ok: boolean; balances?: WalletBalance[]; error?: string }> {
    const normalizedChainId = this.normalizeChainId(chainId);
    
    const result = await this.request<{ result: WalletBalance[] }>(
      "GET",
      `/v1/wallets/${walletAddress}/balance`,
      undefined,
      { chainId: normalizedChainId }
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, balances: result.data?.result || [] };
  }

  async getSwapQuote(params: {
    fromChainId: string;
    toChainId: string;
    fromTokenAddress: string;
    toTokenAddress: string;
    fromAmount: string;
    fromAddress: string;
  }): Promise<{ ok: boolean; quote?: SwapQuote; error?: string }> {
    const normalizedFromChain = this.normalizeChainId(params.fromChainId);
    const normalizedToChain = this.normalizeChainId(params.toChainId);

    const result = await this.request<{ result: SwapQuote }>(
      "GET",
      "/v1/bridge/quote",
      undefined,
      {
        fromChainId: normalizedFromChain,
        toChainId: normalizedToChain,
        fromTokenAddress: params.fromTokenAddress,
        toTokenAddress: params.toTokenAddress,
        fromAmount: params.fromAmount,
        fromAddress: params.fromAddress,
      }
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, quote: result.data?.result };
  }

  async executeSwap(params: {
    walletAddress: string;
    fromChainId: string;
    toChainId: string;
    fromTokenAddress: string;
    toTokenAddress: string;
    fromAmount: string;
    slippageBps?: number;
  }): Promise<{ ok: boolean; transaction?: TransactionResult; error?: string }> {
    const normalizedFromChain = this.normalizeChainId(params.fromChainId);
    const normalizedToChain = this.normalizeChainId(params.toChainId);

    const swapPayload = {
      fromChainId: parseInt(normalizedFromChain),
      toChainId: parseInt(normalizedToChain),
      fromTokenAddress: params.fromTokenAddress,
      toTokenAddress: params.toTokenAddress,
      fromAmount: params.fromAmount,
      fromAddress: params.walletAddress,
      toAddress: params.walletAddress,
      slippageBps: params.slippageBps || 100,
    };

    const result = await this.request<{ result: TransactionResult }>(
      "POST",
      "/v1/bridge/swap",
      swapPayload
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, transaction: result.data?.result };
  }

  async sendTransaction(params: {
    walletAddress: string;
    chainId: string;
    toAddress: string;
    data?: string;
    value?: string;
  }): Promise<{ ok: boolean; transaction?: TransactionResult; error?: string }> {
    const normalizedChainId = this.normalizeChainId(params.chainId);

    const result = await this.request<{ result: TransactionResult }>(
      "POST",
      `/backend-wallet/${normalizedChainId}/send-transaction`,
      {
        toAddress: params.toAddress,
        data: params.data || "0x",
        value: params.value || "0",
      },
      undefined,
      { "x-backend-wallet-address": params.walletAddress }
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, transaction: result.data?.result };
  }

  async getTransactionStatus(queueId: string): Promise<{ ok: boolean; status?: TransactionResult; error?: string }> {
    const result = await this.request<{ result: TransactionResult }>(
      "GET",
      `/transaction/status/${queueId}`
    );

    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    return { ok: true, status: result.data?.result };
  }

  getDefaultLimits() {
    return { ...DEFAULT_TRANSACTION_LIMITS };
  }

  validateTransactionLimits(
    valueUsd: number,
    dailyTransactionCount: number,
    dailyVolumeUsd: number,
    lastTransactionTime: number,
    limits = DEFAULT_TRANSACTION_LIMITS
  ): { valid: boolean; reason?: string } {
    const now = Date.now();
    const cooldownMs = limits.cooldownSeconds * 1000;

    if (now - lastTransactionTime < cooldownMs) {
      const remainingSeconds = Math.ceil((cooldownMs - (now - lastTransactionTime)) / 1000);
      return { valid: false, reason: `Cooldown active. Please wait ${remainingSeconds} seconds.` };
    }

    if (valueUsd > limits.maxTransactionValueUsd) {
      return { valid: false, reason: `Transaction value $${valueUsd} exceeds limit of $${limits.maxTransactionValueUsd}` };
    }

    if (dailyTransactionCount >= limits.maxDailyTransactions) {
      return { valid: false, reason: `Daily transaction limit of ${limits.maxDailyTransactions} reached` };
    }

    if (dailyVolumeUsd + valueUsd > limits.maxDailyVolumeUsd) {
      return { valid: false, reason: `Would exceed daily volume limit of $${limits.maxDailyVolumeUsd}` };
    }

    return { valid: true };
  }

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    path: string,
    body?: Record<string, unknown>,
    query?: Record<string, string>,
    extraHeaders?: Record<string, string>
  ): Promise<{ ok: boolean; data?: T; error?: string }> {
    await this.ensureReady();

    const url = new URL(`${this.engineUrl}${path}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers = this.buildHeaders(extraHeaders);

      console.log(`[ThirdwebEngineService] ${method} ${url.toString()}`);

      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const text = await response.text();
        console.error(`[ThirdwebEngineService] Request failed - Status: ${response.status}, Error: ${text}`);
        return { ok: false, error: text || response.statusText };
      }

      const text = await response.text();
      if (!text) {
        return { ok: true };
      }
      
      const data = JSON.parse(text) as T;
      return { ok: true, data };
    } catch (error) {
      clearTimeout(timer);
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[ThirdwebEngineService] Request error: ${errorMessage}`);
      return { ok: false, error: errorMessage };
    }
  }

  private buildHeaders(extraHeaders?: Record<string, string>): HeadersInit {
    if (!this.secretKey) {
      throw new Error("THIRDWEB_SECRET_KEY is not configured.");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-secret-key": this.secretKey,
    };

    if (this.clientId) {
      headers["x-client-id"] = this.clientId;
    }

    if (extraHeaders) {
      Object.assign(headers, extraHeaders);
    }

    return headers;
  }
}
