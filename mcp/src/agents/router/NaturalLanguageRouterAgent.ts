import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ThirdwebToolboxService } from "../../services/ThirdwebToolboxService.js";
import type { CoinGeckoService } from "../../services/CoinGeckoService.js";
import type { SwapExecutionAgent } from "../swap/SwapExecutionAgent.js";

export interface RouterContext {
    server: McpServer;
    toolbox: ThirdwebToolboxService;
    coinGecko: CoinGeckoService;
    swapAgent: SwapExecutionAgent;
}

export interface QueryIntent {
    tool: string;
    params: Record<string, unknown>;
    confidence: number;
}

/**
 * Natural Language Router Agent
 * Interprets natural language queries and maps them to MCP tools
 */
export class NaturalLanguageRouterAgent {
    constructor(private ctx: RouterContext) {}

    /**
     * Handle natural language query and return tool intent
     */
    async handleQuery(input: string): Promise<QueryIntent | null> {
        const lowerInput = input.toLowerCase().trim();

        // Extract wallet address if present
        const walletAddressMatch = lowerInput.match(/0x[a-f0-9]{40}/i);
        const walletAddress = walletAddressMatch ? walletAddressMatch[0] : null;

        // Extract chain name
        const chainMatch = lowerInput.match(/\b(ethereum|eth|bsc|binance|polygon|matic|avalanche|avax|arbitrum|optimism|base)\b/i);
        const chain = chainMatch ? this.normalizeChain(chainMatch[1]) : "ethereum";

        // Extract token symbol
        const tokenMatch = lowerInput.match(/\b(eth|btc|bitcoin|usdc|usdt|dai|matic|bnb|avax|tao|bittensor)\b/i);
        const token = tokenMatch ? this.normalizeToken(tokenMatch[1]) : null;

        // Extract amount
        const amountMatch = lowerInput.match(/(\d+\.?\d*)\s*(eth|btc|usdc|usdt|dai|matic|bnb|avax|tao)?/i);
        const amount = amountMatch ? amountMatch[1] : null;

        // Intent detection patterns
        if (this.matchesPattern(lowerInput, ["balance", "saldo", "cek saldo", "check balance", "berapa", "how much", "my balance", "saldo saya"])) {
            // If wallet address found, use it; otherwise let tool use connected wallet
            if (walletAddress) {
                return {
                    tool: "get_wallet_balance",
                    params: {
                        address: walletAddress,
                        chain: chain,
                    },
                    confidence: 0.9,
                };
            }
            // No address provided - tool will use connected wallet automatically
            return {
                tool: "get_wallet_balance",
                params: {
                    chain: chain,
                },
                confidence: 0.7,
            };
        }

        if (this.matchesPattern(lowerInput, ["price", "harga", "berapa harga", "what's the price", "nilai"])) {
            if (token) {
                return {
                    tool: "get_token_price",
                    params: {
                        token: token,
                    },
                    confidence: 0.9,
                };
            }
            return {
                tool: "get_token_price",
                params: {
                    token: "ethereum", // Default
                },
                confidence: 0.6,
            };
        }

        if (this.matchesPattern(lowerInput, ["swap", "tukar", "exchange", "convert", "convertir"])) {
            if (amount && token) {
                // Try to extract from/to tokens
                const fromToken = token;
                const toToken = this.extractToToken(lowerInput) || "usdc";
                
                return {
                    tool: "swap_tokens",
                    params: {
                        amount: amount,
                        fromChain: chain,
                        toChain: chain,
                        fromToken: fromToken,
                        toToken: toToken,
                    },
                    confidence: 0.8,
                };
            }
            return {
                tool: "swap_tokens",
                params: {
                    amount: "1",
                    fromChain: chain,
                    toChain: chain,
                    fromToken: "eth",
                    toToken: "usdc",
                },
                confidence: 0.5,
            };
        }

        if (this.matchesPattern(lowerInput, ["portfolio", "portofolio", "all balances", "semua saldo", "my portfolio", "portofolio saya"])) {
            // If wallet address found, use it; otherwise let tool use connected wallet
            if (walletAddress) {
                return {
                    tool: "get_portfolio",
                    params: {
                        address: walletAddress,
                    },
                    confidence: 0.9,
                };
            }
            // No address provided - tool will use connected wallet automatically
            return {
                tool: "get_portfolio",
                params: {},
                confidence: 0.7,
            };
        }

        if (this.matchesPattern(lowerInput, ["connect wallet", "connect", "import wallet", "save wallet", "simpan wallet", "hubungkan wallet"])) {
            return {
                tool: "connect_wallet",
                params: {},
                confidence: 0.9,
            };
        }

        if (this.matchesPattern(lowerInput, ["my wallet", "wallet saya", "get wallet", "show wallet", "tunjukkan wallet"])) {
            return {
                tool: "get_my_wallet",
                params: {},
                confidence: 0.9,
            };
        }

        if (this.matchesPattern(lowerInput, ["disconnect", "disconnect wallet", "clear wallet", "hapus wallet"])) {
            return {
                tool: "disconnect_wallet",
                params: {},
                confidence: 0.9,
            };
        }

        if (this.matchesPattern(lowerInput, ["transfer", "kirim", "send", "transferir"])) {
            if (amount && walletAddress) {
                const toAddress = this.extractToAddress(lowerInput) || walletAddress;
                return {
                    tool: "transfer_tokens",
                    params: {
                        toAddress: toAddress,
                        amount: amount,
                        token: token || "eth",
                        chain: chain,
                    },
                    confidence: 0.8,
                };
            }
        }

        if (this.matchesPattern(lowerInput, ["monitor", "alert", "notify", "watch", "pantau", "swap when", "tukar ketika"])) {
            if (token && amount) {
                const condition = this.matchesPattern(lowerInput, ["above", "lebih", "diatas"]) ? "above" : "below";
                
                // Check if user wants auto-swap
                const wantsAutoSwap = this.matchesPattern(lowerInput, ["swap", "tukar", "auto", "otomatis", "when", "ketika"]);
                
                if (wantsAutoSwap) {
                    // Try to extract swap parameters
                    const swapAmount = this.extractAmount(lowerInput) || "1";
                    const toToken = this.extractToToken(lowerInput) || "usdc";
                    
                    return {
                        tool: "monitor_price",
                        params: {
                            token: token,
                            targetPrice: parseFloat(amount),
                            condition: condition,
                            autoSwap: true,
                            swapAmount: swapAmount,
                            fromToken: token,
                            toToken: toToken,
                            chain: "ethereum", // Default, can be improved
                        },
                        confidence: 0.7,
                    };
                }
                
                return {
                    tool: "monitor_price",
                    params: {
                        token: token,
                        targetPrice: parseFloat(amount),
                        condition: condition,
                    },
                    confidence: 0.8,
                };
            }
        }

        if (this.matchesPattern(lowerInput, ["create wallet", "buat wallet", "new wallet", "wallet baru"])) {
            return {
                tool: "create_wallet",
                params: {},
                confidence: 0.9,
            };
        }

        // No match found
        return null;
    }

