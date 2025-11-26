import { ThirdwebToolboxService } from "../../services/ThirdwebToolboxService";

interface TokenMetadata {
  chainId: number;
  address: string;
  symbol: string;
  decimals: number;
}

const TOKEN_DIRECTORY: TokenMetadata[] = [
  {
    chainId: 1,
    address: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    symbol: "USDC",
    decimals: 6,
  },
  {
    chainId: 43114,
    address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    symbol: "USDC",
    decimals: 6,
  },
  {
    chainId: 43114,
    address: "0x214DB107654fF987AD859F34125307783fC8e387",
    symbol: "XAVA",
    decimals: 18,
  },
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

  static resolveToken(symbolOrAddress: string, chainKey: string): TokenMetadata | undefined {
    const lower = symbolOrAddress.toLowerCase();
    const chain = chainKey.toLowerCase();

    return TOKEN_DIRECTORY.find((token) => {
      const symbolMatch = token.symbol.toLowerCase() === lower && chainMatches(token.chainId, chain);
      const addressMatch = token.address.toLowerCase() === lower;
      return symbolMatch || addressMatch;
    });
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

function chainMatches(chainId: number, chain: string): boolean {
  const normalized = chain.replace(/\s/g, "").toLowerCase();
  if (String(chainId) === normalized) return true;
  switch (normalized) {
    case "ethereum":
      return chainId === 1;
    case "avalanche":
    case "avax":
      return chainId === 43114;
    default:
      return false;
  }
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

