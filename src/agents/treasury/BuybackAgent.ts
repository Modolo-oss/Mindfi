import { ThirdwebToolboxService } from "../../services/ThirdwebToolboxService";

const XAVA_TOKEN = {
  chainId: 43114,
  address: "0x214DB107654fF987AD859F34125307783fC8e387",
  symbol: "XAVA",
  decimals: 18,
};

export interface BuybackPlan {
  cycle: string;
  targetXavaAmount: string;
  fundingSource: "fees" | "treasury";
  treasuryWallet: string;
  buybackWallet: string;
}

export class BuybackAgent {
  constructor(private readonly thirdweb: ThirdwebToolboxService) {}

  async executeBuyback(plan: BuybackPlan) {
    const payload = {
      chainId: XAVA_TOKEN.chainId,
      from: plan.treasuryWallet,
      tokenAddress: XAVA_TOKEN.address,
      recipients: [
        {
          address: plan.buybackWallet,
          quantity: toBaseUnits(plan.targetXavaAmount, XAVA_TOKEN.decimals),
        },
      ],
      metadata: {
        cycle: plan.cycle,
        fundingSource: plan.fundingSource,
      },
    };

    const response = await this.thirdweb.sendTokens(payload);

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

