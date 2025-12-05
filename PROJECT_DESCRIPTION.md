MindFi MCP Server - Complete Build Description

OVERVIEW

MindFi is an AI-native DeFi platform that provides 35 blockchain and cryptocurrency tools through the Model Context Protocol (MCP). The platform enables AI assistants like Claude Desktop and ChatGPT to perform DeFi operations including wallet management, token swaps, price monitoring, and autonomous trading.

ARCHITECTURE

The system is built on Cloudflare Workers with Durable Objects for state management. It follows a service-oriented architecture with clear separation between tools, services, and agents.

Technology Stack:
- Runtime: Cloudflare Workers with edge computing
- State Management: Cloudflare Durable Objects with SQLite storage
- Framework: Nullshot MCP Framework version 0.3.6
- Language: TypeScript 5.6.3
- Web Framework: Hono 4.4.7
- Validation: Zod 3.25.76
- Protocol: Model Context Protocol SDK 1.23.0

Core Components:

1. Worker Entry Point (index.ts)
   - Handles incoming HTTP requests
   - Routes requests to appropriate Durable Object instances
   - Provides health check endpoint
   - Exposes tools list in OpenAI function format
   - Manages session-based routing

2. MCP Server (server.ts)
   - Extends McpHonoServerDO from Nullshot MCP Framework
   - Implements DefiMcpServer class
   - Lazy initialization of services
   - Configures 35 MCP tools
   - Manages Durable Object alarms for scheduled tasks

3. Tools Layer (tools.ts)
   - 35 MCP tools with Zod schema validation
   - Organized into functional categories
   - Natural language query interpretation
   - Error handling and validation

4. Services Layer
   - ThirdwebToolboxService: Blockchain operations, wallet queries, token resolution
   - ThirdwebEngineService: Backend wallet management, autonomous execution
   - CoinGeckoService: Real-time price data, token ID resolution

5. Agents Layer
   - SwapExecutionAgent: Swap orchestration and route optimization
   - NaturalLanguageRouterAgent: Query interpretation and tool routing

FEATURES

Core Capabilities:
- Cross-chain token swaps across 200+ blockchain networks via Thirdweb
- Dynamic token resolution supporting thousands of tokens
- Real-time price data from CoinGecko and Thirdweb
- Multi-chain portfolio tracking and aggregation
- Natural language processing for tool routing

Autonomous Trading:
- Backend trading wallets managed by Thirdweb Engine
- Price alerts with automatic swap execution
- Stop loss and take profit orders
- Dollar cost averaging (DCA) scheduling
- Background execution even when AI is offline

AI Strategy Tools:
- Market condition analysis with volatility and sentiment metrics
- Portfolio health scoring with risk analysis
- DCA opportunity detection based on market conditions
- Liquidation risk analysis for leveraged positions
- Portfolio rebalancing with target allocations
- Auto-rebalancing on schedule

Security Safeguards:
- 10,000 USD per transaction limit
- 50,000 USD daily volume limit
- Maximum 10 transactions per day
- 1-hour cooldown between trades
- Strict price validation before execution

MCP TOOLS - 35 TOTAL

Wallet and Session Management (4 tools):
1. interpret_query - Natural language routing to appropriate tools
2. connect_wallet - Connect external wallet by address
3. get_my_wallet - Get currently connected wallet address
4. disconnect_wallet - Clear wallet session

Portfolio and Balance (3 tools):
5. get_wallet_balance - Check wallet balances on specific chain
6. get_token_price - Get real-time token price from CoinGecko
7. get_portfolio - Multi-chain portfolio overview

Trading and Swaps (3 tools):
8. swap_tokens - Cross-chain token swaps with dynamic resolution
9. transfer_tokens - Transfer tokens to another address
10. monitor_price - Set price alerts with optional auto-swap

Autonomous Trading (5 tools):
11. create_trading_wallet - Create backend wallet for autonomous trading
12. get_trading_wallet - Get trading wallet info and balance
13. get_trading_limits - Check trading limits and usage statistics
14. list_active_alerts - List all active price monitoring alerts
15. cancel_alert - Cancel a price alert by ID

Dollar Cost Averaging (3 tools):
16. schedule_dca - Schedule recurring token purchases
17. cancel_dca - Cancel a DCA schedule
18. list_dca_schedules - List all DCA schedules

Stop Loss and Take Profit (2 tools):
19. set_stop_loss - Automatic sell when price drops below threshold
20. set_take_profit - Automatic sell when price rises above threshold

Transaction History (1 tool):
21. get_transaction_history - View history of executed swaps

Market Data (3 tools):
22. get_global_market - Global crypto market data including market cap and BTC dominance
23. get_token_chart - Historical price chart data for tokens
24. get_token_ohlcv - OHLCV candlestick data

