import { ThirdwebToolboxService } from "../../services/ThirdwebToolboxService";

export type SubscriptionTier = "analyzer" | "strategy" | "automation" | "enterprise";

const DEFAULT_TOKEN = {
  address: "0xA0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
  chainId: 1,
  symbol: "USDC",
  decimals: 6,
};

export interface PaymentIntentPayload {
  amountUsd: string;
  userId: string;
  tier: SubscriptionTier;
  reference?: string;
}

export class PaymentAgent {
  constructor(private readonly thirdweb: ThirdwebToolboxService) {}

  async createX402Payment(intent: PaymentIntentPayload) {
    const recipient = this.thirdweb.getTreasuryAddress();
    if (!recipient) {
      throw new Error("XAVA_TREASURY_ADDRESS belum dikonfigurasi.");
    }

    const payload = {
      name: `MindFi ${intent.tier} subscription`,
      description: `Pembayaran MindFi tier ${intent.tier}`,
      amount: intent.amountUsd,
      currency: "USD",
      recipient,
      token: {
        ...DEFAULT_TOKEN,
        amount: toBaseUnits(intent.amountUsd, DEFAULT_TOKEN.decimals),
      },
      metadata: {
        userId: intent.userId,
        tier: intent.tier,
        reference: intent.reference ?? crypto.randomUUID(),
      },
    };

    const response = await this.thirdweb.createX402Payment(payload);

    return {
      payload,
      response,
    };
  }

  async verifyPayment(paymentId: string) {
    const payload = { paymentId };
    const response = await this.thirdweb.verifyX402Payment(payload);

    return {
      payload,
      response,
    };
  }

  async settlePayment(paymentId: string) {
    const payload = { paymentId };
    const response = await this.thirdweb.settleX402Payment(payload);

    return {
      payload,
      response,
    };
  }
}

function toBaseUnits(amount: string, decimals: number): string {
  const [wholePart, fraction = ""] = amount.split(".");
  const sanitizedFraction = fraction.replace(/\D/g, "");
  const paddedFraction = (sanitizedFraction + "0".repeat(decimals)).slice(0, decimals);
  const whole = wholePart === "" ? "0" : wholePart;
  const value = BigInt(whole) * 10n ** BigInt(decimals) + BigInt(paddedFraction || "0");
  return value.toString();
}

