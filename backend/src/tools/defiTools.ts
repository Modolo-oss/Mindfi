import { z } from "zod";
import { tool } from "ai";
import { SwapExecutionAgent } from "../agents/swap/SwapExecutionAgent.js";
import { ThirdwebToolboxService } from "../services/ThirdwebToolboxService.js";
import { CoinGeckoService } from "../services/CoinGeckoService.js";
import { PaymentAgent } from "../agents/payments/PaymentAgent.js";
import { Env } from "../index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createDefiTools = (env: Env, state: any) => {
    const toolbox = new ThirdwebToolboxService(env);
    const swapAgent = new SwapExecutionAgent(toolbox);
    const coinGecko = new CoinGeckoService(env.COINGECKO_API_KEY);
    const paymentAgent = new PaymentAgent(toolbox);

    return {
        swap: tool({
            description: "Swap tokens on a specific chain",
            parameters: z.object({
                amount: z.string().describe("Amount of tokens to swap"),
                fromChain: z.string().describe("Source chain ID or name (e.g. 'ethereum', '56')"),
                toChain: z.string().describe("Destination chain ID or name"),
                fromToken: z.string().describe("Source token symbol or address"),
                toToken: z.string().describe("Destination token symbol or address"),
                receiver: z.string().optional().describe("Receiver wallet address"),
            }),
            execute: async ({ amount, fromChain, toChain, fromToken, toToken, receiver }: { amount: string, fromChain: string, toChain: string, fromToken: string, toToken: string, receiver?: string }) => {
                const tokenIn = SwapExecutionAgent.resolveToken(fromToken, fromChain);
                const tokenOut = SwapExecutionAgent.resolveToken(toToken, toChain);

                if (!tokenIn || !tokenOut) {
                    return { error: "Token not recognized" };
                }

                const context = {
                    sessionId: "mcp-session", // TODO: Pass session ID
                    amount,
                    receiverAddress: receiver || env.XAVA_TREASURY_ADDRESS || "",
                    tokenIn,
                    tokenOut,
                };

                const [routes, execution] = await Promise.all([
                    swapAgent.findBestRoute(context),
                    swapAgent.executeSwap(context),
                ]);

                return {
                    message: `Swap ${amount} ${tokenIn.symbol} -> ${tokenOut.symbol} initiated`,
                    routes,
                    execution
                };
            },
        }),

        balance: tool({
            description: "Check wallet balance on a specific chain",
            parameters: z.object({
                address: z.string().describe("Wallet address (0x...)"),
                chain: z.string().describe("Chain ID or name (e.g. 'ethereum', 'bsc')"),
            }),
            execute: async ({ address, chain }: { address: string, chain: string }) => {
                const result = await toolbox.getWalletBalance(address, chain);
                return result;
            },
        }),

        price: tool({
            description: "Get current price of a token",
            parameters: z.object({
                token: z.string().describe("Token symbol (e.g. 'ETH', 'BTC')"),
            }),
            execute: async ({ token }: { token: string }) => {
                return await coinGecko.getTokenPrice(token.toLowerCase());
            },
        }),

        bridge: tool({
            description: "Bridge tokens between chains",
            parameters: z.object({
                fromChain: z.string().describe("Source chain ID"),
                toChain: z.string().describe("Destination chain ID"),
                token: z.string().describe("Token to bridge"),
                amount: z.string().describe("Amount to bridge"),
                receiver: z.string().optional().describe("Receiver address"),
            }),
            execute: async ({ fromChain, toChain, token, amount, receiver }: { fromChain: string, toChain: string, token: string, amount: string, receiver?: string }) => {
                // 1. Get routes
                const routes = await toolbox.getBridgeRoutes({
                    fromChainId: fromChain,
                    toChainId: toChain,
                    tokenAddress: token,
                    amount,
                });

                // 2. Execute swap/bridge if route found
                // Note: In a real agent, we might want to ask for confirmation first
                // For now, we'll just return the routes
                return {
                    message: "Bridge routes found",
                    routes,
                };
            },
        }),

        payment: tool({
            description: "Create a payment request",
            parameters: z.object({
                amount: z.string().describe("Amount to request"),
                token: z.string().describe("Token symbol or address"),
                chainId: z.string().describe("Chain ID"),
                description: z.string().optional().describe("Payment description"),
            }),
            execute: async ({ amount, token, chainId, description }: { amount: string, token: string, chainId: string, description?: string }) => {
                const result = await toolbox.createX402Payment({
                    amount,
                    tokenAddress: token,
                    chainId,
                    description,
                });
                return result;
            },
        }),

        monitor_price: tool({
            description: "Set an alert for when a token price reaches a target",
            parameters: z.object({
                token: z.string().describe("Token symbol (e.g. 'ETH', 'BTC')"),
                targetPrice: z.number().describe("Target price in USD"),
                condition: z.enum(["above", "below"]).describe("Alert when price is above or below target"),
            }),
            execute: async ({ token, targetPrice, condition }: { token: string, targetPrice: number, condition: "above" | "below" }) => {
                const alert = {
                    id: crypto.randomUUID(),
                    token: token.toLowerCase(),
                    targetPrice,
                    condition,
                    createdAt: Date.now(),
                };

                // Save to Durable Object storage
                const existingAlerts = (await state.storage.get<any[]>("alerts")) || [];
                await state.storage.put("alerts", [...existingAlerts, alert]);

                // Schedule alarm to check in 10 seconds (if not already running)
                // In a real app, we might want to check if an alarm is already set
                const currentAlarm = await state.storage.getAlarm();
                if (currentAlarm === null) {
                    await state.storage.setAlarm(Date.now() + 10 * 1000);
                }

                return {
                    message: `Alert set for ${token} ${condition} $${targetPrice}. I will notify you when it triggers.`,
                    alertId: alert.id
                };
            },
        }),

        portfolio: tool({
            description: "Get wallet balances across multiple chains (Ethereum, Base, Avalanche, etc.)",
            parameters: z.object({
                address: z.string().describe("Wallet address to check"),
            }),
            execute: async ({ address }: { address: string }) => {
                const chains = ["1", "8453", "43114", "137", "42161"]; // Eth, Base, Avax, Poly, Arb
                const results = await Promise.all(chains.map(async (chain) => {
                    try {
                        const balance = await toolbox.getWalletBalance(address, chain);
                        return { chain, balance, error: null };
                    } catch (e) {
                        return { chain, balance: null, error: String(e) };
                    }
                }));
                return {
                    message: "Portfolio fetched",
                    data: results
                };
            },
        }),

        transfer: tool({
            description: "Transfer tokens from the agent's wallet to another address",
            parameters: z.object({
                toAddress: z.string().describe("Destination wallet address"),
                amount: z.string().describe("Amount to transfer"),
                token: z.string().describe("Token symbol or address (e.g. 'USDC', '0x...')"),
                chain: z.string().describe("Chain ID or name (e.g. 'ethereum', 'base')"),
            }),
            execute: async ({ toAddress, amount, token, chain }: { toAddress: string, amount: string, token: string, chain: string }) => {
                // 1. Validate Address
                if (!/^0x[a-fA-F0-9]{40}$/.test(toAddress)) {
                    return { ok: false, error: "Invalid wallet address format. Must be a valid EVM address (0x...)" };
                }

                // Resolve token if possible to get address, otherwise use as is
                const resolvedToken = SwapExecutionAgent.resolveToken(token, chain);
                const tokenAddress = resolvedToken ? resolvedToken.address : token;

                const result = await toolbox.sendTokens({
                    toAddress,
                    amount,
                    currencyAddress: tokenAddress,
                    chainId: chain,
                });

                return result;
            },
        }),
    };
};
