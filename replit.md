# MindFi MCP Server

## Overview

MindFi is an AI-native DeFi platform that provides blockchain and cryptocurrency operations through the Model Context Protocol (MCP). It enables AI assistants like Claude Desktop to perform DeFi operations such as checking wallet balances, getting token prices, swapping tokens across chains, monitoring prices, and managing portfolios. The system is built on the Nullshot MCP Framework and deployed to Cloudflare Workers for global edge computing with sub-20ms latency.

The platform follows a "fast cross-chain swaps meet smart AI strategy" philosophy, providing core utility through token swaps while layering on premium AI automation capabilities. It uses a tiered subscription model with X402 payments and implements an XAVA token buyback mechanism where 70-80% of platform revenues are used to purchase XAVA tokens.

## Recent Changes (December 2024)

### Autonomous Trading System (NEW)
- **ThirdwebEngineService** - New service for backend wallet management and autonomous swap execution
- **Trading Wallet Tools** - `create_trading_wallet`, `get_trading_wallet`, `get_trading_limits`, `list_active_alerts`, `cancel_alert`
- **Background Execution** - Durable Object alarms check prices every 30 seconds and execute swaps automatically
- **Fully Autonomous** - Trades execute even when ChatGPT/Claude is offline

### Security Safeguards (Production-Ready)
- **Transaction Limits** - $10,000 per transaction, $50,000 daily volume, 10 transactions per day, 1-hour cooldown
- **Strict Price Validation** - Non-stablecoin tokens require verified CoinGecko price before alert creation
- **Stablecoin Whitelist** - USDC, USDT, DAI, BUSD, TUSD, FRAX hardcoded at $1 for reliable valuation
- **Token Resolution** - Token addresses resolved and validated at alert creation, not execution time
- **Fail-Fast Design** - Missing price data or unknown tokens block alert creation entirely
- **Legacy Alert Protection** - Alerts with missing/invalid fromTokenPriceUsd are safely deactivated
- **Retry Mechanism** - Max 3 retries per alert, then permanently deactivated with error logged

