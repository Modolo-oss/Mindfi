import { AiSdkAgent, type AIUISDKMessage, ToolboxService } from "@nullshot/agent";
import { LanguageModel, stepCountIs } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import type { Env } from "../types.js";
import { CoinGeckoService } from "../services/CoinGeckoService.js";
import mcpConfig from "../mcp.json";

export class MindFiAgent extends AiSdkAgent<Env> {
    constructor(state: DurableObjectState, env: Env) {
        const modelId = env.MODEL_ID || "claude-3-5-sonnet-20241022";
        const anthropic = createAnthropic({
            apiKey: env.ANTHROPIC_API_KEY as string,
        });
        const model: LanguageModel = anthropic(modelId);
        
        super(state, env, model, [new ToolboxService(env, mcpConfig)]);
        console.log("[MindFiAgent] Constructor called with model:", modelId);
    }

    async alarm() {
        console.log("[MindFiAgent] Alarm triggered, checking prices...");
        const alerts = (await this.state.storage.get<any[]>("alerts")) || [];
        if (alerts.length === 0) return;

        const coinGecko = new CoinGeckoService(this.env.COINGECKO_API_KEY);
        const remainingAlerts = [];

        for (const alert of alerts) {
            try {
                const priceData = await coinGecko.getTokenPrice(alert.token);
                const currentPrice = priceData.price;

                let triggered = false;
                if (alert.condition === "above" && currentPrice > alert.targetPrice) triggered = true;
                if (alert.condition === "below" && currentPrice < alert.targetPrice) triggered = true;

                if (triggered) {
                    console.log(`[ALERT TRIGGERED] ${alert.token} is now $${currentPrice} (${alert.condition} $${alert.targetPrice})`);
                } else {
                    remainingAlerts.push(alert);
                }
            } catch (e) {
                console.error(`[MindFiAgent] Error checking price for ${alert.token}:`, e);
                remainingAlerts.push(alert);
            }
        }

        await this.state.storage.put("alerts", remainingAlerts);

        if (remainingAlerts.length > 0) {
            await this.state.storage.setAlarm(Date.now() + 10 * 1000);
        }
    }

    async processMessage(sessionId: string, messages: AIUISDKMessage): Promise<Response> {
        console.log("[MindFiAgent] processMessage called with sessionId:", sessionId);

        try {
            const result = await this.streamTextWithMessages(
                sessionId,
                messages.messages,
                {
                    system: `You are MindFi, an AI-powered DeFi assistant.
You help users with blockchain operations including:
- Swapping tokens across different chains
- Checking wallet balances
- Getting token prices
- Making payments
- Monitoring token prices (setting alerts)

IMPORTANT INSTRUCTIONS:
- When a user asks to swap tokens, use the 'swap_tokens' tool
- When a user asks for balance, use the 'get_wallet_balance' tool
- When a user asks for token price, use the 'get_token_price' tool
- When a user asks to monitor price or set alert, use the 'monitor_price' tool
- When a user asks to transfer funds, use the 'transfer_tokens' tool
- When a user asks for portfolio or balances across chains, use the 'get_portfolio' tool
- When a user asks to create payment, use the 'create_payment' tool
- Always respond in the user's language (English, Indonesian, etc.)
- Be concise and helpful
- Provide clear transaction details when executing operations

SAFETY RULES:
- Before executing a transfer or swap of value > $10, ALWAYS ask the user for explicit confirmation (e.g. "Are you sure you want to transfer...?")
- If the user provides an invalid address, explain why it is invalid.`,
                    maxSteps: 10,
                    stopWhen: stepCountIs(10),
                    experimental_toolCallStreaming: true,
                    onError: (error: unknown) => {
                        console.error("[MindFiAgent] Error in streamText:", error);
                    },
                }
            );

            console.log("[MindFiAgent] streamTextWithMessages completed");
            return result.toTextStreamResponse();
        } catch (error) {
            console.error("[MindFiAgent] Error in processMessage:", error);
            throw error;
        }
    }
}