Token Approvals (2 tools):
25. get_token_approvals - Check token spending approvals for wallet
26. revoke_approval - Revoke token spending approval

AI Strategy Analysis (7 tools):
27. get_market_conditions - Analyze market volatility, sentiment, and trading conditions
28. get_portfolio_health - Calculate risk score, diversification metrics, asset exposure
29. get_dca_opportunities - Detect optimal DCA opportunities based on market conditions
30. get_liquidation_risk - Analyze liquidation risk for leveraged positions
31. set_target_allocation - Define target portfolio allocation for rebalancing
32. get_rebalance_suggestion - Get suggested trades to reach target allocation
33. enable_auto_rebalance - Enable automatic portfolio rebalancing on schedule

ChatGPT Compatible (2 tools):
34. search - Search tokens, categories, and market data in ChatGPT format
35. fetch - Fetch detailed data by ID in ChatGPT format

API ENDPOINTS

Root Endpoint:
- GET / - Server information and available endpoints

Health and Status:
- GET /health - Health check endpoint
- GET /status - Server status with service initialization state

Tools:
- GET /tools - List available tools in simple format
- GET /api/tools - List tools in OpenAI function format for ChatGPT integration

MCP Transport:
- GET /sse?sessionId=id - Server-Sent Events transport for MCP clients
- GET /mcp/:sessionId/sse - Alternative SSE endpoint with path-based session ID

DEPLOYMENT

Production URL:
https://mindfi-mcp.akusiapasij252.workers.dev

Deployment Configuration:
- Platform: Cloudflare Workers
- Framework: Nullshot MCP Framework
- Durable Objects: Enabled with SQLite storage
- Observability: Enabled with full logging
- Node.js Compatibility: Enabled

Environment Variables:
- THIRDWEB_SECRET_KEY (Required) - Thirdweb API authentication
- COINGECKO_API_KEY (Optional) - CoinGecko API key for higher rate limits
- THIRDWEB_CLIENT_ID (Optional) - Client identification

Deployment Commands:
- pnpm install - Install dependencies
- pnpm dev - Start local development server
- pnpm deploy - Deploy to Cloudflare Workers
- wrangler secret put KEY - Set environment secrets

INTEGRATION

Claude Desktop:
Configure in claude_desktop_config.json with SSE endpoint URL

ChatGPT:
Import OpenAPI schema from /api/tools endpoint and configure authentication

MCP Inspector:
Use for testing and debugging MCP server connections

DYNAMIC TOKEN RESOLUTION

The system uses a three-tier token resolution strategy:

1. Static Cache - 45 popular tokens for instant lookups
2. Thirdweb Bridge API - Thousands of tokens via real-time API calls
3. Contract Address - Manual input for new or unlisted tokens

This ensures support for thousands of tokens across 200+ blockchain networks while maintaining fast response times for common tokens.

SESSION MANAGEMENT

Each MCP client connection gets a unique session ID that maps to a Durable Object instance. This provides:
- Session isolation for concurrent users
- Persistent state storage for wallet connections and alerts
- Automatic cleanup of expired sessions
- Global distribution via Cloudflare edge network

AUTONOMOUS TRADING SYSTEM

The platform includes a complete autonomous trading system:

Trading Wallets:
- Backend wallets created via Thirdweb Engine
- Secure key management
- Balance tracking across chains

Price Monitoring:
- Real-time price checks via Durable Object alarms
- Configurable price thresholds
- Automatic swap execution when conditions are met
- Retry logic with configurable max attempts

DCA Scheduling:
- Recurring purchases at fixed intervals (hourly, daily, weekly, monthly)
- Automatic execution via Durable Object alarms
- Configurable total purchase count
- Price tracking and limit enforcement

Stop Loss and Take Profit:
- Automatic position management
- Price-based triggers
- Configurable thresholds
- Integration with trading wallets

SECURITY FEATURES

Transaction Limits:
- Per transaction: 10,000 USD maximum
- Daily volume: 50,000 USD maximum
- Daily count: 10 transactions maximum
- Cooldown: 1 hour between trades

Validation:
- Address format validation
- Price validation before execution
- Balance checks before swaps
- Token approval verification

Error Handling:
- Comprehensive error messages
- Graceful failure handling
- Retry logic for transient failures
- Logging for debugging

TESTING

The project includes comprehensive testing:
- Unit tests for individual tools
- Integration tests for tool execution
- Health check endpoints
- MCP Inspector compatibility

All 35 tools have been tested and verified for production deployment.

DOCUMENTATION

The project includes:
- README.md with quick start guide
- mcp/README.md with detailed MCP server documentation
- Code comments and type definitions
- API endpoint documentation

LICENSE

MIT License

BUILT FOR

Nullshot Hacks Season 0

