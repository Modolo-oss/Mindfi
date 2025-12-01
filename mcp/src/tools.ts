import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ThirdwebToolboxService } from "./services/ThirdwebToolboxService.js";
import type { CoinGeckoService } from "./services/CoinGeckoService.js";
import type { SwapExecutionAgent } from "./agents/swap/SwapExecutionAgent.js";
import type { DurableObjectState } from "@cloudflare/workers-types";

interface ToolsContext {
    toolbox: ThirdwebToolboxService;
    coinGecko: CoinGeckoService;
    swapAgent: SwapExecutionAgent;
    state: DurableObjectState;
}

export function setupServerTools(server: McpServer, context: ToolsContext): void {
    server.tool(
        "get_wallet_balance",
        "Check wallet balance on a specific chain",
        {
            address: z.string().describe("Wallet address (0x...)"),
            chain: z.string().describe("Chain ID or name (e.g. 'ethereum', 'bsc')"),
        },
        async ({ address, chain }) => {
            const result = await context.toolbox.getWalletBalance(address, chain);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
    );

    server.tool(
        "get_token_price",
        "Get current token price from CoinGecko",
        {
            token: z.string().describe("Token symbol (e.g. 'ethereum', 'bitcoin')"),
        },
        async ({ token }) => {
            const result = await context.coinGecko.getTokenPrice(token.toLowerCase());
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result),
                    },
                ],
            };
        }
    );

    server.tool(
        "swap_tokens",
        "Swap tokens on a specific chain",
        {
            amount: z.string().describe("Amount of tokens to swap"),
            fromChain: z.string().describe("Source chain ID or name (e.g. 'ethereum', '1', 'bsc', '56')"),
            toChain: z.string().describe("Destination chain ID or name"),
            fromToken: z.string().describe("Source token symbol or address (e.g. 'USDC', 'ETH')"),
            toToken: z.string().describe("Destination token symbol or address"),
        },
        async ({ amount, fromChain, toChain, fromToken, toToken }) => {
            try {
                const { SwapExecutionAgent } = await import("./agents/swap/SwapExecutionAgent.js");
                const tokenIn = SwapExecutionAgent.resolveToken(fromToken, fromChain);
                const tokenOut = SwapExecutionAgent.resolveToken(toToken, toChain);
                
                if (!tokenIn || !tokenOut) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "Token not found in token directory",
                                }),
                            },
                        ],
                    };
                }

                const context = {
                    amount,
                    tokenIn,
                    tokenOut,
                    fromChain,
                    toChain,
                    sessionId: "mcp-session",
                };

                const routeResult = await context.swapAgent.findBestRoute(context);
                
                if (!routeResult.routes.ok || !routeResult.routes.data) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: routeResult.routes.error || "Failed to find swap route",
                                }),
                            },
                        ],
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    message: "Swap route found",
                                    routes: routeResult.routes.data,
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: false,
                                error: error instanceof Error ? error.message : String(error),
                            }),
                        },
                    ],
                };
            }
        }
    );

    server.tool(
        "monitor_price",
        "Monitor token price and set alert",
        {
            token: z.string().describe("Token symbol"),
            targetPrice: z.number().describe("Target price to monitor"),
            condition: z.enum(["above", "below"]).describe("Alert condition: 'above' or 'below' target price"),
        },
        async ({ token, targetPrice, condition }) => {
            try {
                const alerts = (await context.state.storage.get<any[]>("alerts")) || [];
                alerts.push({ token, targetPrice, condition, createdAt: Date.now() });
                await context.state.storage.put("alerts", alerts);

                const currentAlarm = await context.state.storage.getAlarm();
                if (currentAlarm === null) {
                    await context.state.storage.setAlarm(Date.now() + 10 * 1000);
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                message: `Price alert set for ${token}: ${condition} $${targetPrice}`,
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: false,
                                error: error instanceof Error ? error.message : String(error),
                            }),
                        },
                    ],
                };
            }
        }
    );

    server.tool(
        "get_portfolio",
        "Get wallet portfolio across multiple chains",
        {
            address: z.string().describe("Wallet address"),
        },
        async ({ address }) => {
            try {
                const chains = ["ethereum", "bsc", "polygon", "avalanche"];
                const balances = await Promise.all(
                    chains.map(async (chain) => {
                        try {
                            const balance = await context.toolbox.getWalletBalance(address, chain);
                            return { chain, balance };
                        } catch (e) {
                            return { chain, balance: null, error: String(e) };
                        }
                    })
                );

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    address,
                                    balances,
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: false,
                                error: error instanceof Error ? error.message : String(error),
                            }),
                        },
                    ],
                };
            }
        }
    );

    server.tool(
        "transfer_tokens",
        "Transfer tokens to another address",
        {
            toAddress: z.string().describe("Recipient address"),
            amount: z.string().describe("Amount to transfer"),
            token: z.string().describe("Token symbol or address"),
            chain: z.string().describe("Chain ID or name"),
        },
        async ({ toAddress, amount, token, chain }) => {
            try {
                if (!toAddress.startsWith("0x") || toAddress.length !== 42) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "Invalid address format. Must be a valid Ethereum address (0x...)",
                                }),
                            },
                        ],
                    };
                }

                const result = await context.toolbox.transferTokens({
                    to: toAddress,
                    amount,
                    token,
                    chain,
                });

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: false,
                                error: error instanceof Error ? error.message : String(error),
                            }),
                        },
                    ],
                };
            }
        }
    );
}

