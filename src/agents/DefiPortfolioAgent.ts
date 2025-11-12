import type { Env } from "../index";
import { ThirdwebToolboxService } from "../services/ThirdwebToolboxService";
import { SwapExecutionAgent } from "./swap/SwapExecutionAgent";
import { StrategyAgent } from "./strategy/StrategyAgent";
import { PaymentAgent, type SubscriptionTier } from "./payments/PaymentAgent";
import { BuybackAgent } from "./treasury/BuybackAgent";
import type { AIUISDKMessage } from "../framework/types";

type AgentResponse = {
  message: string;
  data?: unknown;
};

type Command = "swap" | "bridge" | "payment" | "balance" | "buyback" | "strategy" | "unknown";

export class DefiPortfolioAgentDO {
  private readonly state: DurableObjectState;
  private readonly env: Env;
  private readonly toolbox: ThirdwebToolboxService;
  private readonly swapAgent: SwapExecutionAgent;
  private readonly strategyAgent: StrategyAgent;
  private readonly paymentAgent: PaymentAgent;
  private readonly buybackAgent: BuybackAgent;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    this.toolbox = new ThirdwebToolboxService(env);
    this.swapAgent = new SwapExecutionAgent(this.toolbox);
    this.strategyAgent = new StrategyAgent();
    this.paymentAgent = new PaymentAgent(this.toolbox);
    this.buybackAgent = new BuybackAgent(this.toolbox);
  }

  private async handleBridge(sessionId: string, params: Record<string, string>): Promise<AgentResponse> {
    const required = ["fromchain", "tochain", "amount"];
    const missing = required.filter((key) => !params[key]);

    if (missing.length > 0) {
      return {
        message:
          "Bridge membutuhkan parameter minimal amount, fromChain, dan toChain. Contoh: bridge amount=100 fromChain=ethereum toChain=avalanche token=USDC.",
      };
    }

    const fromTokenInput = params.token ?? params.fromtoken ?? "";
    const toTokenInput = params.totoken ?? params.token;
    const tokenIn = SwapExecutionAgent.resolveToken(fromTokenInput, params.fromchain);
    const tokenOut = toTokenInput ? SwapExecutionAgent.resolveToken(toTokenInput, params.tochain) : tokenIn;

    if (!tokenIn || !tokenOut) {
      return {
        message:
          "MindFi belum mengenali token tersebut untuk bridge. Gunakan nama/token address yang didukung (contoh: USDC@ethereum).",
      };
    }

    const context = {
      sessionId,
      amount: params.amount,
      slippageBps: params.slippage ? Number(params.slippage) : undefined,
      receiverAddress: params.receiver ?? params.toaddress ?? this.toolbox.getTreasuryAddress(),
      tokenIn,
      tokenOut,
    };

    const chains = await this.thirdweb.getBridgeChains();
    const [routes, execution] = await Promise.all([
      this.swapAgent.findBestRoute(context),
      this.swapAgent.executeSwap(context),
    ]);
    const convert = await this.thirdweb.convertBridgeQuote({
      fromChain: tokenIn.chainId.toString(),
      toChain: tokenOut.chainId.toString(),
      fromTokenAddress: tokenIn.address,
      toTokenAddress: tokenOut.address,
      amount: SwapExecutionAgent.amountToBaseUnits(context.amount, tokenIn.decimals),
    });

    return {
      message: `Bridge ${context.amount} ${tokenIn.symbol} (${tokenIn.chainId} → ${tokenOut.chainId}) sedang diproses.`,
      data: { chains, routes, convert, execution },
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get("sessionId") ?? crypto.randomUUID();
    const payload = await request.json<AIUISDKMessage>();
    const response = await this.processMessage(sessionId, payload);
    return Response.json(response);
  }

  private async processMessage(sessionId: string, payload: AIUISDKMessage): Promise<AgentResponse> {
    await this.toolbox.ensureReady();

    const latest = this.extractLatestUserMessage(payload);
    const command = this.detectCommand(latest);
    const params = this.parseKeyValuePairs(latest);

    switch (command) {
      case "swap":
        return this.handleSwap(sessionId, params);
      case "bridge":
        return this.handleBridge(sessionId, params);
      case "payment":
        return this.handlePayment(params);
      case "balance":
        return this.handleBalance(params);
      case "buyback":
        return this.handleBuyback(params);
      case "strategy":
        return this.handleStrategy(sessionId);
      default:
        return this.handleFallback(sessionId, latest);
    }
  }

  private extractLatestUserMessage(payload: AIUISDKMessage): string {
    const message = payload.messages?.slice().reverse().find((item) => item.role === "user");
    return message?.content ?? "";
  }

  private detectCommand(text: string): Command {
    const lowered = text.toLowerCase();
    if (lowered.includes("swap")) return "swap";
    if (lowered.includes("bridge") || lowered.includes("jembatan")) return "bridge";
    if (lowered.includes("payment") || lowered.includes("bayar") || lowered.includes("x402")) return "payment";
    if (lowered.includes("saldo") || lowered.includes("balance")) return "balance";
    if (lowered.includes("buyback") || lowered.includes("beli balik")) return "buyback";
    if (lowered.includes("strategi") || lowered.includes("strategy")) return "strategy";
    return "unknown";
  }

  private parseKeyValuePairs(text: string): Record<string, string> {
    const pairs = Array.from(text.matchAll(/(\w+)=([^\s]+)/g));
    const result: Record<string, string> = {};
    for (const [, key, value] of pairs) {
      result[key.toLowerCase()] = value;
    }
    return result;
  }

  private async handleSwap(sessionId: string, params: Record<string, string>): Promise<AgentResponse> {
    const required = ["fromchain", "tochain", "amount"];
    const missing = required.filter((key) => !params[key]);

    if (missing.length > 0) {
      return {
        message: `Parameter swap belum lengkap (${missing.join(", ")}). Gunakan format: swap amount=100 fromChain=ethereum toChain=avalanche fromToken=USDC toToken=XAVA`,
      };
    }

    const fromTokenInput = params.fromtoken ?? params.fromtokenaddress ?? "";
    const toTokenInput = params.totoken ?? params.totokenaddress ?? "";
    const tokenIn = SwapExecutionAgent.resolveToken(fromTokenInput, params.fromchain);
    const tokenOut = SwapExecutionAgent.resolveToken(toTokenInput, params.tochain);

    if (!tokenIn || !tokenOut) {
      return {
        message:
          "MindFi belum mengenali token tersebut. Gunakan nama/token address yang didukung (contoh: USDC@ethereum, XAVA@avalanche) atau tambahkan dukungan di TOKEN_DIRECTORY.",
      };
    }

    const context = {
      sessionId,
      amount: params.amount,
      slippageBps: params.slippage ? Number(params.slippage) : undefined,
      receiverAddress: params.receiver ?? params.toaddress ?? params.beneficiary ?? this.env.XAVA_TREASURY_ADDRESS,
      tokenIn,
      tokenOut,
    };

    const [routes, execution] = await Promise.all([
      this.swapAgent.findBestRoute(context),
      this.swapAgent.executeSwap(context),
    ]);

    return {
      message: `Swap ${context.amount} ${tokenIn.symbol} (${tokenIn.chainId} → ${tokenOut.chainId}) sedang diproses.`,
      data: { routes, execution },
    };
  }

  private async handleBridge(sessionId: string, params: Record<string, string>): Promise<AgentResponse> {
    const required = ["fromchain", "tochain", "amount"];
    const missing = required.filter((key) => !params[key]);

    if (missing.length > 0) {
      return {
        message:
          "Bridge membutuhkan parameter minimal amount, fromChain, dan toChain. Contoh: bridge amount=100 fromChain=ethereum toChain=avalanche token=USDC.",
      };
    }

    const senderAddress = params.from ?? params.sender ?? this.toolbox.getTreasuryAddress();
    if (!senderAddress) {
      return {
        message: "Bridge memerlukan from=<wallet> atau set variabel XAVA_TREASURY_ADDRESS.",
      };
    }

    const fromTokenInput = params.token ?? params.fromtoken ?? "";
    const toTokenInput = params.totoken ?? params.totokenaddress ?? fromTokenInput;
    const tokenIn = SwapExecutionAgent.resolveToken(fromTokenInput, params.fromchain);
    const tokenOut = SwapExecutionAgent.resolveToken(toTokenInput, params.tochain);

    if (!tokenIn || !tokenOut) {
      return {
        message:
          "MindFi belum mengenali token untuk bridge ini. Gunakan nama/token address yang didukung (contoh: USDC@ethereum).",
      };
    }

    const context = {
      sessionId,
      amount: params.amount,
      slippageBps: params.slippage ? Number(params.slippage) : undefined,
      senderAddress,
      receiverAddress: params.receiver ?? params.toaddress ?? senderAddress,
      tokenIn,
      tokenOut,
    };

    const [chains, routes, execution] = await Promise.all([
      this.thirdweb.getBridgeChains(),
      this.swapAgent.findBestRoute(context),
      this.swapAgent.executeSwap(context),
    ]);

    let fiatQuote: unknown;
    if (params.fiat && params.fiatamount) {
      fiatQuote = await this.thirdweb.convertFiatToCrypto({
        from: params.fiat,
        fromAmount: params.fiatamount,
        chainId: tokenOut.chainId.toString(),
        to: tokenOut.address,
      });
    }

    if (execution.error) {
      return {
        message:
          `Bridge ${context.amount} ${tokenIn.symbol} (${tokenIn.chainId} → ${tokenOut.chainId}) membutuhkan tindakan tambahan.`,
        data: { chains, routes, execution, fiatQuote },
        error:
          execution.error ||
          "Thirdweb memerlukan autentikasi/top-up. Ikuti link pembayaran atau login untuk melanjutkan.",
      };
    }

    return {
      message: `Bridge ${context.amount} ${tokenIn.symbol} (${tokenIn.chainId} → ${tokenOut.chainId}) sedang diproses.`,
      data: { chains, routes, execution, fiatQuote },
    };
  }

  private async handlePayment(params: Record<string, string>): Promise<AgentResponse> {
    const action = (params.action ?? params.do ?? params.status ?? "create").toLowerCase();
    const paymentId = params.paymentid ?? params.id;

    if (action === "verify" || action === "cek" || action === "status" || action === "settle") {
      return {
        message:
          "Verifikasi/settle otomatis belum tersedia. Gunakan link pembayaran yang diberikan untuk melanjutkan atau cek status transaksi langsung di dashboard Thirdweb.",
      };
    }

    const amount = params.amount ?? params.amountusd;
    const tier = params.tier as SubscriptionTier | undefined;
    const userId = params.user ?? params.userid;

    if (!amount || !tier || !userId) {
      return {
        message:
          "Permintaan pembayaran baru belum lengkap. Gunakan format: payment amount=150 tier=strategy user=0xWallet. Tier valid: analyzer, strategy, automation, enterprise. Tambahkan action=verify atau action=settle untuk pengecekan lanjutan.",
      };
    }

    const intent = {
      amountUsd: amount,
      userId,
      tier,
    } as const;

    const response = await this.paymentAgent.createX402Payment(intent);

    return {
      message: `Permintaan payment X402 untuk tier ${tier} sebesar ${amount} USD telah diajukan.`,
      data: response,
    };
  }

  private async handleBalance(params: Record<string, string>): Promise<AgentResponse> {
    const address = params.address ?? params.wallet ?? "";
    const chain = params.chain ?? params.chainid ?? params.network ?? "1";

    if (!address) {
      return {
        message: "Berikan parameter address=0xWallet untuk mengecek saldo.",
      };
    }

    const balance = await this.toolbox.getWalletBalance(address, chain);

    return {
      message: `Saldo wallet ${address} (chain ${chain}):`,
      data: balance,
    };
  }

  private async handleBuyback(params: Record<string, string>): Promise<AgentResponse> {
    const amount = params.amount ?? params.xava;
    const treasuryWallet = params.from ?? params.treasury ?? (this.toolbox.getTreasuryAddress() ?? "");
    const buybackWallet = params.to ?? params.treasurytarget ?? "";
    const cycle = params.cycle ?? new Date().toISOString();

    if (!amount || !treasuryWallet || !buybackWallet) {
      return {
        message:
          "Permintaan buyback belum lengkap. Gunakan format: buyback amount=1000XAVA from=0xTreasury to=0xBuyback cycle=2024Q4.",
      };
    }

    const plan = {
      cycle,
      targetXavaAmount: amount,
      fundingSource: "fees" as const,
      treasuryWallet,
      buybackWallet,
    };

    const response = await this.buybackAgent.executeBuyback(plan);

    return {
      message: `Buyback XAVA sebesar ${amount} dari ${treasuryWallet} menuju ${buybackWallet} dijadwalkan.`,
      data: response,
    };
  }

  private async handleStrategy(sessionId: string): Promise<AgentResponse> {
    const recommendations = await this.strategyAgent.generateRecommendations(sessionId);
    return {
      message: "Strategi MindFi terbaru:",
      data: recommendations,
    };
  }

  private async handleFallback(sessionId: string, latestMessage: string): Promise<AgentResponse> {
    const recommendations = await this.strategyAgent.generateRecommendations(sessionId);

    return {
      message:
        "Belum yakin apa yang kamu butuhkan. Berikut rekomendasi strategi awal MindFi. Gunakan perintah: swap, payment, balance, buyback, atau strategy dengan format key=value.",
      data: {
        latestMessage,
        recommendations,
        thirdwebToolsAvailable: this.toolbox.getToolLabels(),
      },
    };
  }
}
