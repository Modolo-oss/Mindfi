import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ThirdwebToolboxService } from "./services/ThirdwebToolboxService.js";
import type { CoinGeckoService } from "./services/CoinGeckoService.js";
import type { SwapExecutionAgent } from "./agents/swap/SwapExecutionAgent.js";
import type { ThirdwebEngineService } from "./services/ThirdwebEngineService.js";
import type { DurableObjectState } from "@cloudflare/workers-types";
import { NaturalLanguageRouterAgent } from "./agents/router/NaturalLanguageRouterAgent.js";

interface ToolsContext {
    state: DurableObjectState;
    server: McpServer;
    getToolbox: () => ThirdwebToolboxService | undefined;
    getCoinGecko: () => CoinGeckoService | undefined;
    getSwapAgent: () => SwapExecutionAgent | undefined;
    getEngine: () => ThirdwebEngineService | undefined;
    ensureInit: () => Promise<void>;
}

export function setupServerTools(server: McpServer, context: ToolsContext): void {
    const { state, ensureInit, getToolbox, getCoinGecko, getSwapAgent, getEngine } = context;
    
    const getServices = async () => {
        await ensureInit();
        const toolbox = getToolbox();
        const coinGecko = getCoinGecko();
        const swapAgent = getSwapAgent();
        const engine = getEngine();
        if (!toolbox) throw new Error("ThirdwebToolboxService not initialized");
        if (!coinGecko) throw new Error("CoinGeckoService not initialized");
        if (!swapAgent) throw new Error("SwapExecutionAgent not initialized");
        if (!engine) throw new Error("ThirdwebEngineService not initialized");
        return { toolbox, coinGecko, swapAgent, engine };
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
                                        address: walletAddress,
                                        chainId: balanceData.chainId,
                                        balance: balanceData.value,
                                        displayValue: balanceData.displayValue,
                                        symbol: balanceData.symbol,
                                        name: balanceData.name,
                                        decimals: balanceData.decimals,
                                        tokenAddress: balanceData.tokenAddress,
                                        usedConnectedWallet: !address,
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
                                data: {
                                    address: walletAddress,
                                    usedConnectedWallet: !address,
                                    raw: result.data,
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
        "Swap tokens on a specific chain. Supports token symbols (ETH, USDC) or contract addresses. If a token is not found, provide its contract address.",
        {
            amount: z.string().describe("Amount of tokens to swap"),
            fromChain: z.string().describe("Source chain ID or name (e.g. 'ethereum', '1', 'bsc', '56')"),
            toChain: z.string().describe("Destination chain ID or name"),
            fromToken: z.string().describe("Source token symbol (e.g. 'USDC', 'ETH') or contract address (0x...)"),
            toToken: z.string().describe("Destination token symbol or contract address"),
        },
        async ({ amount, fromChain, toChain, fromToken, toToken }) => {
            try {
                const { swapAgent } = await getServices();
                
                // Use dynamic token resolution with Thirdweb API + cache fallback
                const tokenInResult = await swapAgent.resolveTokenDynamic(fromToken, fromChain);
                const tokenOutResult = await swapAgent.resolveTokenDynamic(toToken, toChain);
                
                // Check if tokens were resolved
                if (!tokenInResult.ok || !tokenInResult.token) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: tokenInResult.error || `Token ${fromToken} tidak ditemukan`,
                                    requiresContractAddress: tokenInResult.requiresContractAddress,
                                    hint: tokenInResult.requiresContractAddress 
                                        ? `Silakan berikan contract address untuk token ${fromToken} di chain ${fromChain}` 
                                        : undefined,
                                }),
                            },
                        ],
                    };
                }
                
                if (!tokenOutResult.ok || !tokenOutResult.token) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: tokenOutResult.error || `Token ${toToken} tidak ditemukan`,
                                    requiresContractAddress: tokenOutResult.requiresContractAddress,
                                    hint: tokenOutResult.requiresContractAddress 
                                        ? `Silakan berikan contract address untuk token ${toToken} di chain ${toChain}` 
                                        : undefined,
                                }),
                            },
                        ],
                    };
                }

                const swapContext = {
                    amount,
                    tokenIn: tokenInResult.token,
                    tokenOut: tokenOutResult.token,
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
                                    fromToken: {
                                        symbol: tokenInResult.token.symbol,
                                        name: tokenInResult.token.name,
                                        address: tokenInResult.token.address,
                                    },
                                    toToken: {
                                        symbol: tokenOutResult.token.symbol,
                                        name: tokenOutResult.token.name,
                                        address: tokenOutResult.token.address,
                                    },
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
        "Monitor token price and set alert. Optionally trigger swap automatically when price is reached using your trading wallet.",
        {
            token: z.string().describe("Token symbol to monitor (e.g. 'ethereum', 'bitcoin')"),
            targetPrice: z.number().describe("Target price in USD to monitor"),
            condition: z.enum(["above", "below"]).describe("Alert condition: 'above' or 'below' target price"),
            autoSwap: z.boolean().optional().describe("If true, automatically trigger swap when price is reached. Requires a trading wallet."),
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

                    // Check if trading wallet exists for autonomous execution
                    const tradingWallet = await state.storage.get<string>("trading_wallet_address");
                    if (!tradingWallet) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        ok: false,
                                        error: "No trading wallet found. Auto-swap requires a trading wallet.",
                                        suggestion: "Use 'create_trading_wallet' to create a backend trading wallet first, then deposit funds to it.",
                                        note: "Trading wallets are managed by the server and can execute trades automatically, even when you're offline.",
                                    }),
                                },
                            ],
                        };
                    }

                    // Resolve token addresses for autonomous execution
                    const { SwapExecutionAgent } = await import("./agents/swap/SwapExecutionAgent.js");
                    const tokenInResolved = SwapExecutionAgent.resolveToken(fromToken, chain);
                    const tokenOutResolved = SwapExecutionAgent.resolveToken(toToken, chain);

                    if (!tokenInResolved || !tokenOutResolved) {
                        return {
                            content: [
                                {
                                    type: "text",
                                    text: JSON.stringify({
                                        ok: false,
                                        error: `Could not resolve token addresses. fromToken: ${fromToken} (${tokenInResolved ? 'found' : 'not found'}), toToken: ${toToken} (${tokenOutResolved ? 'found' : 'not found'})`,
                                        suggestion: "Use standard token symbols like 'ETH', 'USDC', 'USDT', 'BNB', etc.",
                                    }),
                                },
                            ],
                        };
                    }

                    // Get fromToken price for accurate USD valuation
                    const { coinGecko } = await getServices();
                    
                    // Map common token symbols to CoinGecko IDs
                    const tokenToCoinGeckoId: Record<string, string> = {
                        'ETH': 'ethereum',
                        'WETH': 'ethereum',
                        'BTC': 'bitcoin',
                        'WBTC': 'wrapped-bitcoin',
                        'BNB': 'binancecoin',
                        'MATIC': 'matic-network',
                        'AVAX': 'avalanche-2',
                        'USDC': 'usd-coin',
                        'USDT': 'tether',
                        'DAI': 'dai',
                    };
                    
                    // Stablecoins are known to be $1 - safe to default
                    const knownStablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX'];
                    const isStablecoin = knownStablecoins.includes(fromToken.toUpperCase());
                    
                    let fromTokenPriceUsd: number;
                    if (isStablecoin) {
                        fromTokenPriceUsd = 1;
                    } else {
                        // Must fetch price for non-stablecoins to ensure accurate limit enforcement
                        const coinGeckoId = tokenToCoinGeckoId[fromToken.toUpperCase()];
                        if (!coinGeckoId) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: JSON.stringify({
                                            ok: false,
                                            error: `Unknown token: ${fromToken}. Cannot determine USD value for trading limits.`,
                                            suggestion: "Use common tokens like ETH, WETH, BTC, BNB, MATIC, AVAX, USDC, USDT, DAI.",
                                        }),
                                    },
                                ],
                            };
                        }
                        
                        try {
                            const priceData = await coinGecko.getTokenPrice(coinGeckoId);
                            if (!priceData.priceUsd || priceData.priceUsd <= 0) {
                                return {
                                    content: [
                                        {
                                            type: "text",
                                            text: JSON.stringify({
                                                ok: false,
                                                error: `Could not fetch price for ${fromToken}. Auto-swap requires verified USD valuation.`,
                                                suggestion: "Try again later or use a different token.",
                                            }),
                                        },
                                    ],
                                };
                            }
                            fromTokenPriceUsd = priceData.priceUsd;
                        } catch (priceError) {
                            return {
                                content: [
                                    {
                                        type: "text",
                                        text: JSON.stringify({
                                            ok: false,
                                            error: `Failed to get ${fromToken} price: ${priceError instanceof Error ? priceError.message : String(priceError)}`,
                                            suggestion: "Price data is required for auto-swap to enforce trading limits. Try again later.",
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
                        autoSwap: true,
                        retryCount: 0,
                        maxRetries: 3,
                        swapParams: {
                            amount: swapAmount,
                            fromToken,
                            toToken,
                            fromTokenAddress: tokenInResolved.address,
                            toTokenAddress: tokenOutResolved.address,
                            fromTokenPriceUsd,
                            chain,
                        },
                    };

                    const alerts = (await state.storage.get<any[]>("alerts")) || [];
                    alerts.push(alert);
                    await state.storage.put("alerts", alerts);

                    // Set alarm to check prices periodically
                    const currentAlarm = await state.storage.getAlarm();
                    if (currentAlarm === null) {
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
                                        message: `Price alert set for ${token}: ${condition} $${targetPrice}. Swap will be executed automatically using your trading wallet when price is reached.`,
                                        autoSwap: true,
                                        tradingWallet,
                                        swapParams: {
                                            amount: swapAmount,
                                            fromToken,
                                            toToken,
                                            fromTokenAddress: tokenInResolved.address,
                                            toTokenAddress: tokenOutResolved.address,
                                            chain,
                                        },
                                        autonomousNote: "This alert will run in the background and execute automatically, even when ChatGPT/Claude is offline.",
                                    },
                                }),
                            },
                        ],
                    };
                }

                // Non-autoSwap alert (simple price notification)
                const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const alert = {
                    id: alertId,
                    token,
                    targetPrice,
                    condition,
                    createdAt: Date.now(),
                    active: true,
                    autoSwap: false,
                };

                const alerts = (await state.storage.get<any[]>("alerts")) || [];
                alerts.push(alert);
                await state.storage.put("alerts", alerts);

                // Set alarm to check prices periodically
                const currentAlarm = await state.storage.getAlarm();
                if (currentAlarm === null) {
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
                                    message: `Price alert set for ${token}: ${condition} $${targetPrice}`,
                                    autoSwap: false,
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
                    await state.storage.put("user_wallet_address", address);
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
                                    address: address,
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

    server.tool(
        "create_trading_wallet",
        "Create a new backend trading wallet for autonomous trading. This wallet is managed by the server and can execute trades automatically when price conditions are met. You must deposit funds to this wallet before it can trade.",
        {
            label: z.string().optional().describe("Optional label for the wallet (e.g. 'My Trading Bot')"),
        },
        async ({ label }) => {
            try {
                const { engine } = await getServices();
                
                const existingWallet = await state.storage.get<string>("trading_wallet_address");
                if (existingWallet) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "You already have a trading wallet.",
                                    existingWallet: existingWallet,
                                    suggestion: "Use 'get_trading_wallet' to see your existing wallet, or 'delete_trading_wallet' to remove it first.",
                                }),
                            },
                        ],
                    };
                }

                const walletLabel = label || `MindFi-Trading-${Date.now()}`;
                const result = await engine.createBackendWallet(walletLabel, "local");
                
                if (!result.ok || !result.wallet) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: result.error || "Failed to create trading wallet",
                                }),
                            },
                        ],
                    };
                }

                await state.storage.put("trading_wallet_address", result.wallet.walletAddress);
                await state.storage.put("trading_wallet_label", walletLabel);
                await state.storage.put("trading_wallet_created_at", Date.now());
                await state.storage.put("trading_wallet_daily_tx_count", 0);
                await state.storage.put("trading_wallet_daily_volume_usd", 0);
                await state.storage.put("trading_wallet_last_tx_time", 0);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    walletAddress: result.wallet.walletAddress,
                                    label: walletLabel,
                                    message: "Trading wallet created successfully!",
                                    nextSteps: [
                                        `1. Deposit funds to ${result.wallet.walletAddress}`,
                                        "2. Set up price alerts with autoSwap enabled",
                                        "3. The wallet will automatically execute trades when conditions are met",
                                    ],
                                    securityInfo: {
                                        maxTransactionUsd: 1000,
                                        maxDailyTransactions: 10,
                                        maxDailyVolumeUsd: 5000,
                                        cooldownSeconds: 60,
                                    },
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
        "get_trading_wallet",
        "Get your trading wallet address and balance. Shows the backend wallet used for autonomous trading.",
        {
            chain: z.string().optional().describe("Chain to check balance on (default: ethereum)"),
        },
        async ({ chain }) => {
            try {
                const { engine } = await getServices();
                
                const walletAddress = await state.storage.get<string>("trading_wallet_address");
                const walletLabel = await state.storage.get<string>("trading_wallet_label");
                const createdAt = await state.storage.get<number>("trading_wallet_created_at");
                const dailyTxCount = await state.storage.get<number>("trading_wallet_daily_tx_count") || 0;
                const dailyVolumeUsd = await state.storage.get<number>("trading_wallet_daily_volume_usd") || 0;

                if (!walletAddress) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "No trading wallet found.",
                                    suggestion: "Use 'create_trading_wallet' to create a new trading wallet.",
                                }),
                            },
                        ],
                    };
                }

                const balanceResult = await engine.getWalletBalance(walletAddress, chain || "ethereum");

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    walletAddress,
                                    label: walletLabel,
                                    createdAt: createdAt ? new Date(createdAt).toISOString() : null,
                                    balances: balanceResult.ok ? balanceResult.balances : [],
                                    balanceError: balanceResult.ok ? undefined : balanceResult.error,
                                    dailyStats: {
                                        transactionCount: dailyTxCount,
                                        volumeUsd: dailyVolumeUsd,
                                        remainingTransactions: 10 - dailyTxCount,
                                        remainingVolumeUsd: 5000 - dailyVolumeUsd,
                                    },
                                    depositAddress: walletAddress,
                                    depositNote: "Send tokens to this address to fund your trading wallet",
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
        "get_trading_limits",
        "Get current trading limits and usage for your trading wallet. Shows remaining daily limits and cooldown status.",
        {},
        async () => {
            try {
                const { engine } = await getServices();
                
                const walletAddress = await state.storage.get<string>("trading_wallet_address");
                if (!walletAddress) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "No trading wallet found.",
                                    suggestion: "Use 'create_trading_wallet' first.",
                                }),
                            },
                        ],
                    };
                }

                const dailyTxCount = await state.storage.get<number>("trading_wallet_daily_tx_count") || 0;
                const dailyVolumeUsd = await state.storage.get<number>("trading_wallet_daily_volume_usd") || 0;
                const lastTxTime = await state.storage.get<number>("trading_wallet_last_tx_time") || 0;
                
                const limits = engine.getDefaultLimits();
                const now = Date.now();
                const cooldownRemaining = Math.max(0, (limits.cooldownSeconds * 1000) - (now - lastTxTime));

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    limits: {
                                        maxTransactionValueUsd: limits.maxTransactionValueUsd,
                                        maxDailyTransactions: limits.maxDailyTransactions,
                                        maxDailyVolumeUsd: limits.maxDailyVolumeUsd,
                                        cooldownSeconds: limits.cooldownSeconds,
                                    },
                                    usage: {
                                        dailyTransactions: dailyTxCount,
                                        dailyVolumeUsd: dailyVolumeUsd,
                                        lastTransactionTime: lastTxTime ? new Date(lastTxTime).toISOString() : null,
                                    },
                                    remaining: {
                                        transactions: limits.maxDailyTransactions - dailyTxCount,
                                        volumeUsd: limits.maxDailyVolumeUsd - dailyVolumeUsd,
                                        cooldownSeconds: Math.ceil(cooldownRemaining / 1000),
                                    },
                                    canTrade: cooldownRemaining === 0 && dailyTxCount < limits.maxDailyTransactions,
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
        "list_active_alerts",
        "List all active price monitoring alerts. Shows which alerts are set up and their auto-swap configurations.",
        {},
        async () => {
            try {
                const alerts = (await state.storage.get<any[]>("alerts")) || [];
                const activeAlerts = alerts.filter((a: any) => a.active === true);
                const triggeredAlerts = alerts.filter((a: any) => a.active === false && a.triggeredAt);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    activeCount: activeAlerts.length,
                                    triggeredCount: triggeredAlerts.length,
                                    activeAlerts: activeAlerts.map((a: any) => ({
                                        id: a.id,
                                        token: a.token,
                                        condition: a.condition,
                                        targetPrice: a.targetPrice,
                                        autoSwap: a.autoSwap,
                                        swapParams: a.autoSwap ? {
                                            amount: a.swapParams?.amount,
                                            fromToken: a.swapParams?.fromToken,
                                            toToken: a.swapParams?.toToken,
                                            chain: a.swapParams?.chain,
                                        } : undefined,
                                        createdAt: new Date(a.createdAt).toISOString(),
                                    })),
                                    recentlyTriggered: triggeredAlerts.slice(-5).map((a: any) => ({
                                        id: a.id,
                                        token: a.token,
                                        targetPrice: a.targetPrice,
                                        triggeredPrice: a.triggeredPrice,
                                        triggeredAt: new Date(a.triggeredAt).toISOString(),
                                        swapExecuted: a.swapExecuted || false,
                                        swapError: a.swapError,
                                    })),
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
        "cancel_alert",
        "Cancel an active price monitoring alert by its ID.",
        {
            alertId: z.string().describe("The ID of the alert to cancel"),
        },
        async ({ alertId }) => {
            try {
                const alerts = (await state.storage.get<any[]>("alerts")) || [];
                const alertIndex = alerts.findIndex((a: any) => a.id === alertId);

                if (alertIndex === -1) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "Alert not found.",
                                    suggestion: "Use 'list_active_alerts' to see available alerts.",
                                }),
                            },
                        ],
                    };
                }

                alerts[alertIndex].active = false;
                alerts[alertIndex].cancelledAt = Date.now();
                await state.storage.put("alerts", alerts);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                message: `Alert ${alertId} has been cancelled.`,
                                cancelledAlert: {
                                    id: alerts[alertIndex].id,
                                    token: alerts[alertIndex].token,
                                    targetPrice: alerts[alertIndex].targetPrice,
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
        "schedule_dca",
        "Schedule Dollar Cost Averaging (DCA) - recurring token purchases at fixed intervals. Uses trading wallet for autonomous execution.",
        {
            token: z.string().describe("Token to buy (e.g. 'ETH', 'BTC')"),
            amount: z.string().describe("Amount to spend per purchase in source token (e.g. '100' USDC)"),
            fromToken: z.string().describe("Token to spend (e.g. 'USDC', 'USDT')"),
            interval: z.enum(["hourly", "daily", "weekly", "monthly"]).describe("Purchase interval"),
            chain: z.string().optional().describe("Chain for swaps (default: 'ethereum')"),
            totalPurchases: z.number().optional().describe("Total number of purchases (default: unlimited)"),
        },
        async ({ token, amount, fromToken, interval, chain = "ethereum", totalPurchases }) => {
            try {
                const tradingWallet = await state.storage.get<string>("trading_wallet_address");
                if (!tradingWallet) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "No trading wallet found. Create one first with 'create_trading_wallet'.",
                                }),
                            },
                        ],
                    };
                }

                const { SwapExecutionAgent } = await import("./agents/swap/SwapExecutionAgent.js");
                const tokenInResolved = SwapExecutionAgent.resolveToken(fromToken, chain);
                const tokenOutResolved = SwapExecutionAgent.resolveToken(token, chain);

                if (!tokenInResolved || !tokenOutResolved) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: `Could not resolve token addresses. fromToken: ${fromToken}, toToken: ${token}`,
                                }),
                            },
                        ],
                    };
                }

                const { coinGecko } = await getServices();
                const knownStablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX'];
                const isStablecoin = knownStablecoins.includes(fromToken.toUpperCase());
                let fromTokenPriceUsd = isStablecoin ? 1 : 0;

                if (!isStablecoin) {
                    const tokenToCoinGeckoId: Record<string, string> = {
                        'ETH': 'ethereum', 'WETH': 'ethereum', 'BTC': 'bitcoin', 'WBTC': 'wrapped-bitcoin',
                        'BNB': 'binancecoin', 'MATIC': 'matic-network', 'AVAX': 'avalanche-2',
                    };
                    const coinGeckoId = tokenToCoinGeckoId[fromToken.toUpperCase()];
                    if (!coinGeckoId) {
                        return {
                            content: [{ type: "text", text: JSON.stringify({ ok: false, error: `Unknown token: ${fromToken}` }) }],
                        };
                    }
                    const priceData = await coinGecko.getTokenPrice(coinGeckoId);
                    fromTokenPriceUsd = priceData.priceUsd || 0;
                }

                const intervalMs = {
                    hourly: 60 * 60 * 1000,
                    daily: 24 * 60 * 60 * 1000,
                    weekly: 7 * 24 * 60 * 60 * 1000,
                    monthly: 30 * 24 * 60 * 60 * 1000,
                }[interval];

                const dcaId = `dca_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const dcaSchedule = {
                    id: dcaId,
                    token,
                    fromToken,
                    amount,
                    interval,
                    intervalMs,
                    chain,
                    fromTokenAddress: tokenInResolved.address,
                    toTokenAddress: tokenOutResolved.address,
                    fromTokenPriceUsd,
                    totalPurchases: totalPurchases || null,
                    completedPurchases: 0,
                    active: true,
                    createdAt: Date.now(),
                    nextExecutionAt: Date.now() + intervalMs,
                    lastExecutedAt: null,
                };

                const dcaSchedules = (await state.storage.get<any[]>("dca_schedules")) || [];
                dcaSchedules.push(dcaSchedule);
                await state.storage.put("dca_schedules", dcaSchedules);

                await state.storage.setAlarm(Date.now() + 30 * 1000);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                message: `DCA schedule created! Will buy ${token} with ${amount} ${fromToken} every ${interval}.`,
                                schedule: {
                                    id: dcaId,
                                    token,
                                    fromToken,
                                    amount,
                                    interval,
                                    chain,
                                    nextExecution: new Date(dcaSchedule.nextExecutionAt).toISOString(),
                                    totalPurchases: totalPurchases || "unlimited",
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [
                        { type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) },
                    ],
                };
            }
        }
    );

    server.tool(
        "cancel_dca",
        "Cancel a DCA (Dollar Cost Averaging) schedule by its ID.",
        {
            dcaId: z.string().describe("The ID of the DCA schedule to cancel"),
        },
        async ({ dcaId }) => {
            try {
                const dcaSchedules = (await state.storage.get<any[]>("dca_schedules")) || [];
                const dcaIndex = dcaSchedules.findIndex((d: any) => d.id === dcaId);

                if (dcaIndex === -1) {
                    return {
                        content: [
                            { type: "text", text: JSON.stringify({ ok: false, error: "DCA schedule not found." }) },
                        ],
                    };
                }

                dcaSchedules[dcaIndex].active = false;
                dcaSchedules[dcaIndex].cancelledAt = Date.now();
                await state.storage.put("dca_schedules", dcaSchedules);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                message: `DCA schedule ${dcaId} has been cancelled.`,
                                cancelledSchedule: {
                                    id: dcaSchedules[dcaIndex].id,
                                    token: dcaSchedules[dcaIndex].token,
                                    completedPurchases: dcaSchedules[dcaIndex].completedPurchases,
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "list_dca_schedules",
        "List all DCA (Dollar Cost Averaging) schedules - both active and completed.",
        {},
        async () => {
            try {
                const dcaSchedules = (await state.storage.get<any[]>("dca_schedules")) || [];
                const activeSchedules = dcaSchedules.filter((d: any) => d.active);
                const completedSchedules = dcaSchedules.filter((d: any) => !d.active);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    activeCount: activeSchedules.length,
                                    completedCount: completedSchedules.length,
                                    active: activeSchedules.map((d: any) => ({
                                        id: d.id,
                                        token: d.token,
                                        fromToken: d.fromToken,
                                        amount: d.amount,
                                        interval: d.interval,
                                        completedPurchases: d.completedPurchases,
                                        totalPurchases: d.totalPurchases || "unlimited",
                                        nextExecution: d.nextExecutionAt ? new Date(d.nextExecutionAt).toISOString() : null,
                                    })),
                                    completed: completedSchedules.slice(-5).map((d: any) => ({
                                        id: d.id,
                                        token: d.token,
                                        completedPurchases: d.completedPurchases,
                                        cancelledAt: d.cancelledAt ? new Date(d.cancelledAt).toISOString() : null,
                                    })),
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "set_stop_loss",
        "Set a stop-loss order to automatically sell a token when price drops below a threshold. Uses trading wallet.",
        {
            token: z.string().describe("Token to sell (e.g. 'ETH', 'BTC')"),
            triggerPrice: z.number().describe("Price threshold to trigger sell (USD)"),
            amount: z.string().describe("Amount of token to sell"),
            sellFor: z.string().optional().describe("Token to receive (default: 'USDC')"),
            chain: z.string().optional().describe("Chain for swap (default: 'ethereum')"),
        },
        async ({ token, triggerPrice, amount, sellFor = "USDC", chain = "ethereum" }) => {
            try {
                const tradingWallet = await state.storage.get<string>("trading_wallet_address");
                if (!tradingWallet) {
                    return {
                        content: [
                            { type: "text", text: JSON.stringify({ ok: false, error: "No trading wallet found. Create one first." }) },
                        ],
                    };
                }

                const { SwapExecutionAgent } = await import("./agents/swap/SwapExecutionAgent.js");
                const tokenInResolved = SwapExecutionAgent.resolveToken(token, chain);
                const tokenOutResolved = SwapExecutionAgent.resolveToken(sellFor, chain);

                if (!tokenInResolved || !tokenOutResolved) {
                    return {
                        content: [
                            { type: "text", text: JSON.stringify({ ok: false, error: `Could not resolve token addresses.` }) },
                        ],
                    };
                }

                const { coinGecko } = await getServices();
                const tokenToCoinGeckoId: Record<string, string> = {
                    'ETH': 'ethereum', 'WETH': 'ethereum', 'BTC': 'bitcoin', 'WBTC': 'wrapped-bitcoin',
                    'BNB': 'binancecoin', 'MATIC': 'matic-network', 'AVAX': 'avalanche-2',
                    'USDC': 'usd-coin', 'USDT': 'tether', 'DAI': 'dai',
                };
                const coinGeckoId = tokenToCoinGeckoId[token.toUpperCase()];
                if (!coinGeckoId) {
                    return {
                        content: [{ type: "text", text: JSON.stringify({ ok: false, error: `Unknown token: ${token}` }) }],
                    };
                }
                const priceData = await coinGecko.getTokenPrice(coinGeckoId);
                const currentPrice = priceData.priceUsd;

                const stopLossId = `sl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                const stopLoss = {
                    id: stopLossId,
                    type: "stop_loss",
                    token,
                    triggerPrice,
                    amount,
                    sellFor,
                    chain,
                    fromTokenAddress: tokenInResolved.address,
                    toTokenAddress: tokenOutResolved.address,
                    fromTokenPriceUsd: currentPrice,
                    active: true,
                    createdAt: Date.now(),
                    retryCount: 0,
                    maxRetries: 3,
                };

                const alerts = (await state.storage.get<any[]>("alerts")) || [];
                alerts.push({
                    ...stopLoss,
                    condition: "below",
                    targetPrice: triggerPrice,
                    autoSwap: true,
                    swapParams: {
                        amount,
                        fromToken: token,
                        toToken: sellFor,
                        fromTokenAddress: tokenInResolved.address,
                        toTokenAddress: tokenOutResolved.address,
                        fromTokenPriceUsd: currentPrice,
                        chain,
                    },
                });
                await state.storage.put("alerts", alerts);
                await state.storage.setAlarm(Date.now() + 30 * 1000);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                message: `Stop-loss set! Will sell ${amount} ${token} if price drops below $${triggerPrice}.`,
                                stopLoss: {
                                    id: stopLossId,
                                    token,
                                    triggerPrice,
                                    currentPrice,
                                    amount,
                                    sellFor,
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "set_take_profit",
        "Set a take-profit order to automatically sell a token when price rises above a threshold. Uses trading wallet.",
        {
            token: z.string().describe("Token to sell (e.g. 'ETH', 'BTC')"),
            triggerPrice: z.number().describe("Price threshold to trigger sell (USD)"),
            amount: z.string().describe("Amount of token to sell"),
            sellFor: z.string().optional().describe("Token to receive (default: 'USDC')"),
            chain: z.string().optional().describe("Chain for swap (default: 'ethereum')"),
        },
        async ({ token, triggerPrice, amount, sellFor = "USDC", chain = "ethereum" }) => {
            try {
                const tradingWallet = await state.storage.get<string>("trading_wallet_address");
                if (!tradingWallet) {
                    return {
                        content: [{ type: "text", text: JSON.stringify({ ok: false, error: "No trading wallet found." }) }],
                    };
                }

                const { SwapExecutionAgent } = await import("./agents/swap/SwapExecutionAgent.js");
                const tokenInResolved = SwapExecutionAgent.resolveToken(token, chain);
                const tokenOutResolved = SwapExecutionAgent.resolveToken(sellFor, chain);

                if (!tokenInResolved || !tokenOutResolved) {
                    return {
                        content: [{ type: "text", text: JSON.stringify({ ok: false, error: `Could not resolve token addresses.` }) }],
                    };
                }

                const { coinGecko } = await getServices();
                const tokenToCoinGeckoId: Record<string, string> = {
                    'ETH': 'ethereum', 'WETH': 'ethereum', 'BTC': 'bitcoin', 'WBTC': 'wrapped-bitcoin',
                    'BNB': 'binancecoin', 'MATIC': 'matic-network', 'AVAX': 'avalanche-2',
                    'USDC': 'usd-coin', 'USDT': 'tether', 'DAI': 'dai',
                };
                const coinGeckoId = tokenToCoinGeckoId[token.toUpperCase()];
                if (!coinGeckoId) {
                    return {
                        content: [{ type: "text", text: JSON.stringify({ ok: false, error: `Unknown token: ${token}` }) }],
                    };
                }
                const priceData = await coinGecko.getTokenPrice(coinGeckoId);
                const currentPrice = priceData.priceUsd;

                const takeProfitId = `tp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

                const alerts = (await state.storage.get<any[]>("alerts")) || [];
                alerts.push({
                    id: takeProfitId,
                    type: "take_profit",
                    token,
                    triggerPrice,
                    condition: "above",
                    targetPrice: triggerPrice,
                    amount,
                    sellFor,
                    chain,
                    fromTokenAddress: tokenInResolved.address,
                    toTokenAddress: tokenOutResolved.address,
                    fromTokenPriceUsd: currentPrice,
                    active: true,
                    createdAt: Date.now(),
                    retryCount: 0,
                    maxRetries: 3,
                    autoSwap: true,
                    swapParams: {
                        amount,
                        fromToken: token,
                        toToken: sellFor,
                        fromTokenAddress: tokenInResolved.address,
                        toTokenAddress: tokenOutResolved.address,
                        fromTokenPriceUsd: currentPrice,
                        chain,
                    },
                });
                await state.storage.put("alerts", alerts);
                await state.storage.setAlarm(Date.now() + 30 * 1000);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                message: `Take-profit set! Will sell ${amount} ${token} if price rises above $${triggerPrice}.`,
                                takeProfit: {
                                    id: takeProfitId,
                                    token,
                                    triggerPrice,
                                    currentPrice,
                                    amount,
                                    sellFor,
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "get_transaction_history",
        "Get history of executed swaps and transactions from this session.",
        {
            limit: z.number().optional().describe("Maximum number of transactions to return (default: 20)"),
        },
        async ({ limit = 20 }) => {
            try {
                const alerts = (await state.storage.get<any[]>("alerts")) || [];
                const dcaSchedules = (await state.storage.get<any[]>("dca_schedules")) || [];

                const executedAlerts = alerts.filter((a: any) => a.swapExecuted || a.triggeredAt);
                const executedDCAs = dcaSchedules.filter((d: any) => d.lastExecutedAt);

                const transactions = [
                    ...executedAlerts.map((a: any) => ({
                        type: a.type || "price_alert",
                        id: a.id,
                        token: a.token,
                        amount: a.swapParams?.amount,
                        fromToken: a.swapParams?.fromToken,
                        toToken: a.swapParams?.toToken,
                        triggeredPrice: a.triggeredPrice,
                        executedAt: a.triggeredAt,
                        success: a.swapExecuted || false,
                        error: a.swapError,
                        transactionId: a.transactionId,
                    })),
                    ...executedDCAs.map((d: any) => ({
                        type: "dca",
                        id: d.id,
                        token: d.token,
                        amount: d.amount,
                        fromToken: d.fromToken,
                        completedPurchases: d.completedPurchases,
                        lastExecutedAt: d.lastExecutedAt,
                    })),
                ]
                    .sort((a, b) => (b.executedAt || b.lastExecutedAt || 0) - (a.executedAt || a.lastExecutedAt || 0))
                    .slice(0, limit);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    count: transactions.length,
                                    transactions: transactions.map((t: any) => ({
                                        ...t,
                                        executedAt: t.executedAt ? new Date(t.executedAt).toISOString() : null,
                                        lastExecutedAt: t.lastExecutedAt ? new Date(t.lastExecutedAt).toISOString() : null,
                                    })),
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "get_global_market",
        "Get global cryptocurrency market data including total market cap, BTC dominance, and 24h volume.",
        {},
        async () => {
            try {
                const { coinGecko } = await getServices();
                const globalData = await coinGecko.getGlobalMarket();

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    totalMarketCap: `$${(globalData.totalMarketCap / 1e12).toFixed(2)}T`,
                                    totalMarketCapRaw: globalData.totalMarketCap,
                                    totalVolume24h: `$${(globalData.totalVolume24h / 1e9).toFixed(2)}B`,
                                    totalVolume24hRaw: globalData.totalVolume24h,
                                    btcDominance: `${globalData.btcDominance.toFixed(2)}%`,
                                    ethDominance: `${globalData.ethDominance.toFixed(2)}%`,
                                    marketCapChange24h: `${globalData.marketCapChange24h.toFixed(2)}%`,
                                    activeCryptocurrencies: globalData.activeCryptocurrencies,
                                    markets: globalData.markets,
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "get_token_chart",
        "Get historical price, market cap, and volume chart data for a token.",
        {
            token: z.string().describe("Token symbol or CoinGecko ID (e.g. 'ETH', 'bitcoin')"),
            days: z.number().optional().describe("Number of days of data (default: 30, max: 365)"),
        },
        async ({ token, days = 30 }) => {
            try {
                const { coinGecko } = await getServices();
                const tokenToCoinGeckoId: Record<string, string> = {
                    'ETH': 'ethereum', 'BTC': 'bitcoin', 'BNB': 'binancecoin',
                    'MATIC': 'matic-network', 'AVAX': 'avalanche-2', 'SOL': 'solana',
                    'USDC': 'usd-coin', 'USDT': 'tether', 'DAI': 'dai',
                };
                const tokenId = tokenToCoinGeckoId[token.toUpperCase()] || token.toLowerCase();
                const chartData = await coinGecko.getTokenMarketChart(tokenId, Math.min(days, 365));

                const latestPrice = chartData.prices[chartData.prices.length - 1];
                const firstPrice = chartData.prices[0];
                const priceChange = ((latestPrice.price - firstPrice.price) / firstPrice.price) * 100;

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    token: token.toUpperCase(),
                                    tokenId,
                                    days,
                                    currentPrice: latestPrice.price,
                                    priceChange: `${priceChange.toFixed(2)}%`,
                                    dataPoints: chartData.prices.length,
                                    priceRange: {
                                        high: Math.max(...chartData.prices.map(p => p.price)),
                                        low: Math.min(...chartData.prices.map(p => p.price)),
                                    },
                                    recentPrices: chartData.prices.slice(-5).map(p => ({
                                        date: new Date(p.timestamp).toISOString(),
                                        price: p.price,
                                    })),
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "get_token_ohlcv",
        "Get OHLCV (Open, High, Low, Close, Volume) candlestick data for a token.",
        {
            token: z.string().describe("Token symbol or CoinGecko ID (e.g. 'ETH', 'bitcoin')"),
            days: z.number().optional().describe("Number of days (1, 7, 14, 30, 90, 180, 365). Default: 14"),
        },
        async ({ token, days = 14 }) => {
            try {
                const { coinGecko } = await getServices();
                const tokenToCoinGeckoId: Record<string, string> = {
                    'ETH': 'ethereum', 'BTC': 'bitcoin', 'BNB': 'binancecoin',
                    'MATIC': 'matic-network', 'AVAX': 'avalanche-2', 'SOL': 'solana',
                };
                const tokenId = tokenToCoinGeckoId[token.toUpperCase()] || token.toLowerCase();
                const ohlcvData = await coinGecko.getTokenOHLCV(tokenId, days);

                const latestCandle = ohlcvData.ohlcv[ohlcvData.ohlcv.length - 1];
                const highestHigh = Math.max(...ohlcvData.ohlcv.map(c => c.high));
                const lowestLow = Math.min(...ohlcvData.ohlcv.map(c => c.low));

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    token: token.toUpperCase(),
                                    tokenId,
                                    days,
                                    candleCount: ohlcvData.ohlcv.length,
                                    latest: {
                                        date: new Date(latestCandle.timestamp).toISOString(),
                                        open: latestCandle.open,
                                        high: latestCandle.high,
                                        low: latestCandle.low,
                                        close: latestCandle.close,
                                    },
                                    range: {
                                        highestHigh,
                                        lowestLow,
                                    },
                                    recentCandles: ohlcvData.ohlcv.slice(-5).map(c => ({
                                        date: new Date(c.timestamp).toISOString(),
                                        open: c.open,
                                        high: c.high,
                                        low: c.low,
                                        close: c.close,
                                    })),
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "get_token_approvals",
        "Check token spending approvals for a wallet address. Shows which contracts can spend your tokens.",
        {
            address: z.string().optional().describe("Wallet address to check (uses connected wallet if not provided)"),
            chain: z.string().optional().describe("Chain to check (default: 'ethereum')"),
        },
        async ({ address, chain = "ethereum" }) => {
            try {
                let walletAddress = address;
                if (!walletAddress) {
                    walletAddress = await state.storage.get<string>("user_wallet_address");
                    if (!walletAddress) {
                        walletAddress = await state.storage.get<string>("trading_wallet_address");
                    }
                }

                if (!walletAddress) {
                    return {
                        content: [
                            { type: "text", text: JSON.stringify({ ok: false, error: "No wallet address provided or connected." }) },
                        ],
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                message: "Token approval checking requires indexer API integration.",
                                data: {
                                    wallet: walletAddress,
                                    chain,
                                    note: "For comprehensive approval data, use Etherscan/block explorer or revoke.cash",
                                    suggestion: "Connect to revoke.cash or use Thirdweb dashboard to manage approvals.",
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "revoke_approval",
        "Revoke a token spending approval for a specific contract.",
        {
            tokenAddress: z.string().describe("Token contract address to revoke approval for"),
            spenderAddress: z.string().describe("Contract address that currently has approval"),
            chain: z.string().optional().describe("Chain (default: 'ethereum')"),
        },
        async ({ tokenAddress, spenderAddress, chain = "ethereum" }) => {
            try {
                const tradingWallet = await state.storage.get<string>("trading_wallet_address");
                if (!tradingWallet) {
                    return {
                        content: [
                            { type: "text", text: JSON.stringify({ ok: false, error: "No trading wallet found. Create one first." }) },
                        ],
                    };
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                message: "Revoke approval functionality requires direct contract interaction.",
                                data: {
                                    tokenAddress,
                                    spenderAddress,
                                    chain,
                                    suggestion: "Use Thirdweb Engine or revoke.cash to revoke token approvals.",
                                    note: "This would set the approval amount to 0 for the specified spender.",
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    // ==================== AI STRATEGY TOOLS ====================

    server.tool(
        "get_market_conditions",
        "Analyze current market conditions including volatility, 24h changes, volume spikes. Useful for AI to make strategy recommendations.",
        {
            tokens: z.array(z.string()).optional().describe("List of tokens to analyze (default: BTC, ETH, BNB). Max 10 tokens."),
        },
        async ({ tokens = ["bitcoin", "ethereum", "binancecoin"] }) => {
            try {
                const { coinGecko } = await getServices();
                
                // Limit to 10 tokens
                const tokensToAnalyze = tokens.slice(0, 10);
                
                // Map common symbols to CoinGecko IDs
                const symbolToId: Record<string, string> = {
                    'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin',
                    'SOL': 'solana', 'MATIC': 'matic-network', 'AVAX': 'avalanche-2',
                    'USDC': 'usd-coin', 'USDT': 'tether', 'DAI': 'dai',
                    'LINK': 'chainlink', 'UNI': 'uniswap', 'AAVE': 'aave',
                };
                
                const tokenIds = tokensToAnalyze.map(t => symbolToId[t.toUpperCase()] || t.toLowerCase());
                
                // Get global market data
                const globalData = await coinGecko.getGlobalMarket();
                
                // Get individual token prices
                const tokenPrices = await coinGecko.getMultipleTokenPrices(tokenIds);
                
                // Calculate market metrics
                const tokenAnalysis = Object.entries(tokenPrices).map(([id, data]) => {
                    const volatilityLevel = Math.abs(data.change24h) > 10 ? 'high' : 
                                           Math.abs(data.change24h) > 5 ? 'medium' : 'low';
                    const volumeToMcap = data.volume24h && data.marketCap ? 
                                        (data.volume24h / data.marketCap * 100) : 0;
                    const volumeSpike = volumeToMcap > 15 ? 'high' : volumeToMcap > 8 ? 'medium' : 'normal';
                    
                    return {
                        token: data.symbol,
                        coingeckoId: id,
                        price: data.priceUsd,
                        change24h: data.change24h,
                        marketCap: data.marketCap,
                        volume24h: data.volume24h,
                        volatilityLevel,
                        volumeToMcapRatio: volumeToMcap.toFixed(2) + '%',
                        volumeSpike,
                        sentiment: data.change24h > 5 ? 'bullish' : data.change24h < -5 ? 'bearish' : 'neutral',
                    };
                });
                
                // Overall market sentiment
                const avgChange = tokenAnalysis.reduce((sum, t) => sum + (t.change24h || 0), 0) / tokenAnalysis.length;
                const highVolatilityCount = tokenAnalysis.filter(t => t.volatilityLevel === 'high').length;
                
                const marketSentiment = avgChange > 3 ? 'bullish' : avgChange < -3 ? 'bearish' : 'neutral';
                const marketVolatility = highVolatilityCount > tokenAnalysis.length / 2 ? 'high' : 
                                        highVolatilityCount > tokenAnalysis.length / 4 ? 'medium' : 'low';

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    timestamp: new Date().toISOString(),
                                    globalMarket: {
                                        totalMarketCap: globalData.totalMarketCap,
                                        totalVolume24h: globalData.totalVolume24h,
                                        btcDominance: globalData.btcDominance.toFixed(2) + '%',
                                        ethDominance: globalData.ethDominance.toFixed(2) + '%',
                                        marketCapChange24h: globalData.marketCapChange24h.toFixed(2) + '%',
                                    },
                                    overallConditions: {
                                        sentiment: marketSentiment,
                                        volatility: marketVolatility,
                                        averageChange24h: avgChange.toFixed(2) + '%',
                                        recommendation: marketVolatility === 'high' 
                                            ? 'High volatility - consider reducing DCA amounts or pausing' 
                                            : marketSentiment === 'bearish' 
                                            ? 'Bearish conditions - potential buying opportunity for DCA' 
                                            : 'Stable conditions - normal DCA execution recommended',
                                    },
                                    tokens: tokenAnalysis,
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "get_portfolio_health",
        "Analyze portfolio health including risk score, diversification metrics, and asset exposure. Requires connected wallet or trading wallet.",
        {
            address: z.string().optional().describe("Wallet address to analyze (uses connected wallet if not provided)"),
        },
        async ({ address }) => {
            try {
                const { toolbox } = await getServices();
                
                // Get wallet address
                let walletAddress = address;
                if (!walletAddress) {
                    walletAddress = await state.storage.get<string>("user_wallet_address");
                    if (!walletAddress) {
                        walletAddress = await state.storage.get<string>("trading_wallet_address");
                    }
                }

                if (!walletAddress) {
                    return {
                        content: [
                            { type: "text", text: JSON.stringify({ ok: false, error: "No wallet address provided or connected." }) },
                        ],
                    };
                }

                // Get multi-chain portfolio by querying balances across chains
                const chains = ["ethereum", "bsc", "polygon", "avalanche"];
                const balanceResults = await Promise.all(
                    chains.map(async (chain) => {
                        try {
                            const balance = await toolbox.getWalletBalance(walletAddress!, chain);
                            return { chain, balance, ok: balance.ok };
                        } catch (e) {
                            return { chain, balance: null, ok: false, error: String(e) };
                        }
                    })
                );
                
                // Build portfolio from balance results
                const holdings: any[] = [];
                for (const result of balanceResults) {
                    if (result.ok && result.balance?.data?.result) {
                        const balanceData = result.balance.data.result[0];
                        if (balanceData && parseFloat(balanceData.displayValue || '0') > 0) {
                            holdings.push({
                                symbol: balanceData.symbol || 'UNKNOWN',
                                name: balanceData.name,
                                valueUsd: parseFloat(balanceData.displayValue || '0') * (balanceData.priceUsd || 0),
                                chainId: result.chain,
                                balance: balanceData.displayValue,
                            });
                        }
                    }
                }
                
                if (holdings.length === 0) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: true,
                                    data: {
                                        wallet: walletAddress,
                                        totalValue: 0,
                                        riskScore: 0,
                                        diversificationScore: 0,
                                        recommendation: "Portfolio is empty. Consider adding assets.",
                                    },
                                }),
                            },
                        ],
                    };
                }

                // Calculate portfolio metrics
                const totalValue = holdings.reduce((sum: number, h: any) => sum + (h.valueUsd || 0), 0);
                
                // Asset allocation analysis
                const allocation = holdings.map((h: any) => ({
                    token: h.symbol || h.name,
                    value: h.valueUsd || 0,
                    percentage: totalValue > 0 ? ((h.valueUsd || 0) / totalValue * 100) : 0,
                    chain: h.chainId || 'unknown',
                })).sort((a: any, b: any) => b.value - a.value);

                // Diversification score (0-100)
                // Higher is better - penalize concentration in single asset
                const topAssetPercentage = allocation[0]?.percentage || 0;
                const uniqueAssets = new Set(allocation.map((a: any) => a.token)).size;
                const uniqueChains = new Set(allocation.map((a: any) => a.chain)).size;
                
                let diversificationScore = 100;
                if (topAssetPercentage > 80) diversificationScore -= 40;
                else if (topAssetPercentage > 60) diversificationScore -= 25;
                else if (topAssetPercentage > 40) diversificationScore -= 10;
                
                diversificationScore += Math.min(uniqueAssets * 5, 20);
                diversificationScore += Math.min(uniqueChains * 10, 20);
                diversificationScore = Math.max(0, Math.min(100, diversificationScore));

                // Risk score (0-100, lower is safer)
                // Stablecoins reduce risk, volatile assets increase
                const stablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX'];
                const stablecoinValue = holdings
                    .filter((h: any) => stablecoins.includes((h.symbol || '').toUpperCase()))
                    .reduce((sum: number, h: any) => sum + (h.valueUsd || 0), 0);
                const stablecoinPercentage = totalValue > 0 ? (stablecoinValue / totalValue * 100) : 0;
                
                let riskScore = 50; // Base risk
                riskScore -= stablecoinPercentage * 0.4; // Stablecoins reduce risk
                riskScore += topAssetPercentage * 0.3; // Concentration increases risk
                riskScore -= Math.min(uniqueChains * 5, 15); // Multi-chain reduces risk
                riskScore = Math.max(0, Math.min(100, riskScore));

                // Generate recommendations
                const recommendations: string[] = [];
                if (topAssetPercentage > 60) {
                    recommendations.push(`High concentration in ${allocation[0].token} (${topAssetPercentage.toFixed(1)}%). Consider diversifying.`);
                }
                if (stablecoinPercentage < 10 && totalValue > 1000) {
                    recommendations.push('Low stablecoin allocation. Consider holding 10-20% in stables for stability.');
                }
                if (uniqueChains === 1 && totalValue > 5000) {
                    recommendations.push('Single-chain exposure. Consider multi-chain diversification.');
                }
                if (riskScore > 70) {
                    recommendations.push('High risk portfolio. Consider rebalancing to reduce volatility exposure.');
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    wallet: walletAddress,
                                    timestamp: new Date().toISOString(),
                                    summary: {
                                        totalValueUsd: totalValue,
                                        assetCount: uniqueAssets,
                                        chainCount: uniqueChains,
                                        stablecoinPercentage: stablecoinPercentage.toFixed(1) + '%',
                                    },
                                    scores: {
                                        riskScore: Math.round(riskScore),
                                        riskLevel: riskScore > 70 ? 'high' : riskScore > 40 ? 'medium' : 'low',
                                        diversificationScore: Math.round(diversificationScore),
                                        diversificationLevel: diversificationScore > 70 ? 'good' : diversificationScore > 40 ? 'moderate' : 'poor',
                                    },
                                    topHoldings: allocation.slice(0, 5),
                                    recommendations,
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "get_dca_opportunities",
        "Analyze market conditions to identify optimal DCA (Dollar Cost Averaging) opportunities. Detects dips, low volatility periods, and event-aware signals.",
        {
            token: z.string().describe("Token to analyze for DCA opportunities (e.g. 'ETH', 'BTC')"),
            currentDcaAmount: z.number().optional().describe("Current DCA amount in USD to adjust recommendations"),
        },
        async ({ token, currentDcaAmount = 100 }) => {
            try {
                const { coinGecko } = await getServices();
                
                // Map common symbols
                const symbolToId: Record<string, string> = {
                    'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin',
                    'SOL': 'solana', 'MATIC': 'matic-network', 'AVAX': 'avalanche-2',
                };
                const tokenId = symbolToId[token.toUpperCase()] || token.toLowerCase();
                
                // Get current price and historical data
                const currentPrice = await coinGecko.getTokenPrice(tokenId);
                const chartData = await coinGecko.getTokenMarketChart(tokenId, 30);
                const ohlcvData = await coinGecko.getTokenOHLCV(tokenId, 14);
                
                // Calculate metrics
                const prices = chartData.prices.map(p => p.price);
                const avgPrice30d = prices.reduce((a, b) => a + b, 0) / prices.length;
                const maxPrice30d = Math.max(...prices);
                const minPrice30d = Math.min(...prices);
                
                // Price position in 30d range (0 = at low, 100 = at high)
                const priceRange = maxPrice30d - minPrice30d;
                const pricePosition = priceRange > 0 ? ((currentPrice.priceUsd - minPrice30d) / priceRange * 100) : 50;
                
                // Volatility from OHLCV
                const dailyRanges = ohlcvData.ohlcv.map(c => (c.high - c.low) / c.low * 100);
                const avgVolatility = dailyRanges.reduce((a, b) => a + b, 0) / dailyRanges.length;
                
                // Recent trend (last 7 days)
                const recentPrices = prices.slice(-7);
                const weekAgoPrice = recentPrices[0];
                const weeklyChange = ((currentPrice.priceUsd - weekAgoPrice) / weekAgoPrice * 100);
                
                // DCA opportunity scoring
                let opportunityScore = 50; // Base score
                
                // Price position - lower is better for DCA
                if (pricePosition < 20) opportunityScore += 30;
                else if (pricePosition < 40) opportunityScore += 20;
                else if (pricePosition < 60) opportunityScore += 5;
                else if (pricePosition > 80) opportunityScore -= 20;
                
                // Volatility - moderate is ideal
                if (avgVolatility > 8) opportunityScore -= 15; // Too volatile
                else if (avgVolatility < 2) opportunityScore += 10; // Very stable
                
                // Recent dip detection
                if (currentPrice.change24h < -10) opportunityScore += 25;
                else if (currentPrice.change24h < -5) opportunityScore += 15;
                else if (currentPrice.change24h > 10) opportunityScore -= 10;
                
                opportunityScore = Math.max(0, Math.min(100, opportunityScore));
                
                // Generate recommendation
                let action: 'boost' | 'normal' | 'pause' | 'skip';
                let dcaMultiplier = 1;
                let reasoning: string;
                
                if (opportunityScore >= 75) {
                    action = 'boost';
                    dcaMultiplier = 1.5;
                    reasoning = 'Excellent DCA opportunity - price is low with potential dip detected';
                } else if (opportunityScore >= 50) {
                    action = 'normal';
                    dcaMultiplier = 1;
                    reasoning = 'Normal market conditions - proceed with regular DCA';
                } else if (opportunityScore >= 30) {
                    action = 'pause';
                    dcaMultiplier = 0.5;
                    reasoning = 'Elevated prices or high volatility - consider reducing DCA amount';
                } else {
                    action = 'skip';
                    dcaMultiplier = 0;
                    reasoning = 'Poor conditions for DCA - price near highs or extreme volatility';
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    token: token.toUpperCase(),
                                    timestamp: new Date().toISOString(),
                                    currentPrice: currentPrice.priceUsd,
                                    analysis: {
                                        pricePosition: pricePosition.toFixed(1) + '% of 30d range',
                                        avgPrice30d,
                                        priceVsAvg: ((currentPrice.priceUsd / avgPrice30d - 1) * 100).toFixed(2) + '%',
                                        avgVolatility14d: avgVolatility.toFixed(2) + '%',
                                        weeklyChange: weeklyChange.toFixed(2) + '%',
                                        change24h: currentPrice.change24h.toFixed(2) + '%',
                                    },
                                    opportunity: {
                                        score: opportunityScore,
                                        level: opportunityScore >= 75 ? 'excellent' : opportunityScore >= 50 ? 'good' : opportunityScore >= 30 ? 'fair' : 'poor',
                                        action,
                                        dcaMultiplier,
                                        suggestedAmount: (currentDcaAmount * dcaMultiplier).toFixed(2),
                                        reasoning,
                                    },
                                    events: {
                                        dipDetected: currentPrice.change24h < -5,
                                        volatilitySpike: avgVolatility > 8,
                                        nearMonthlyLow: pricePosition < 20,
                                        nearMonthlyHigh: pricePosition > 80,
                                    },
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "get_liquidation_risk",
        "Analyze potential liquidation risk for leveraged positions. Note: Currently provides analysis framework - actual position data requires DEX integration.",
        {
            token: z.string().describe("Token being traded (e.g. 'ETH', 'BTC')"),
            entryPrice: z.number().describe("Entry price of the position"),
            currentAmount: z.number().describe("Amount of tokens in position"),
            leverage: z.number().optional().describe("Leverage multiplier (default: 1 for spot)"),
            isLong: z.boolean().optional().describe("True for long, false for short (default: true)"),
        },
        async ({ token, entryPrice, currentAmount, leverage = 1, isLong = true }) => {
            try {
                const { coinGecko } = await getServices();
                
                // Map common symbols
                const symbolToId: Record<string, string> = {
                    'BTC': 'bitcoin', 'ETH': 'ethereum', 'BNB': 'binancecoin',
                    'SOL': 'solana', 'MATIC': 'matic-network', 'AVAX': 'avalanche-2',
                };
                const tokenId = symbolToId[token.toUpperCase()] || token.toLowerCase();
                
                // Get current price
                const currentPrice = await coinGecko.getTokenPrice(tokenId);
                
                // Calculate position metrics
                const positionValue = currentAmount * currentPrice.priceUsd;
                const entryValue = currentAmount * entryPrice;
                const pnl = isLong ? positionValue - entryValue : entryValue - positionValue;
                const pnlPercent = (pnl / entryValue) * 100;
                const leveragedPnlPercent = pnlPercent * leverage;
                
                // Calculate liquidation price (simplified - actual varies by protocol)
                // Assuming 80% loss triggers liquidation for leveraged positions
                const maintenanceMargin = 0.8;
                let liquidationPrice: number | null = null;
                let distanceToLiquidation = Infinity;
                
                if (leverage > 1) {
                    if (isLong) {
                        liquidationPrice = entryPrice * (1 - maintenanceMargin / leverage);
                        distanceToLiquidation = ((currentPrice.priceUsd - liquidationPrice) / currentPrice.priceUsd) * 100;
                    } else {
                        liquidationPrice = entryPrice * (1 + maintenanceMargin / leverage);
                        distanceToLiquidation = ((liquidationPrice - currentPrice.priceUsd) / currentPrice.priceUsd) * 100;
                    }
                }
                
                // Risk assessment
                let riskLevel: 'safe' | 'moderate' | 'high' | 'critical';
                let recommendations: string[] = [];
                
                if (leverage === 1) {
                    riskLevel = 'safe';
                    recommendations.push('Spot position - no liquidation risk');
                } else if (distanceToLiquidation > 30) {
                    riskLevel = 'safe';
                    recommendations.push('Position is healthy with good margin');
                } else if (distanceToLiquidation > 15) {
                    riskLevel = 'moderate';
                    recommendations.push('Monitor position - consider reducing leverage');
                    recommendations.push('Set stop-loss above liquidation price');
                } else if (distanceToLiquidation > 5) {
                    riskLevel = 'high';
                    recommendations.push('WARNING: Position approaching liquidation');
                    recommendations.push('Consider adding margin or closing position');
                    recommendations.push('Set immediate stop-loss');
                } else {
                    riskLevel = 'critical';
                    recommendations.push('CRITICAL: Liquidation imminent');
                    recommendations.push('Add margin immediately or close position');
                }
                
                // Check for upcoming volatility
                if (Math.abs(currentPrice.change24h) > 10) {
                    recommendations.push(`High 24h volatility (${currentPrice.change24h.toFixed(2)}%) - increased liquidation risk`);
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    token: token.toUpperCase(),
                                    timestamp: new Date().toISOString(),
                                    position: {
                                        type: isLong ? 'LONG' : 'SHORT',
                                        leverage: leverage + 'x',
                                        entryPrice,
                                        currentPrice: currentPrice.priceUsd,
                                        amount: currentAmount,
                                        positionValueUsd: positionValue,
                                    },
                                    pnl: {
                                        unrealizedPnl: pnl,
                                        pnlPercent: pnlPercent.toFixed(2) + '%',
                                        leveragedPnlPercent: leveragedPnlPercent.toFixed(2) + '%',
                                    },
                                    liquidation: {
                                        liquidationPrice: liquidationPrice !== null ? liquidationPrice.toFixed(4) : 'N/A (spot)',
                                        distanceToLiquidation: distanceToLiquidation !== Infinity ? distanceToLiquidation.toFixed(2) + '%' : 'N/A',
                                        riskLevel,
                                    },
                                    marketConditions: {
                                        change24h: currentPrice.change24h.toFixed(2) + '%',
                                        volatilityWarning: Math.abs(currentPrice.change24h) > 10,
                                    },
                                    recommendations,
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "set_target_allocation",
        "Define target portfolio allocation for auto-rebalancing. Specify target percentages for each asset.",
        {
            allocations: z.array(z.object({
                token: z.string().describe("Token symbol (e.g. 'ETH', 'BTC', 'USDC')"),
                targetPercentage: z.number().describe("Target percentage allocation (0-100)"),
                chain: z.string().optional().describe("Preferred chain for this token"),
            })).describe("Array of target allocations"),
        },
        async ({ allocations }) => {
            try {
                // Validate total equals 100%
                const totalPercentage = allocations.reduce((sum, a) => sum + a.targetPercentage, 0);
                if (Math.abs(totalPercentage - 100) > 0.01) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: `Target allocations must sum to 100%. Current total: ${totalPercentage.toFixed(2)}%`,
                                }),
                            },
                        ],
                    };
                }

                // Store target allocation
                const targetAllocation = {
                    allocations,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                };
                
                await state.storage.put("target_allocation", targetAllocation);

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    message: "Target allocation saved successfully",
                                    allocation: allocations.map(a => ({
                                        token: a.token.toUpperCase(),
                                        target: a.targetPercentage + '%',
                                        chain: a.chain || 'any',
                                    })),
                                    createdAt: new Date().toISOString(),
                                    note: "Use 'get_rebalance_suggestion' to see how your portfolio compares to this target.",
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "get_rebalance_suggestion",
        "Compare current portfolio to target allocation and calculate rebalancing trades needed.",
        {
            address: z.string().optional().describe("Wallet address (uses connected wallet if not provided)"),
        },
        async ({ address }) => {
            try {
                const { toolbox, coinGecko } = await getServices();
                
                // Get wallet address
                let walletAddress = address;
                if (!walletAddress) {
                    walletAddress = await state.storage.get<string>("user_wallet_address");
                    if (!walletAddress) {
                        walletAddress = await state.storage.get<string>("trading_wallet_address");
                    }
                }

                if (!walletAddress) {
                    return {
                        content: [
                            { type: "text", text: JSON.stringify({ ok: false, error: "No wallet address provided or connected." }) },
                        ],
                    };
                }

                // Get target allocation
                const targetAllocation = await state.storage.get<{
                    allocations: Array<{ token: string; targetPercentage: number; chain?: string }>;
                }>("target_allocation");

                if (!targetAllocation) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "No target allocation set. Use 'set_target_allocation' first.",
                                }),
                            },
                        ],
                    };
                }

                // Get current portfolio by querying balances across chains
                const chains = ["ethereum", "bsc", "polygon", "avalanche"];
                const balanceResults = await Promise.all(
                    chains.map(async (chain) => {
                        try {
                            const balance = await toolbox.getWalletBalance(walletAddress!, chain);
                            return { chain, balance, ok: balance.ok };
                        } catch (e) {
                            return { chain, balance: null, ok: false, error: String(e) };
                        }
                    })
                );
                
                const holdings: any[] = [];
                for (const result of balanceResults) {
                    if (result.ok && result.balance?.data?.result) {
                        const balanceData = result.balance.data.result[0];
                        if (balanceData && parseFloat(balanceData.displayValue || '0') > 0) {
                            holdings.push({
                                symbol: balanceData.symbol || 'UNKNOWN',
                                name: balanceData.name,
                                valueUsd: parseFloat(balanceData.displayValue || '0') * (balanceData.priceUsd || 0),
                                chainId: result.chain,
                                balance: balanceData.displayValue,
                            });
                        }
                    }
                }
                
                const totalValue = holdings.reduce((sum: number, h: any) => sum + (h.valueUsd || 0), 0);

                if (totalValue === 0) {
                    return {
                        content: [
                            { type: "text", text: JSON.stringify({ ok: false, error: "Portfolio is empty" }) },
                        ],
                    };
                }

                // Calculate current allocation
                const currentAllocation: Record<string, { value: number; percentage: number }> = {};
                holdings.forEach((h: any) => {
                    const symbol = (h.symbol || '').toUpperCase();
                    if (!currentAllocation[symbol]) {
                        currentAllocation[symbol] = { value: 0, percentage: 0 };
                    }
                    currentAllocation[symbol].value += h.valueUsd || 0;
                    currentAllocation[symbol].percentage = (currentAllocation[symbol].value / totalValue) * 100;
                });

                // Calculate rebalancing trades
                const trades: Array<{
                    action: 'buy' | 'sell';
                    token: string;
                    amountUsd: number;
                    currentPercentage: string;
                    targetPercentage: string;
                    deviation: string;
                }> = [];

                let totalDeviation = 0;

                for (const target of targetAllocation.allocations) {
                    const symbol = target.token.toUpperCase();
                    const current = currentAllocation[symbol] || { value: 0, percentage: 0 };
                    const targetValue = (target.targetPercentage / 100) * totalValue;
                    const difference = targetValue - current.value;
                    const deviation = Math.abs(target.targetPercentage - current.percentage);
                    totalDeviation += deviation;

                    if (Math.abs(difference) > 10) { // Only suggest trades > $10
                        trades.push({
                            action: difference > 0 ? 'buy' : 'sell',
                            token: symbol,
                            amountUsd: Math.abs(difference),
                            currentPercentage: current.percentage.toFixed(2) + '%',
                            targetPercentage: target.targetPercentage + '%',
                            deviation: deviation.toFixed(2) + '%',
                        });
                    }
                }

                // Check for assets not in target (should sell)
                for (const [symbol, data] of Object.entries(currentAllocation)) {
                    const hasTarget = targetAllocation.allocations.some(
                        a => a.token.toUpperCase() === symbol
                    );
                    if (!hasTarget && data.value > 10) {
                        trades.push({
                            action: 'sell',
                            token: symbol,
                            amountUsd: data.value,
                            currentPercentage: data.percentage.toFixed(2) + '%',
                            targetPercentage: '0%',
                            deviation: data.percentage.toFixed(2) + '%',
                        });
                        totalDeviation += data.percentage;
                    }
                }

                // Sort by deviation (largest first)
                trades.sort((a, b) => parseFloat(b.deviation) - parseFloat(a.deviation));

                const needsRebalance = totalDeviation > 5; // 5% threshold

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    wallet: walletAddress,
                                    timestamp: new Date().toISOString(),
                                    portfolio: {
                                        totalValueUsd: totalValue,
                                        assetCount: Object.keys(currentAllocation).length,
                                    },
                                    analysis: {
                                        totalDeviation: totalDeviation.toFixed(2) + '%',
                                        needsRebalance,
                                        rebalanceUrgency: totalDeviation > 20 ? 'high' : totalDeviation > 10 ? 'medium' : 'low',
                                    },
                                    comparison: targetAllocation.allocations.map(t => ({
                                        token: t.token.toUpperCase(),
                                        target: t.targetPercentage + '%',
                                        current: (currentAllocation[t.token.toUpperCase()]?.percentage || 0).toFixed(2) + '%',
                                        deviation: Math.abs(t.targetPercentage - (currentAllocation[t.token.toUpperCase()]?.percentage || 0)).toFixed(2) + '%',
                                    })),
                                    suggestedTrades: trades,
                                    recommendation: needsRebalance 
                                        ? `Portfolio deviates ${totalDeviation.toFixed(1)}% from target. Consider executing ${trades.length} rebalancing trades.`
                                        : 'Portfolio is within acceptable range of target allocation.',
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );

    server.tool(
        "enable_auto_rebalance",
        "Enable automatic portfolio rebalancing when allocation drifts beyond threshold.",
        {
            enabled: z.boolean().describe("Enable or disable auto-rebalancing"),
            thresholdPercent: z.number().optional().describe("Deviation threshold to trigger rebalance (default: 10%)"),
            intervalHours: z.number().optional().describe("Check interval in hours (default: 24)"),
            maxTradePercent: z.number().optional().describe("Maximum % of portfolio to trade per rebalance (default: 20%)"),
        },
        async ({ enabled, thresholdPercent = 10, intervalHours = 24, maxTradePercent = 20 }) => {
            try {
                // Check for trading wallet
                const tradingWallet = await state.storage.get<string>("trading_wallet_address");
                if (enabled && !tradingWallet) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "Auto-rebalance requires a trading wallet. Use 'create_trading_wallet' first.",
                                }),
                            },
                        ],
                    };
                }

                // Check for target allocation
                const targetAllocation = await state.storage.get("target_allocation");
                if (enabled && !targetAllocation) {
                    return {
                        content: [
                            {
                                type: "text",
                                text: JSON.stringify({
                                    ok: false,
                                    error: "No target allocation set. Use 'set_target_allocation' first.",
                                }),
                            },
                        ],
                    };
                }

                // Store auto-rebalance settings
                const settings = {
                    enabled,
                    thresholdPercent,
                    intervalHours,
                    maxTradePercent,
                    updatedAt: Date.now(),
                    lastRebalanceAt: null,
                };
                
                await state.storage.put("auto_rebalance_settings", settings);

                // Set alarm for periodic checking if enabled
                if (enabled) {
                    const currentAlarm = await state.storage.getAlarm();
                    if (currentAlarm === null) {
                        await state.storage.setAlarm(Date.now() + intervalHours * 60 * 60 * 1000);
                    }
                }

                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                ok: true,
                                data: {
                                    message: enabled ? "Auto-rebalancing enabled" : "Auto-rebalancing disabled",
                                    settings: {
                                        enabled,
                                        thresholdPercent: thresholdPercent + '%',
                                        checkInterval: intervalHours + ' hours',
                                        maxTradePerRebalance: maxTradePercent + '%',
                                    },
                                    tradingWallet: tradingWallet || 'N/A',
                                    note: enabled 
                                        ? "Portfolio will be checked periodically and rebalanced when deviation exceeds threshold."
                                        : "Auto-rebalancing is now disabled.",
                                },
                            }),
                        },
                    ],
                };
            } catch (error) {
                return {
                    content: [{ type: "text", text: JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }) }],
                };
            }
        }
    );
}

