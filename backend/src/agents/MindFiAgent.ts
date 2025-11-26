import { DurableObject } from "cloudflare:workers";
import { AiSdkAgent } from "@nullshot/agent";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createDefiTools } from "../tools/defiTools.js";
import { Env } from "../index.js";
import type { AIUISDKMessage } from "@nullshot/agent";

import { CoinGeckoService } from "../services/CoinGeckoService.js";

export class MindFiAgent extends DurableObject<Env> {
    private agent: AiSdkAgent<Env>;
    private state: DurableObjectState;

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.state = state;

        console.log("[MindFiAgent] Constructor called");

        // Select model based on env configuration
        const modelId = env.MODEL_ID || "claude-3-haiku-20240307";
        const anthropic = createAnthropic({
            apiKey: env.ANTHROPIC_API_KEY as string,
        });
        const model = anthropic(modelId);

        // Create the agent instance
        this.agent = new AiSdkAgent(state, env, model);

        console.log("[MindFiAgent] Agent instance created with model:", modelId);
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
                    // In a real app, we would send a message to the user here.
                    // For now, we just log it.
                } else {
                    remainingAlerts.push(alert);
                }
            } catch (e) {
                console.error(`[MindFiAgent] Error checking price for ${alert.token}:`, e);
                remainingAlerts.push(alert); // Keep alert on error to retry
            }
        }

        await this.state.storage.put("alerts", remainingAlerts);

        if (remainingAlerts.length > 0) {
            await this.state.storage.setAlarm(Date.now() + 10 * 1000); // Check every 10 seconds
        }
    }

    async processMessage(sessionId: string, messages: AIUISDKMessage): Promise<Response> {
        console.log("[MindFiAgent] processMessage called with sessionId:", sessionId);

        try {
            // Create DeFi tools
            const tools = createDefiTools(this.env, this.state);
            console.log("[MindFiAgent] DeFi tools created:", Object.keys(tools));

            // Use streamTextWithMessages method from the agent with tools
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const result = await (this.agent as any).streamTextWithMessages(
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
- When a user asks to swap tokens, use the 'swap' tool
- When a user asks for balance, use the 'balance' tool
- When a user asks for token price, use the 'price' tool
- When a user asks to monitor price or set alert, use the 'monitor_price' tool
- When a user asks to transfer funds, use the 'transfer' tool
- When a user asks for portfolio or balances across chains, use the 'portfolio' tool
- Always respond in the user's language (English, Indonesian, etc.)
- Be concise and helpful
- Provide clear transaction details when executing operations

SAFETY RULES:
- Before executing a transfer or swap of value > $10, ALWAYS ask the user for explicit confirmation (e.g. "Are you sure you want to transfer...?")
- If the user provides an invalid address, explain why it is invalid.`,
                    maxSteps: 10,
                    tools: tools, // Pass DeFi tools to enable blockchain operations
                    experimental_toolCallStreaming: true, // Enable tool call streaming
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
