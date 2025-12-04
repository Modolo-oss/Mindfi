import { ThirdwebToolboxService, BridgeToken } from "../../services/ThirdwebToolboxService.js";

export interface TokenMetadata {
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
  name?: string;
  priceUsd?: number;
}

export interface TokenResolutionResult {
  ok: boolean;
  token?: TokenMetadata;
  error?: string;
  requiresContractAddress?: boolean;
}

const TOKEN_DIRECTORY: TokenMetadata[] = [
  // Native ETH (represented as WETH for swaps)
  { chainId: 1, address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "ETH", decimals: 18 },
  { chainId: 1, address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", symbol: "WETH", decimals: 18 },
  // USDC
  { chainId: 1, address: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", symbol: "USDC", decimals: 6 },
  { chainId: 43114, address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E", symbol: "USDC", decimals: 6 },
  { chainId: 137, address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359", symbol: "USDC", decimals: 6 },
  { chainId: 56, address: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", symbol: "USDC", decimals: 18 },
  { chainId: 42161, address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", symbol: "USDC", decimals: 6 },
  // USDT
  { chainId: 1, address: "0xdAC17F958D2ee523a2206206994597C13D831ec7", symbol: "USDT", decimals: 6 },
  { chainId: 137, address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F", symbol: "USDT", decimals: 6 },
  { chainId: 56, address: "0x55d398326f99059fF775485246999027B3197955", symbol: "USDT", decimals: 18 },
  { chainId: 42161, address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9", symbol: "USDT", decimals: 6 },
  // DAI
  { chainId: 1, address: "0x6B175474E89094C44Da98b954EedeAC495271d0F", symbol: "DAI", decimals: 18 },
  // WBTC
  { chainId: 1, address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "WBTC", decimals: 8 },
  { chainId: 1, address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", symbol: "BTC", decimals: 8 },
  { chainId: 137, address: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", symbol: "WBTC", decimals: 8 },
  { chainId: 42161, address: "0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", symbol: "WBTC", decimals: 8 },
  // Polygon MATIC/WMATIC
  { chainId: 137, address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", symbol: "MATIC", decimals: 18 },
  { chainId: 137, address: "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270", symbol: "WMATIC", decimals: 18 },
  // BNB/WBNB
  { chainId: 56, address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "BNB", decimals: 18 },
  { chainId: 56, address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", symbol: "WBNB", decimals: 18 },
  // Avalanche
  { chainId: 43114, address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", symbol: "AVAX", decimals: 18 },
  { chainId: 43114, address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7", symbol: "WAVAX", decimals: 18 },
  { chainId: 43114, address: "0x214DB107654fF987AD859F34125307783fC8e387", symbol: "XAVA", decimals: 18 },
  // Arbitrum
  { chainId: 42161, address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "WETH", decimals: 18 },
  { chainId: 42161, address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", symbol: "ETH", decimals: 18 },
  // Optimism
  { chainId: 10, address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
  { chainId: 10, address: "0x4200000000000000000000000000000000000006", symbol: "ETH", decimals: 18 },
  { chainId: 10, address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", symbol: "USDC", decimals: 6 },
  { chainId: 10, address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", symbol: "USDT", decimals: 6 },
  { chainId: 10, address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", decimals: 18 },
  { chainId: 10, address: "0x68f180fcCe6836688e9084f035309E29Bf0A2095", symbol: "WBTC", decimals: 8 },
  // Base
  { chainId: 8453, address: "0x4200000000000000000000000000000000000006", symbol: "WETH", decimals: 18 },
  { chainId: 8453, address: "0x4200000000000000000000000000000000000006", symbol: "ETH", decimals: 18 },
  { chainId: 8453, address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", symbol: "USDC", decimals: 6 },
  { chainId: 8453, address: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb", symbol: "DAI", decimals: 18 },
  // LINK (Chainlink)
  { chainId: 1, address: "0x514910771AF9Ca656af840dff83E8264EcF986CA", symbol: "LINK", decimals: 18 },
  { chainId: 137, address: "0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39", symbol: "LINK", decimals: 18 },
  { chainId: 42161, address: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4", symbol: "LINK", decimals: 18 },
  // UNI (Uniswap)
  { chainId: 1, address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", symbol: "UNI", decimals: 18 },
  { chainId: 137, address: "0xb33EaAd8d922B1083446DC23f610c2567fB5180f", symbol: "UNI", decimals: 18 },
  { chainId: 42161, address: "0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0", symbol: "UNI", decimals: 18 },
  // AAVE
  { chainId: 1, address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9", symbol: "AAVE", decimals: 18 },
  { chainId: 137, address: "0xD6DF932A45C0f255f85145f286eA0b292B21C90B", symbol: "AAVE", decimals: 18 },
  // DAI on more chains
  { chainId: 137, address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063", symbol: "DAI", decimals: 18 },
  { chainId: 42161, address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", symbol: "DAI", decimals: 18 },
];

export interface SwapExecutionContext {
  sessionId: string;
  amount: string;
  slippageBps?: number;
  receiverAddress?: string;
  senderAddress?: string;
  minAmountOutBase?: string;
  tokenIn: TokenMetadata;
  tokenOut: TokenMetadata;
}

export class SwapExecutionAgent {
  constructor(private readonly thirdweb: ThirdwebToolboxService) {}

  /**
   * Static fallback resolution using TOKEN_DIRECTORY cache
   * Used for quick lookups of common tokens without API call
   */
  static resolveTokenFromCache(symbolOrAddress: string, chainKey: string): TokenMetadata | undefined {
    const lower = symbolOrAddress.toLowerCase();
    const chain = chainKey.toLowerCase();

    return TOKEN_DIRECTORY.find((token) => {
      const symbolMatch = token.symbol.toLowerCase() === lower && chainMatches(token.chainId, chain);
      const addressMatch = token.address.toLowerCase() === lower;
      return symbolMatch || addressMatch;
    });
  }

  /**
   * @deprecated Use resolveTokenFromCache for sync operations or resolveTokenDynamic for full resolution
   */
  static resolveToken(symbolOrAddress: string, chainKey: string): TokenMetadata | undefined {
    return SwapExecutionAgent.resolveTokenFromCache(symbolOrAddress, chainKey);
  }

  /**
   * Dynamic token resolution using Thirdweb API with static cache fallback
   * 1. First checks static TOKEN_DIRECTORY (fast, no API call)
   * 2. If not found, queries Thirdweb Bridge API
   * 3. If still not found, returns error asking for contract address
   */
  async resolveTokenDynamic(symbolOrAddress: string, chainKey: string): Promise<TokenResolutionResult> {
    const lower = symbolOrAddress.toLowerCase();
    const chainId = getChainId(chainKey);
    
    if (!chainId) {
      return { ok: false, error: `Unknown chain: ${chainKey}` };
    }

    // Check if it's a contract address format
    const isAddress = /^0x[a-fA-F0-9]{40}$/.test(symbolOrAddress);
    
    if (isAddress) {
      // Resolve by contract address
      return this.resolveByAddress(symbolOrAddress, chainId.toString());
    }
    
    // Step 1: Check static cache first (fast)
    const cached = SwapExecutionAgent.resolveTokenFromCache(symbolOrAddress, chainKey);
    if (cached) {
      console.log(`[SwapExecutionAgent] Token ${symbolOrAddress} found in cache`);
      return { ok: true, token: cached };
    }
    
    // Step 2: Query Thirdweb API
    console.log(`[SwapExecutionAgent] Token ${symbolOrAddress} not in cache, querying Thirdweb API...`);
    const result = await this.thirdweb.resolveTokenBySymbol(symbolOrAddress, chainId.toString());
    
    if (result.ok && result.token) {
      const token: TokenMetadata = {
        chainId: result.token.chainId,
        address: result.token.address,
        symbol: result.token.symbol,
        decimals: result.token.decimals,
        name: result.token.name,
        priceUsd: result.token.priceUsd,
      };
      console.log(`[SwapExecutionAgent] Token ${symbolOrAddress} found via Thirdweb API: ${token.name}`);
      return { ok: true, token };
    }
    
    // Step 3: Token not found - ask for contract address
    console.log(`[SwapExecutionAgent] Token ${symbolOrAddress} not found, requesting contract address`);
    return { 
      ok: false, 
      error: `Token "${symbolOrAddress}" tidak ditemukan di chain ${chainKey}. Silakan berikan contract address token.`,
      requiresContractAddress: true
    };
  }

  /**
   * Resolve token by contract address
   */
  async resolveByAddress(address: string, chainId: string): Promise<TokenResolutionResult> {
    // First check cache
    const cached = TOKEN_DIRECTORY.find(t => 
      t.address.toLowerCase() === address.toLowerCase() && 
      t.chainId === parseInt(chainId)
    );
    
    if (cached) {
      return { ok: true, token: cached };
    }
    
    // Query Thirdweb for token metadata
    const result = await this.thirdweb.getTokenMetadata(address, chainId);
    
    if (result.ok && result.token) {
      const token: TokenMetadata = {
        chainId: result.token.chainId,
        address: result.token.address,
        symbol: result.token.symbol,
        decimals: result.token.decimals,
        name: result.token.name,
        priceUsd: result.token.priceUsd,
      };
      return { ok: true, token };
    }
    
    return { 
      ok: false, 
      error: `Token di address ${address} tidak ditemukan atau tidak didukung untuk swap.`
    };
  }

  static amountToBaseUnits(amount: string, decimals: number): string {
    return toBaseUnits(amount, decimals);
  }

  async findBestRoute(ctx: SwapExecutionContext) {
    const query = {
      fromChain: ctx.tokenIn.chainId.toString(),
      toChain: ctx.tokenOut.chainId.toString(),
      fromTokenAddress: ctx.tokenIn.address,
      toTokenAddress: ctx.tokenOut.address,
      amount: SwapExecutionAgent.amountToBaseUnits(ctx.amount, ctx.tokenIn.decimals),
    };

    const routes = await this.thirdweb.getBridgeRoutes(query);

    return {
      routes,
      diagnostics: {
        query,
      },
    };
  }

  async executeSwap(ctx: SwapExecutionContext) {
    const tokenOutPayload: Record<string, unknown> = {
      address: ctx.tokenOut.address,
      chainId: ctx.tokenOut.chainId,
    };

    if (ctx.minAmountOutBase) {
      tokenOutPayload.minAmount = ctx.minAmountOutBase;
    }

    const payload: Record<string, unknown> = {
      exact: "input",
      tokenIn: {
        address: ctx.tokenIn.address,
        chainId: ctx.tokenIn.chainId,
        amount: SwapExecutionAgent.amountToBaseUnits(ctx.amount, ctx.tokenIn.decimals),
      },
      tokenOut: tokenOutPayload,
      slippageToleranceBps: ctx.slippageBps ?? 50,
    };

    if (ctx.senderAddress) {
      payload.from = ctx.senderAddress;
    }

    if (ctx.receiverAddress) {
      payload.receiver = ctx.receiverAddress;
    }

    const execution = await this.thirdweb.executeBridgeSwap(payload);

    if (!execution.ok) {
      return {
        execution,
        payload,
        error: normalizeThirdwebError(execution.error),
      };
    }

    return {
      execution,
      payload,
    };
  }
}

function getChainId(chain: string): number | undefined {
  const normalized = chain.replace(/\s/g, "").toLowerCase();
  
  // If already a number, return it
  const asNum = parseInt(normalized);
  if (!isNaN(asNum)) return asNum;
  
  switch (normalized) {
    case "ethereum":
    case "eth":
    case "mainnet":
      return 1;
    case "polygon":
    case "matic":
      return 137;
    case "bsc":
    case "binance":
    case "bnb":
      return 56;
    case "avalanche":
    case "avax":
      return 43114;
    case "arbitrum":
    case "arb":
      return 42161;
    case "optimism":
    case "op":
      return 10;
    case "base":
      return 8453;
    default:
      return undefined;
  }
}

function chainMatches(chainId: number, chain: string): boolean {
  const resolved = getChainId(chain);
  return resolved === chainId;
}

function toBaseUnits(amount: string, decimals: number): string {
  const [wholePart, fractionalPart = ""] = amount.split(".");
  const sanitizedFraction = fractionalPart.replace(/\D/g, "");
  if (!/^\d+$/.test(wholePart) && wholePart !== "") {
    throw new Error(`Bilangan tidak valid: ${amount}`);
  }

  const paddedFraction = (sanitizedFraction + "0".repeat(decimals)).slice(0, decimals);
  const whole = wholePart === "" ? "0" : wholePart;
  const value = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFraction || "0");
  return value.toString();
}

function normalizeThirdwebError(error?: string): string | undefined {
  if (!error) return undefined;
  try {
    const parsed = JSON.parse(error);
    if (parsed?.result?.message) {
      return parsed.result.message;
    }
    if (parsed?.message) {
      return parsed.message;
    }
  } catch {
    // ignore parse failure
  }
  return error;
}