    /**
     * Check if input matches any of the patterns
     */
    private matchesPattern(input: string, patterns: string[]): boolean {
        return patterns.some(pattern => input.includes(pattern.toLowerCase()));
    }

    /**
     * Normalize chain name
     */
    private normalizeChain(chain: string): string {
        const chainMap: Record<string, string> = {
            "eth": "ethereum",
            "ethereum": "ethereum",
            "bsc": "bsc",
            "binance": "bsc",
            "polygon": "polygon",
            "matic": "polygon",
            "avalanche": "avalanche",
            "avax": "avalanche",
            "arbitrum": "arbitrum",
            "optimism": "optimism",
            "base": "base",
        };
        return chainMap[chain.toLowerCase()] || chain.toLowerCase();
    }

    /**
     * Normalize token symbol
     */
    private normalizeToken(token: string): string {
        const tokenMap: Record<string, string> = {
            "eth": "ethereum",
            "btc": "bitcoin",
            "bitcoin": "bitcoin",
            "usdc": "usdc",
            "usdt": "usdt",
            "dai": "dai",
            "matic": "polygon",
            "bnb": "binancecoin",
            "avax": "avalanche-2",
            "tao": "bittensor",
            "bittensor": "bittensor",
        };
        return tokenMap[token.toLowerCase()] || token.toLowerCase();
    }

    /**
     * Extract "to" token from swap query
     */
    private extractToToken(input: string): string | null {
        const patterns = [
            /to\s+(\w+)/i,
            /ke\s+(\w+)/i,
            /menjadi\s+(\w+)/i,
            /convert\s+to\s+(\w+)/i,
        ];
        
        for (const pattern of patterns) {
            const match = input.match(pattern);
            if (match) {
                return this.normalizeToken(match[1]);
            }
        }
        return null;
    }

    /**
     * Extract recipient address from transfer query
     */
    private extractToAddress(input: string): string | null {
        const addressMatch = input.match(/0x[a-f0-9]{40}/gi);
        if (addressMatch && addressMatch.length > 0) {
            // Return the last address (likely the recipient)
            return addressMatch[addressMatch.length - 1];
        }
        return null;
    }

    /**
     * Extract amount from query
     */
    private extractAmount(input: string): string | null {
        const amountMatch = input.match(/(\d+\.?\d*)\s*(eth|btc|usdc|usdt|dai|matic|bnb|avax|tao)?/i);
        if (amountMatch) {
            return amountMatch[1];
        }
        return null;
    }
}

