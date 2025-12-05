# MindFi - AI-Native DeFi Platform

**Where minds meet DeFi.** MindFi is an AI-native DeFi platform providing 35 blockchain tools via Model Context Protocol (MCP).

## 🚀 Features

### MCP Server (Cloudflare Workers)
- **35 DeFi Tools** - Wallet, trading, portfolio, price monitoring, and more
- **Autonomous Trading** - Price alerts with auto-swap execution
- **Multi-Chain** - 200+ blockchains via Thirdweb
- **Edge Computing** - Global deployment with sub-20ms latency

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              MCP Client (Claude Desktop, etc.)              │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│          MCP Server (Cloudflare Workers)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  35 DeFi Tools                                       │  │
│  │  - Wallet management                                 │  │
│  │  - Token swaps                                       │  │
│  │  - Price monitoring                                  │  │
│  │  - Portfolio analysis                                │  │
│  │  - Autonomous trading                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌─────────────────────┐         ┌─────────────────┐
│   Thirdweb          │         │   CoinGecko     │
│   (Blockchain)      │         │   (Prices)      │
└─────────────────────┘         └─────────────────┘
```

## 📁 Project Structure

```
mindfi/
├── mcp/                          # Cloudflare Workers MCP Server
│   ├── src/
│   │   ├── agents/               # Trading agents
│   │   ├── services/             # API integrations
│   │   ├── tools.ts              # 35 MCP tools
│   │   ├── server.ts             # MCP server
│   │   └── index.ts              # Worker entry
│   ├── wrangler.toml             # Cloudflare config
│   └── package.json
│
├── docs/                         # Documentation
└── README.md                     # This file
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- pnpm (package manager)
- Thirdweb API key (for blockchain ops)
- CoinGecko API key (optional, for higher rate limits)

### MCP Server

Already deployed at: `https://mindfi-mcp.akusiapasij252.workers.dev`

To run locally:
```bash
cd mcp
pnpm install
pnpm dev
```

## 🔧 Environment Variables

### MCP Server (Cloudflare Secrets)

| Variable | Required | Description |
|----------|----------|-------------|
| `THIRDWEB_SECRET_KEY` | Yes | Thirdweb API key |
| `COINGECKO_API_KEY` | No | CoinGecko API key |

Set via: `wrangler secret put <KEY>`

## 🛠️ Available MCP Tools

### Wallet & Session
- `connect_wallet` - Connect external wallet
- `get_my_wallet` - Get connected wallet
- `disconnect_wallet` - Disconnect wallet
- `create_trading_wallet` - Create backend trading wallet

### Portfolio & Balance
- `get_wallet_balance` - Check balance on chain
- `get_portfolio` - Multi-chain portfolio overview

### Trading
- `swap_tokens` - Cross-chain token swaps
- `transfer_tokens` - Send tokens
- `get_transaction_history` - Swap history

### Price & Market
- `get_token_price` - Real-time token price
- `get_global_market` - Global market data
- `get_token_chart` - Price chart data
- `get_token_ohlcv` - OHLCV candlestick data

### Alerts & Automation
- `monitor_price` - Set price alerts with auto-swap
- `list_active_alerts` - View all alerts
- `cancel_alert` - Cancel alert
- `schedule_dca` - Dollar cost averaging
- `set_stop_loss` - Stop loss orders
- `set_take_profit` - Take profit orders

### AI Analysis
- `get_market_conditions` - Market volatility & sentiment
- `get_portfolio_health` - Portfolio risk analysis
- `get_dca_opportunities` - DCA recommendations
- `enable_auto_rebalance` - Auto portfolio rebalancing

### ChatGPT Compatible
- `search` - Token/market discovery
- `fetch` - Detailed data retrieval

## 🔌 API Endpoints

### MCP Server (Cloudflare)
- `GET /health` - Health check
- `GET /api/tools` - List tools (OpenAI format)
- `GET /sse?sessionId=<id>` - MCP SSE transport

## 📦 Deployment

### MCP Server (Cloudflare)
```bash
cd mcp
pnpm deploy
wrangler secret put THIRDWEB_SECRET_KEY
```

## 🔗 Links

- **Live MCP Server**: https://mindfi-mcp.akusiapasij252.workers.dev
- **Thirdweb**: https://thirdweb.com
- **CoinGecko**: https://coingecko.com
- **Anthropic**: https://anthropic.com
- **MCP Spec**: https://modelcontextprotocol.io

---

**Built with ❤️ for Nullshot Hacks Season 0**
