import { McpHonoServerDO } from "@nullshot/mcp";
import type { McpServer, Implementation } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "./types.js";
import { SwapExecutionAgent } from "./agents/swap/SwapExecutionAgent.js";
import { ThirdwebToolboxService } from "./services/ThirdwebToolboxService.js";
import { CoinGeckoService } from "./services/CoinGeckoService.js";
import { setupServerTools } from "./tools.js";
import { setupServerResources } from "./resources.js";

export class DefiMcpServer extends McpHonoServerDO<Env> {
    private toolbox!: ThirdwebToolboxService;
    private swapAgent!: SwapExecutionAgent;
    private coinGecko!: CoinGeckoService;
    private env!: Env;

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.env = env;
        this.initializeServices();
    }

    private initializeServices(): void {
        console.log("[DefiMcpServer] Constructor called");
        console.log("[DefiMcpServer] COINGECKO_API_KEY present:", !!this.env.COINGECKO_API_KEY);
        
        try {
            this.toolbox = new ThirdwebToolboxService(this.env);
            console.log("[DefiMcpServer] ThirdwebToolboxService initialized");
            
            this.swapAgent = new SwapExecutionAgent(this.toolbox);
            console.log("[DefiMcpServer] SwapExecutionAgent initialized");
            
            // CoinGeckoService can work without API key (uses free tier)
            // API key is optional but recommended for higher rate limits
            this.coinGecko = new CoinGeckoService(this.env.COINGECKO_API_KEY || undefined);
            console.log("[DefiMcpServer] CoinGeckoService initialized");
            
            // Verify initialization
            if (!this.coinGecko) {
                throw new Error("Failed to initialize CoinGeckoService - service is null");
            }
            if (!this.toolbox) {
                throw new Error("Failed to initialize ThirdwebToolboxService - service is null");
            }
            if (!this.swapAgent) {
                throw new Error("Failed to initialize SwapExecutionAgent - service is null");
            }
            
            console.log("[DefiMcpServer] All services initialized successfully in constructor");
        } catch (error) {
            console.error("[DefiMcpServer] Error in constructor:", error);
            throw error;
        }
    }

    // Required: Define server metadata
    getImplementation(): Implementation {
        return {
            name: 'DefiMcpServer',
            version: '1.0.0',
        };
    }

    // Required: Configure all server capabilities
    configureServer(server: McpServer): void {
        console.log("[DefiMcpServer] configureServer called");
        
        // Re-initialize services if they're not set (defensive programming)
        if (!this.coinGecko || !this.toolbox || !this.swapAgent) {
            console.warn("[DefiMcpServer] Services not initialized, re-initializing...");
            this.initializeServices();
        }
        
        // Verify services are initialized
        if (!this.coinGecko) {
            console.error("[DefiMcpServer] CoinGeckoService is null/undefined after initialization");
            throw new Error("CoinGeckoService not initialized");
        }
        if (!this.toolbox) {
            console.error("[DefiMcpServer] ThirdwebToolboxService is null/undefined after initialization");
            throw new Error("ThirdwebToolboxService not initialized");
        }
        if (!this.swapAgent) {
            console.error("[DefiMcpServer] SwapExecutionAgent is null/undefined after initialization");
            throw new Error("SwapExecutionAgent not initialized");
        }
        
        console.log("[DefiMcpServer] All services verified, setting up tools and resources");

        // Add tools (functions agents can call)
        setupServerTools(server, {
            toolbox: this.toolbox,
            coinGecko: this.coinGecko,
            swapAgent: this.swapAgent,
            state: this.state,
            server: server,
        });
        
        // Add resources (data agents can read)
        setupServerResources(server);
        
        console.log("[DefiMcpServer] Server configuration complete");
    }

    // Handle Durable Object alarms for price monitoring and auto-swap
    async alarm(): Promise<void> {
        console.log("[DefiMcpServer] Alarm triggered - checking price alerts");
        
        try {
            const alerts = (await this.state.storage.get<any[]>("alerts")) || [];
            const activeAlerts = alerts.filter((alert: any) => alert.active === true);
            
            if (activeAlerts.length === 0) {
                console.log("[DefiMcpServer] No active alerts, clearing alarm");
                await this.state.storage.deleteAlarm();
                return;
            }

            // Check each active alert
            for (const alert of activeAlerts) {
                try {
                    // Get current price
                    const currentPriceData = await this.coinGecko.getTokenPrice(alert.token);
                    const currentPrice = currentPriceData.priceUsd;
                    
                    // Check if condition is met
                    const conditionMet = alert.condition === "above" 
                        ? currentPrice >= alert.targetPrice 
                        : currentPrice <= alert.targetPrice;

                    if (conditionMet) {
                        console.log(`[DefiMcpServer] Alert triggered: ${alert.token} ${alert.condition} $${alert.targetPrice} (current: $${currentPrice})`);
                        
                        // If autoSwap is enabled, trigger swap
                        if (alert.autoSwap && alert.swapParams) {
                            try {
                                console.log(`[DefiMcpServer] Triggering auto-swap for alert ${alert.id}`);
                                
                                const { SwapExecutionAgent } = await import("./agents/swap/SwapExecutionAgent.js");
                                const tokenIn = SwapExecutionAgent.resolveToken(alert.swapParams.fromToken, alert.swapParams.chain);
                                const tokenOut = SwapExecutionAgent.resolveToken(alert.swapParams.toToken, alert.swapParams.chain);
                                
                                if (tokenIn && tokenOut) {
                                    const swapContext = {
                                        amount: alert.swapParams.amount,
                                        tokenIn,
                                        tokenOut,
                                        fromChain: alert.swapParams.chain,
                                        toChain: alert.swapParams.chain,
                                        sessionId: "auto-swap-alert",
                                    };

                                    const routeResult = await this.swapAgent.findBestRoute(swapContext);
                                    
                                    if (routeResult.routes.ok && routeResult.routes.data) {
                                        // Mark alert as triggered
                                        alert.active = false;
                                        alert.triggeredAt = Date.now();
                                        alert.triggeredPrice = currentPrice;
                                        alert.swapExecuted = true;
                                        
                                        console.log(`[DefiMcpServer] Auto-swap executed successfully for alert ${alert.id}`);
                                    } else {
                                        console.error(`[DefiMcpServer] Auto-swap failed for alert ${alert.id}: ${routeResult.routes.error}`);
                                        alert.swapError = routeResult.routes.error;
                                    }
                                } else {
                                    console.error(`[DefiMcpServer] Token resolution failed for alert ${alert.id}`);
                                    alert.swapError = "Token not found";
                                }
                            } catch (swapError) {
                                console.error(`[DefiMcpServer] Error executing auto-swap for alert ${alert.id}:`, swapError);
                                alert.swapError = swapError instanceof Error ? swapError.message : String(swapError);
                            }
                        } else {
                            // Just mark as triggered (no auto-swap)
                            alert.active = false;
                            alert.triggeredAt = Date.now();
                            alert.triggeredPrice = currentPrice;
                        }
                    }
                } catch (error) {
                    console.error(`[DefiMcpServer] Error checking alert ${alert.id}:`, error);
                }
            }

            // Update alerts in storage
            await this.state.storage.put("alerts", alerts);

            // Set next alarm if there are still active alerts
            const stillActiveAlerts = alerts.filter((a: any) => a.active === true);
            if (stillActiveAlerts.length > 0) {
                // Check again in 30 seconds
                await this.state.storage.setAlarm(Date.now() + 30 * 1000);
            } else {
                await this.state.storage.deleteAlarm();
            }
        } catch (error) {
            console.error("[DefiMcpServer] Error in alarm handler:", error);
            // Set alarm again even on error to keep checking
            await this.state.storage.setAlarm(Date.now() + 30 * 1000);
        }
    }
}

