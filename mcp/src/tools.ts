import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ThirdwebToolboxService } from "./services/ThirdwebToolboxService.js";
import type { CoinGeckoService } from "./services/CoinGeckoService.js";
import type { SwapExecutionAgent } from "./agents/swap/SwapExecutionAgent.js";
import type { DurableObjectState } from "@cloudflare/workers-types";
import { NaturalLanguageRouterAgent } from "./agents/router/NaturalLanguageRouterAgent.js";

interface ToolsContext {
    toolbox?: ThirdwebToolboxService;
    coinGecko?: CoinGeckoService;
    swapAgent?: SwapExecutionAgent;
    state: DurableObjectState;
    server: McpServer;
    ensureInit: () => Promise<void>;
}

export function setupServerTools(server: McpServer, context: ToolsContext): void {
    const { state, ensureInit } = context;
    
    const getServices = async () => {
        await ensureInit();
        if (!context.coinGecko) throw new Error("CoinGeckoService not initialized");
        if (!context.toolbox) throw new Error("ThirdwebToolboxService not initialized");
        if (!context.swapAgent) throw new Error("SwapExecutionAgent not initialized");
        return {
            toolbox: context.toolbox,
            coinGecko: context.coinGecko,
            swapAgent: context.swapAgent,
        };
    };

    server.tool(
        "get_wallet_balance",
        "Check wallet balance on a specific chain. If address is not provided, uses your connected wallet. Chain can be name (e.g. 'ethereum', 'bsc', 'polygon') or chain ID (e.g. '1', '56', '137').",
        {
            address: z.string().optional().describe("Wallet address (0x...). If not provided, uses your connected wallet from connect_wallet."),
            chain: z.string().describe("Chain ID or name (e.g. 'ethereum', 'bsc', 'polygon', '1', '56', '137')"),
        },
        async ({ address, chain }) => {
            try {
                const { toolbox } = await getServices();
                
                // If address not provided, try to get from session storage
                let walletAddress = address;
                if (!walletAddress) {
                    walletAddress = await state.storage.get<string>("user_wallet_address");
                    if (!walletAddress) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        ok: false,
                                        error: "No wallet address provided and no wallet connected. Please provide an address or use 'connect_wallet' first.",
                                        suggestion: "Use 'connect_wallet' to connect your wallet, or provide an address parameter.",
                                    }),
                                },
                            ],
                        };
                    }
                }

                // Validate address format
                if (!walletAddress.startsWith("0x") || walletAddress.length !== 42) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "Invalid address format. Must be a valid Ethereum address (0x followed by 40 hex characters).",
                                }),
                            },
                        ],
                    };
                }

                const result = await toolbox.getWalletBalance(walletAddress, chain);
                
                if (!result.ok) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: result.error || "Failed to get wallet balance",
                                    details: `Chain: ${chain}, Address: ${walletAddress}`,
                                    usedConnectedWallet: !address,
                                }),
                            },
                        ],
                    };
                }

                // Transform result to match expected format
                // Thirdweb returns { result: [...] } but we want to show balance clearly
                if (result.data && result.data.result && result.data.result.length > 0) {
                    const balanceData = result.data.result[0]; // Get first chain result
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: true,
                                    data: {
                                        address: address,
                                        chainId: balanceData.chainId,
                                        balance: balanceData.value,
                                        displayValue: balanceData.displayValue,
                                        symbol: balanceData.symbol,
                                        name: balanceData.name,
                                        decimals: balanceData.decimals,
                                        tokenAddress: balanceData.tokenAddress,
                                    },
                                    raw: result.data,
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
                                data: result.data,
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
        "get_token_price",
        "Get current token price from CoinGecko",
        {
            token: z.string().describe("Token symbol (e.g. 'ethereum', 'bitcoin')"),
        },
        async ({ token }) => {
            try {
                const { coinGecko } = await getServices();
                const result = await coinGecko.getTokenPrice(token.toLowerCase());
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
                const { swapAgent } = await getServices();
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

                const swapContext = {
                    amount,
                    tokenIn,
                    tokenOut,
                    fromChain,
                    toChain,
                    sessionId: "mcp-session",
                };

                const routeResult = await swapAgent.findBestRoute(swapContext);
                
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
        "Monitor token price and set alert. Optionally trigger swap automatically when price is reached.",
        {
            token: z.string().describe("Token symbol to monitor"),
            targetPrice: z.number().describe("Target price to monitor"),
            condition: z.enum(["above", "below"]).describe("Alert condition: 'above' or 'below' target price"),
            autoSwap: z.boolean().optional().describe("If true, automatically trigger swap when price is reached"),
            swapAmount: z.string().optional().describe("Amount to swap (required if autoSwap is true)"),
            fromToken: z.string().optional().describe("Source token for swap (required if autoSwap is true)"),
            toToken: z.string().optional().describe("Destination token for swap (required if autoSwap is true)"),
            chain: z.string().optional().describe("Chain for swap (required if autoSwap is true, e.g. 'ethereum', 'bsc')"),
        },
        async ({ token, targetPrice, condition, autoSwap, swapAmount, fromToken, toToken, chain }) => {
            try {
                // Validate autoSwap parameters
                if (autoSwap) {
                    if (!swapAmount || !fromToken || !toToken || !chain) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        ok: false,
                                        error: "If autoSwap is true, swapAmount, fromToken, toToken, and chain are required.",
                                    }),
                                },
                            ],
                        };
                    }
                }

                // Get connected wallet for auto-swap
                let walletAddress: string | undefined;
                if (autoSwap) {
                    walletAddress = await state.storage.get<string>("user_wallet_address");
                    if (!walletAddress) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        ok: false,
                                        error: "No wallet connected. Please use 'connect_wallet' first to enable auto-swap.",
                                        suggestion: "Use 'connect_wallet' to connect your wallet before setting up auto-swap alerts.",
                                    }),
                                },
                            ],
                        };
                    }
                }

                const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const alert = {
                    id: alertId,
                    token,
                    targetPrice,
                    condition,
                    createdAt: Date.now(),
                    active: true,
                    autoSwap: autoSwap || false,
                    swapParams: autoSwap ? {
                        amount: swapAmount,
                        fromToken,
                        toToken,
                        chain,
                        walletAddress,
                    } : undefined,
                };

                const alerts = (await state.storage.get<any[]>("alerts")) || [];
                alerts.push(alert);
                await state.storage.put("alerts", alerts);

                // Set alarm to check prices periodically
                const currentAlarm = await state.storage.getAlarm();
                if (currentAlarm === null) {
                    // Check every 30 seconds
                    await state.storage.setAlarm(Date.now() + 30 * 1000);
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    alertId,
                                    message: autoSwap
                                        ? `Price alert set for ${token}: ${condition} $${targetPrice}. Swap will be triggered automatically when price is reached.`
                                        : `Price alert set for ${token}: ${condition} $${targetPrice}`,
                                    autoSwap: autoSwap || false,
                                    swapParams: autoSwap ? {
                                        amount: swapAmount,
                                        fromToken,
                                        toToken,
                                        chain,
                                    } : undefined,
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
        "get_portfolio",
        "Get wallet portfolio across multiple chains. If address is not provided, uses your connected wallet.",
        {
            address: z.string().optional().describe("Wallet address. If not provided, uses your connected wallet from connect_wallet."),
        },
        async ({ address }) => {
            try {
                const { toolbox } = await getServices();
                
                // If address not provided, try to get from session storage
                let walletAddress = address;
                if (!walletAddress) {
                    walletAddress = await state.storage.get<string>("user_wallet_address");
                    if (!walletAddress) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        ok: false,
                                        error: "No wallet address provided and no wallet connected. Please provide an address or use 'connect_wallet' first.",
                                        suggestion: "Use 'connect_wallet' to connect your wallet, or provide an address parameter.",
                                    }),
                                },
                            ],
                        };
                    }
                }

                const chains = ["ethereum", "bsc", "polygon", "avalanche"];
                const balances = await Promise.all(
                    chains.map(async (chain) => {
                        try {
                            const balance = await toolbox.getWalletBalance(walletAddress, chain);
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
                                    address: walletAddress,
                                    balances,
                                    usedConnectedWallet: !address,
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
                const { toolbox } = await getServices();
                
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

                const result = await toolbox.transferTokens({
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

    server.tool(
        "connect_wallet",
        "Connect your existing wallet address for this session. This allows the system to remember your wallet address and automatically use it for future operations like checking balances and tokens.",
        {
            address: z.string().describe("Your wallet address (0x...). Must be a valid Ethereum address."),
        },
        async ({ address }) => {
            try {
                const { toolbox } = await getServices();
                
                if (!toolbox.validateAddress(address)) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "Invalid wallet address format. Must be a valid Ethereum address (0x followed by 40 hex characters).",
                                }),
                            },
                        ],
                    };
                }

                // Save wallet address to Durable Object state for this session
                try {
                    await state.storage.put("user_wallet_address", walletAddress);
                    await state.storage.put("user_wallet_connected_at", Date.now());
                } catch (storageError) {
                    console.error("[connect_wallet] Failed to save wallet to storage:", storageError);
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "Failed to save wallet to session storage",
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
                                    address: walletAddress,
                                    message: "Wallet connected successfully! Your wallet is now saved for this session.",
                                    note: "Your wallet will be automatically used for future operations. You don't need to provide the address again.",
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
        "get_my_wallet",
        "Get your connected wallet address for this session. Returns the wallet address that was previously connected using connect_wallet.",
        {},
        async () => {
            try {
                const address = await state.storage.get<string>("user_wallet_address");
                const connectedAt = await state.storage.get<number>("user_wallet_connected_at");

                if (!address) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "No wallet connected. Please use 'connect_wallet' first to connect your wallet.",
                                    suggestion: "Use 'connect_wallet' to connect an existing wallet or create a new one.",
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
                                    address: address,
                                    connectedAt: connectedAt ? new Date(connectedAt).toISOString() : null,
                                    message: "Your wallet is connected and will be used automatically for operations.",
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
        "disconnect_wallet",
        "Disconnect and clear your wallet from this session. This will remove the saved wallet address and private key.",
        {},
        async () => {
            try {
                await state.storage.delete("user_wallet_address");
                await state.storage.delete("user_wallet_private_key");
                await state.storage.delete("user_wallet_connected_at");

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                message: "Wallet disconnected successfully. Your wallet information has been cleared from this session.",
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
        "interpret_query",
        "Interpret natural language query and automatically call the appropriate tool. Use this when user asks in natural language (e.g., 'tunjukkan saldo ETH saya', 'berapa harga bitcoin', 'swap 1 ETH ke USDC').",
        {
            query: z.string().describe("Natural language query from the user"),
        },
        async ({ query }) => {
            try {
                const { toolbox, coinGecko, swapAgent } = await getServices();
                
                // Initialize router agent with services
                const routerAgent = new NaturalLanguageRouterAgent({
                    server,
                    toolbox,
                    coinGecko,
                    swapAgent,
                });
                
                // Use router agent to interpret query
                const intent = await routerAgent.handleQuery(query);
                
                if (!intent) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "Could not interpret query. Please be more specific or use direct tool calls.",
                                    suggestion: "Try: 'check balance', 'get price', 'swap tokens', 'create wallet', etc.",
                                }),
                            },
                        ],
                    };
                }

                // Return the intent so the LLM can call the appropriate tool
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                intent: {
                                    tool: intent.tool,
                                    params: intent.params,
                                    confidence: intent.confidence,
                                },
                                message: `I understood your query. I'll call the ${intent.tool} tool with the following parameters: ${JSON.stringify(intent.params)}`,
                                instruction: `Please call the ${intent.tool} tool with these parameters: ${JSON.stringify(intent.params)}`,
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
}

