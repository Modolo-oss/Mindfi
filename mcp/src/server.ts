import { McpHonoServerDO } from "@nullshot/mcp";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "./types.js";
import { SwapExecutionAgent } from "./agents/swap/SwapExecutionAgent.js";
import { ThirdwebToolboxService } from "./services/ThirdwebToolboxService.js";
import { ThirdwebEngineService } from "./services/ThirdwebEngineService.js";
import { CoinGeckoService } from "./services/CoinGeckoService.js";
import { setupServerTools } from "./tools.js";
import { setupServerResources } from "./resources.js";
import { Hono } from "hono";

export class DefiMcpServer extends McpHonoServerDO<Env> {
    private toolbox?: ThirdwebToolboxService;
    private engine?: ThirdwebEngineService;
    private swapAgent?: SwapExecutionAgent;
    private coinGecko?: CoinGeckoService;
    private env!: Env;
    private servicesInitialized = false;

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.env = env;
        console.log("[DefiMcpServer] Constructor called - deferring service initialization");
    }

    private initializeServices(): void {
        if (this.servicesInitialized) {
            console.log("[DefiMcpServer] Services already initialized, skipping");
            return;
        }

        console.log("[DefiMcpServer] Lazy initializing services");
        console.log("[DefiMcpServer] COINGECKO_API_KEY present:", !!this.env.COINGECKO_API_KEY);
        
        try {
            this.toolbox = new ThirdwebToolboxService(this.env);
            console.log("[DefiMcpServer] ThirdwebToolboxService initialized");
            
            this.engine = new ThirdwebEngineService(this.env);
            console.log("[DefiMcpServer] ThirdwebEngineService initialized");
            
            this.swapAgent = new SwapExecutionAgent(this.toolbox);
            console.log("[DefiMcpServer] SwapExecutionAgent initialized");
            
            this.coinGecko = new CoinGeckoService(this.env.COINGECKO_API_KEY || undefined);
            console.log("[DefiMcpServer] CoinGeckoService initialized");
            
            this.servicesInitialized = true;
            console.log("[DefiMcpServer] All services initialized successfully");
        } catch (error) {
            console.error("[DefiMcpServer] Error initializing services:", error);
            throw error;
        }
    }

    getImplementation() {
        return {
            name: 'DefiMcpServer',
            version: '1.0.0',
        };
    }

    async ensureServicesInitialized(): Promise<void> {
        if (!this.servicesInitialized) {
            this.initializeServices();
        }
    }

    configureServer(server: McpServer): void {
        console.log("[DefiMcpServer] configureServer called - setting up tools WITHOUT initializing services yet");
        
        setupServerTools(server, {
            state: this.state,
            server: server,
            getToolbox: () => this.toolbox,
            getCoinGecko: () => this.coinGecko,
            getSwapAgent: () => this.swapAgent,
            getEngine: () => this.engine,
            ensureInit: () => this.ensureServicesInitialized(),
        });
        
        setupServerResources(server);
        
        console.log("[DefiMcpServer] Server configuration complete (services will be initialized on first tool call)");
    }

    protected setupRoutes(app: Hono): void {
        super.setupRoutes(app);

        app.get('/tools', (c) => {
            const tools = [
                { name: 'get_wallet_balance', description: 'Get wallet balance on a specific chain' },
                { name: 'get_token_price', description: 'Get real-time token price from CoinGecko' },
                { name: 'swap_tokens', description: 'Swap tokens across chains using Thirdweb' },
                { name: 'get_portfolio', description: 'Get wallet portfolio across multiple chains' },
                { name: 'transfer_tokens', description: 'Transfer tokens to another address' },
                { name: 'connect_wallet', description: 'Connect an external wallet address to this session' },
                { name: 'get_my_wallet', description: 'Get the currently connected wallet address' },
                { name: 'disconnect_wallet', description: 'Disconnect and clear wallet from session' },
                { name: 'monitor_price', description: 'Set up price alerts with optional auto-swap' },
                { name: 'interpret_query', description: 'Interpret natural language queries' },
                { name: 'create_trading_wallet', description: 'Create a backend wallet for autonomous trading' },
                { name: 'get_trading_wallet', description: 'Get trading wallet info and balance' },
                { name: 'get_trading_limits', description: 'Get trading limits and usage stats' },
                { name: 'list_active_alerts', description: 'List all active price alerts' },
                { name: 'cancel_alert', description: 'Cancel a price alert by ID' },
                { name: 'schedule_dca', description: 'Schedule recurring token purchases (DCA)' },
                { name: 'cancel_dca', description: 'Cancel a DCA schedule' },
                { name: 'list_dca_schedules', description: 'List all DCA schedules' },
                { name: 'set_stop_loss', description: 'Set automatic sell when price drops below threshold' },
                { name: 'set_take_profit', description: 'Set automatic sell when price rises above threshold' },
                { name: 'get_transaction_history', description: 'Get history of executed swaps' },
                { name: 'get_global_market', description: 'Get global crypto market data' },
                { name: 'get_token_chart', description: 'Get historical price chart for a token' },
                { name: 'get_token_ohlcv', description: 'Get OHLCV candlestick data' },
                { name: 'get_token_approvals', description: 'Check token spending approvals' },
                { name: 'revoke_approval', description: 'Revoke token spending approval' },
            ];
            return c.json({ ok: true, tools, count: tools.length });
        });

        app.get('/status', (c) => {
            return c.json({
                name: 'DefiMcpServer',
                version: '1.0.0',
                status: 'running',
                servicesInitialized: this.servicesInitialized,
            });
        });
    }

    // Handle Durable Object alarms for price monitoring, auto-swap, and DCA
    async alarm(): Promise<void> {
        console.log("[DefiMcpServer] Alarm triggered - checking alerts and DCA schedules");
        
        this.initializeServices();
        
        try {
            // Get trading wallet for autonomous execution
            const tradingWalletAddress = await this.state.storage.get<string>("trading_wallet_address");

            // Check if there's any work to do
            const alerts = (await this.state.storage.get<any[]>("alerts")) || [];
            const activeAlerts = alerts.filter((alert: any) => alert.active === true);
            const dcaSchedules = (await this.state.storage.get<any[]>("dca_schedules")) || [];
            const activeDCAs = dcaSchedules.filter((d: any) => d.active === true);
            
            if (activeAlerts.length === 0 && activeDCAs.length === 0) {
                console.log("[DefiMcpServer] No active alerts or DCA schedules, clearing alarm");
                await this.state.storage.deleteAlarm();
                return;
            }

            // Check each active alert
            for (const alert of activeAlerts) {
                try {
                    if (!this.coinGecko) {
                        throw new Error("CoinGeckoService not initialized");
                    }
                    // Get current price
                    const currentPriceData = await this.coinGecko.getTokenPrice(alert.token);
                    const currentPrice = currentPriceData.priceUsd;
                    
                    // Check if condition is met
                    const conditionMet = alert.condition === "above" 
                        ? currentPrice >= alert.targetPrice 
                        : currentPrice <= alert.targetPrice;

                    if (conditionMet) {
                        console.log(`[DefiMcpServer] Alert triggered: ${alert.token} ${alert.condition} $${alert.targetPrice} (current: $${currentPrice})`);
                        
                        // If autoSwap is enabled, trigger swap using trading wallet
                        if (alert.autoSwap && alert.swapParams) {
                            try {
                                console.log(`[DefiMcpServer] Triggering auto-swap for alert ${alert.id}`);
                                
                                // Check if trading wallet exists
                                if (!tradingWalletAddress) {
                                    console.error(`[DefiMcpServer] No trading wallet found for auto-swap`);
                                    alert.swapError = "No trading wallet configured. Create one with create_trading_wallet.";
                                    alert.active = false;
                                    alert.triggeredAt = Date.now();
                                    alert.triggeredPrice = currentPrice;
                                    continue;
                                }

                                // Validate required swap parameters exist (set by monitor_price)
                                if (!alert.swapParams.fromTokenAddress || !alert.swapParams.toTokenAddress || !alert.swapParams.chain || !alert.swapParams.amount) {
                                    console.error(`[DefiMcpServer] Invalid swap params for alert ${alert.id} - missing required fields`);
                                    alert.swapError = "Invalid swap configuration - missing token addresses or amount";
                                    alert.active = false;
                                    alert.triggeredAt = Date.now();
                                    alert.triggeredPrice = currentPrice;
                                    continue;
                                }

                                // Calculate USD value using fromToken price (stored at alert creation)
                                // This ensures accurate valuation regardless of monitored vs swapped token
                                const swapAmount = parseFloat(alert.swapParams.amount);
                                const fromTokenPriceUsd = alert.swapParams.fromTokenPriceUsd;
                                
                                // fromTokenPriceUsd must exist - it's set by monitor_price
                                // If missing, this is a legacy alert or corrupted data - fail safely
                                if (typeof fromTokenPriceUsd !== 'number' || fromTokenPriceUsd <= 0) {
                                    console.error(`[DefiMcpServer] Missing or invalid fromTokenPriceUsd for alert ${alert.id}`);
                                    alert.swapError = "Invalid price data - cannot verify trading limits. Please recreate this alert.";
                                    alert.active = false;
                                    alert.triggeredAt = Date.now();
                                    alert.triggeredPrice = currentPrice;
                                    continue;
                                }
                                
                                const txValueUsd = isNaN(swapAmount) ? 0 : swapAmount * fromTokenPriceUsd;

                                // Check trading limits
                                const dailyTxCount = await this.state.storage.get<number>("trading_wallet_daily_tx_count") || 0;
                                const dailyVolumeUsd = await this.state.storage.get<number>("trading_wallet_daily_volume_usd") || 0;
                                const lastTxTime = await this.state.storage.get<number>("trading_wallet_last_tx_time") || 0;

                                if (!this.engine) {
                                    throw new Error("ThirdwebEngineService not initialized");
                                }

                                const limitsCheck = this.engine.validateTransactionLimits(
                                    txValueUsd,
                                    dailyTxCount,
                                    dailyVolumeUsd,
                                    lastTxTime
                                );

                                if (!limitsCheck.valid) {
                                    console.error(`[DefiMcpServer] Trading limits exceeded: ${limitsCheck.reason}`);
                                    alert.swapError = limitsCheck.reason;
                                    // Don't deactivate alert for limit issues - will retry after cooldown
                                    continue;
                                }

                                // Use pre-resolved token addresses from monitor_price
                                const swapResult = await this.engine.executeSwap({
                                    walletAddress: tradingWalletAddress,
                                    fromChainId: alert.swapParams.chain,
                                    toChainId: alert.swapParams.chain,
                                    fromTokenAddress: alert.swapParams.fromTokenAddress,
                                    toTokenAddress: alert.swapParams.toTokenAddress,
                                    fromAmount: alert.swapParams.amount,
                                    slippageBps: 100,
                                });
                                
                                if (swapResult.ok && swapResult.transaction) {
                                    // Mark alert as triggered and swap executed
                                    alert.active = false;
                                    alert.triggeredAt = Date.now();
                                    alert.triggeredPrice = currentPrice;
                                    alert.swapExecuted = true;
                                    alert.transactionId = swapResult.transaction.queueId;
                                    
                                    // Update trading wallet stats
                                    await this.state.storage.put("trading_wallet_daily_tx_count", dailyTxCount + 1);
                                    await this.state.storage.put("trading_wallet_daily_volume_usd", dailyVolumeUsd + txValueUsd);
                                    await this.state.storage.put("trading_wallet_last_tx_time", Date.now());
                                    
                                    console.log(`[DefiMcpServer] Auto-swap executed successfully for alert ${alert.id}, queueId: ${swapResult.transaction.queueId}`);
                                } else {
                                    // Swap failed - increment retry count
                                    alert.retryCount = (alert.retryCount || 0) + 1;
                                    alert.lastRetryAt = Date.now();
                                    alert.swapError = swapResult.error;
                                    
                                    console.error(`[DefiMcpServer] Auto-swap failed for alert ${alert.id} (retry ${alert.retryCount}/${alert.maxRetries || 3}): ${swapResult.error}`);
                                    
                                    // Disable alert if max retries exceeded
                                    if (alert.retryCount >= (alert.maxRetries || 3)) {
                                        alert.active = false;
                                        alert.triggeredAt = Date.now();
                                        alert.triggeredPrice = currentPrice;
                                        alert.swapExecuted = false;
                                        alert.failureReason = `Max retries (${alert.maxRetries || 3}) exceeded: ${swapResult.error}`;
                                        console.error(`[DefiMcpServer] Alert ${alert.id} disabled after ${alert.retryCount} failed attempts`);
                                    }
                                }
                            } catch (swapError) {
                                // Increment retry count on error
                                alert.retryCount = (alert.retryCount || 0) + 1;
                                alert.lastRetryAt = Date.now();
                                alert.swapError = swapError instanceof Error ? swapError.message : String(swapError);
                                
                                console.error(`[DefiMcpServer] Error executing auto-swap for alert ${alert.id} (retry ${alert.retryCount}):`, swapError);
                                
                                if (alert.retryCount >= (alert.maxRetries || 3)) {
                                    alert.active = false;
                                    alert.triggeredAt = Date.now();
                                    alert.swapExecuted = false;
                                    alert.failureReason = `Max retries exceeded: ${alert.swapError}`;
                                }
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

            // Process DCA schedules
            await this.processDCASchedules(tradingWalletAddress);

            // Reset daily limits at midnight UTC
            await this.resetDailyLimitsIfNeeded();

            // Set next alarm if there are still active alerts or DCA schedules
            const stillActiveAlerts = alerts.filter((a: any) => a.active === true);
            const updatedDCASchedules = (await this.state.storage.get<any[]>("dca_schedules")) || [];
            const stillActiveDCAs = updatedDCASchedules.filter((d: any) => d.active === true);
            
            if (stillActiveAlerts.length > 0 || stillActiveDCAs.length > 0) {
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

    private async processDCASchedules(tradingWalletAddress: string | undefined): Promise<void> {
        if (!tradingWalletAddress) {
            return;
        }

        const dcaSchedules = (await this.state.storage.get<any[]>("dca_schedules")) || [];
        const now = Date.now();

        for (const dca of dcaSchedules) {
            if (!dca.active) continue;
            if (now < dca.nextExecutionAt) continue;

            console.log(`[DefiMcpServer] Executing DCA schedule ${dca.id}: Buy ${dca.token} with ${dca.amount} ${dca.fromToken}`);

            try {
                if (!this.engine || !this.coinGecko) {
                    throw new Error("Services not initialized");
                }

                // Refresh fromToken price for accurate limit enforcement
                const knownStablecoins = ['USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'FRAX'];
                const isStablecoin = knownStablecoins.includes(dca.fromToken.toUpperCase());
                let currentFromTokenPrice = 1;

                if (!isStablecoin) {
                    const tokenToCoinGeckoId: Record<string, string> = {
                        'ETH': 'ethereum', 'WETH': 'ethereum', 'BTC': 'bitcoin', 'WBTC': 'wrapped-bitcoin',
                        'BNB': 'binancecoin', 'MATIC': 'matic-network', 'AVAX': 'avalanche-2',
                    };
                    const coinGeckoId = tokenToCoinGeckoId[dca.fromToken.toUpperCase()];
                    if (coinGeckoId) {
                        try {
                            const priceData = await this.coinGecko.getTokenPrice(coinGeckoId);
                            currentFromTokenPrice = priceData.priceUsd || 1;
                        } catch (priceError) {
                            console.error(`[DefiMcpServer] Could not refresh price for ${dca.fromToken}, using stored price`);
                            currentFromTokenPrice = dca.fromTokenPriceUsd || 1;
                        }
                    }
                }

                // Update stored price for next execution
                dca.fromTokenPriceUsd = currentFromTokenPrice;

                // Check trading limits with refreshed price
                const dailyTxCount = await this.state.storage.get<number>("trading_wallet_daily_tx_count") || 0;
                const dailyVolumeUsd = await this.state.storage.get<number>("trading_wallet_daily_volume_usd") || 0;
                const lastTxTime = await this.state.storage.get<number>("trading_wallet_last_tx_time") || 0;

                const swapAmount = parseFloat(dca.amount);
                const txValueUsd = swapAmount * currentFromTokenPrice;

                const limitsCheck = this.engine.validateTransactionLimits(txValueUsd, dailyTxCount, dailyVolumeUsd, lastTxTime);
                if (!limitsCheck.valid) {
                    console.log(`[DefiMcpServer] DCA ${dca.id} skipped: ${limitsCheck.reason}`);
                    // Still schedule next execution
                    dca.nextExecutionAt = now + dca.intervalMs;
                    continue;
                }

                // Validate token addresses exist
                if (!dca.fromTokenAddress || !dca.toTokenAddress) {
                    console.error(`[DefiMcpServer] DCA ${dca.id} missing token addresses`);
                    dca.lastError = "Missing token addresses - please recreate this DCA schedule";
                    dca.active = false;
                    continue;
                }

                // Execute the swap
                const swapResult = await this.engine.executeSwap({
                    walletAddress: tradingWalletAddress,
                    fromChainId: dca.chain,
                    toChainId: dca.chain,
                    fromTokenAddress: dca.fromTokenAddress,
                    toTokenAddress: dca.toTokenAddress,
                    fromAmount: dca.amount,
                    slippageBps: 100,
                });

                if (swapResult.ok && swapResult.transaction) {
                    dca.completedPurchases++;
                    dca.lastExecutedAt = now;
                    dca.lastTransactionId = swapResult.transaction.queueId;

                    // Update trading wallet stats
                    await this.state.storage.put("trading_wallet_daily_tx_count", dailyTxCount + 1);
                    await this.state.storage.put("trading_wallet_daily_volume_usd", dailyVolumeUsd + txValueUsd);
                    await this.state.storage.put("trading_wallet_last_tx_time", now);

                    // Check if DCA is complete
                    if (dca.totalPurchases && dca.completedPurchases >= dca.totalPurchases) {
                        dca.active = false;
                        dca.completedAt = now;
                        console.log(`[DefiMcpServer] DCA ${dca.id} completed all ${dca.totalPurchases} purchases`);
                    } else {
                        // Schedule next execution
                        dca.nextExecutionAt = now + dca.intervalMs;
                    }

                    console.log(`[DefiMcpServer] DCA ${dca.id} executed successfully, purchase #${dca.completedPurchases}`);
                } else {
                    console.error(`[DefiMcpServer] DCA ${dca.id} swap failed: ${swapResult.error}`);
                    dca.lastError = swapResult.error;
                    // Still schedule next execution
                    dca.nextExecutionAt = now + dca.intervalMs;
                }
            } catch (error) {
                console.error(`[DefiMcpServer] Error executing DCA ${dca.id}:`, error);
                dca.lastError = error instanceof Error ? error.message : String(error);
                // Schedule next execution anyway
                dca.nextExecutionAt = now + dca.intervalMs;
            }
        }

        await this.state.storage.put("dca_schedules", dcaSchedules);
    }

    private async resetDailyLimitsIfNeeded(): Promise<void> {
        const lastReset = await this.state.storage.get<number>("trading_wallet_last_daily_reset") || 0;
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;
        
        if (now - lastReset > oneDayMs) {
            await this.state.storage.put("trading_wallet_daily_tx_count", 0);
            await this.state.storage.put("trading_wallet_daily_volume_usd", 0);
            await this.state.storage.put("trading_wallet_last_daily_reset", now);
            console.log("[DefiMcpServer] Daily trading limits reset");
        }
    }
}