### Simplified Architecture
- **Removed all local crypto libraries** (viem, @noble/*, @scure/*) that caused Cloudflare Workers bundling failures
- **Eliminated local wallet creation** - Users now connect external wallets via `connect_wallet` with address parameter only
- **Implemented lazy service initialization** pattern to fix Durable Object initialization order issues
- **All tool handlers use async `getServices()`** for proper service access on first tool call
- **Removed non-functional REST API for tool calls** - MCP tools are called via SSE transport only

### Working Endpoints
- `GET /health` - Health check endpoint
- `GET /` - Server info with available endpoints
- `GET /api/tools` - List available tools (OpenAI function format)
- `GET /status` - Server status with service initialization state
- `GET /tools` - List tools (simple format, from Durable Object)
- `/ (SSE)` - MCP SSE transport for Claude Desktop/MCP clients

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technology Stack

**Runtime Environment:**
- **Cloudflare Workers** - Serverless edge computing platform with global distribution across 330+ cities
- **Durable Objects** - Stateful serverless objects for session management and persistent state
- **TypeScript** - Primary programming language with Node.js module resolution

**MCP Framework:**
- **Nullshot MCP Framework** (`@nullshot/mcp`) - Provides `McpHonoServerDO` base class for building MCP servers on Cloudflare Workers
- **Model Context Protocol SDK** - Standard protocol for AI assistant tool integration
- **Hono** - Lightweight web framework for routing and HTTP handling

**Package Management:**
- **pnpm** - Fast, disk space efficient package manager

### Architectural Patterns

**Service Layer Pattern:**
The application uses a clean separation between MCP tools and external API integrations through dedicated service classes:

- **ThirdwebToolboxService** - Abstracts all blockchain operations, wallet management, and token transfers through Thirdweb REST APIs
- **ThirdwebEngineService** - Manages backend trading wallets and autonomous swap execution via Thirdweb Engine APIs
- **CoinGeckoService** - Handles real-time token price data retrieval with intelligent token ID resolution
- **SwapExecutionAgent** - Orchestrates cross-chain token swaps with route optimization

**Session-Based State Management:**
Uses Cloudflare Durable Objects storage for:
- Connected wallet addresses (autonomous wallet mode)
- Price monitoring alerts with automatic swap triggers
- User session context across tool invocations

**Tool-First Design:**
The MCP server exposes 16 tools and 1 resource through the Model Context Protocol:
1. `interpret_query` - Natural language routing to appropriate tools
2. `connect_wallet` - Session-based wallet connection
3. `get_my_wallet` - Retrieve connected wallet
4. `disconnect_wallet` - Clear wallet session
5. `get_wallet_balance` - Check balances (auto-uses connected wallet)
6. `get_token_price` - Real-time price data
7. `swap_tokens` - Cross-chain token swaps
8. `monitor_price` - Price alerts with optional auto-swap (uses trading wallet)
9. `get_portfolio` - Multi-chain portfolio view
10. `transfer_tokens` - Token transfers
11. `create_trading_wallet` - Create backend wallet for autonomous trading
12. `get_trading_wallet` - Get trading wallet info and balance
13. `get_trading_limits` - Check trading limits and usage stats
14. `list_active_alerts` - List all active price monitoring alerts
15. `cancel_alert` - Cancel a price alert by ID
16. `defi_stats` (resource) - Platform statistics

**Natural Language Routing:**
The `NaturalLanguageRouterAgent` provides AI-powered query interpretation that automatically maps user intent to the correct tool with extracted parameters. This allows users to interact conversationally without knowing tool names.

**Lazy Service Initialization:**
Services are initialized on-demand rather than in the constructor to avoid initialization errors during Durable Object creation. The `ensureInit()` pattern ensures services are ready before tool execution.

### Deployment Architecture

**Single Service Deployment:**
Unlike traditional multi-service architectures, MindFi deploys as a single Cloudflare Worker with Durable Objects, eliminating the need for separate backend/frontend deployments.

**URL Structure:**
- Production: `https://mindfi-mcp.akusiapasij252.workers.dev`
- Health endpoint: `/health`
- SSE endpoint: `/sse?sessionId={id}` (for MCP clients)
- MCP endpoint: `/mcp/{sessionId}/sse`
- Tool listing: `/api/tools?sessionId={id}`

**Configuration:**
Environment variables are managed through Cloudflare Workers secrets:
- `THIRDWEB_SECRET_KEY` (required) - Backend API authentication
- `THIRDWEB_CLIENT_ID` (optional) - Client identification
- `COINGECKO_API_KEY` (optional) - Token price data
- `XAVA_TREASURY_ADDRESS` (optional) - Buyback destination

### Data Flow

**Request Flow:**
1. MCP client (Claude Desktop) connects via SSE transport
2. Request routes through Cloudflare Worker entry point
3. Durable Object (DefiMcpServer) handles session isolation
4. Tool execution delegates to service layer
5. Services make authenticated API calls to external providers
6. Results return through MCP protocol to AI assistant

**Tool Execution Pattern:**
```
User Query → NaturalLanguageRouter → MCP Tool → Service Layer → External API
                                                      ↓
                                                State Storage
```

**Autonomous Features:**
- Wallet connection persists across tool calls within a session
- Price monitors trigger automatic swaps when conditions are met
- Portfolio scanning aggregates data across 200+ blockchains

## External Dependencies

### Blockchain & DeFi APIs

**Thirdweb Platform** (`https://api.thirdweb.com`)
- Primary blockchain infrastructure provider
- Services used:
  - Wallet balance queries (`/v1/wallets/{address}/balance`)
  - Token metadata and pricing
  - Cross-chain swap routing and execution
  - Payment processing (X402 protocol)
  - Multi-chain portfolio aggregation
- Authentication: `x-secret-key` header with backend secret
- Supports 200+ blockchain networks
- Timeout: 15 seconds per request

**CoinGecko API** (`https://api.coingecko.com/api/v3`)
- Real-time cryptocurrency price data
- Market cap, volume, and 24h price change metrics
- Token ID resolution with intelligent mapping
- Rate limiting considerations for free tier
- Optional API key for higher limits

### AI & Protocol Standards

**Model Context Protocol (MCP)**
- Open standard for AI assistant tool integration
- Transport: Server-Sent Events (SSE) for real-time streaming
- Format: JSON-RPC 2.0
- Primitives: Tools (functions), Resources (data), Prompts (templates)

**Claude Desktop Integration**
- Native MCP client requiring SSE transport
- Configuration via `claude_desktop_config.json`
- Stdio bridge script for local development

### Development & Deployment Tools

**Wrangler CLI** (`wrangler`)
- Cloudflare Workers deployment and management
- Local development server (`wrangler dev`)
- Secret management (`wrangler secret put`)
- Tail logging for production debugging

**MCP Inspector** (`@modelcontextprotocol/inspector`)
- GUI testing tool for MCP servers
- Connects via SSE to test tool execution
- Alternative to Claude Desktop for development

### Planned Integrations

**Agent Topology** (from vision document):
- Analysis agents for portfolio scanning, market data, risk assessment
- Strategy agents for DCA, liquidation protection, portfolio rotation
- Infrastructure agents for payment processing and XAVA buybacks
- Evolution agents for strategy learning and optimization

**Future APIs:**
- DEX aggregators (50+ sources for optimal swap routing)
- Bridge protocols for cross-chain transfers
- Flashloan providers for arbitrage execution
- Compliance and security monitoring services