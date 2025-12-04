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
}

