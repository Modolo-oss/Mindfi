# MindFi MCP Server

AI-native DeFi platform providing blockchain and cryptocurrency operations through the Model Context Protocol (MCP). Enables AI assistants like Claude Desktop and ChatGPT to perform DeFi operations including wallet management, token swaps, price monitoring, and autonomous trading.

## Features

### Core Capabilities
- **Cross-Chain Swaps** - Trade tokens across 200+ blockchain networks via Thirdweb
- **Dynamic Token Resolution** - Supports thousands of tokens, not limited to static cache
- **Real-Time Prices** - Live price data from CoinGecko and Thirdweb
- **Portfolio Tracking** - Multi-chain portfolio aggregation
- **Natural Language** - Ask in plain English, AI routes to correct tool

### Autonomous Trading
- **Trading Wallets** - Backend wallets managed by Thirdweb Engine
- **Price Alerts** - Set alerts that trigger automatic swaps
- **Stop Loss / Take Profit** - Automatic position management
- **DCA Scheduling** - Dollar cost averaging on autopilot
- **Background Execution** - Trades execute even when AI is offline

### AI Strategy (NEW)
- **Market Analysis** - Volatility, sentiment, and trading conditions
- **Portfolio Health** - Risk scores, diversification, and asset exposure
- **Smart DCA** - Detect optimal DCA opportunities based on market conditions
- **Rebalancing** - Target allocations with auto-rebalance on schedule
- **LLM-Powered** - Leverages connected AI (Claude/ChatGPT) for analysis

### Security Safeguards
- $10,000 per transaction limit
- $50,000 daily volume limit
- 10 transactions per day maximum
- 1-hour cooldown between trades
- Strict price validation before execution

## Quick Start

### Installation

```bash
cd mcp
pnpm install
```

### Local Development

```bash
# Create .dev.vars file with your API keys
echo 'THIRDWEB_SECRET_KEY="your-key"' > .dev.vars
echo 'COINGECKO_API_KEY="your-key"' >> .dev.vars

# Start development server
pnpm dev
```

### Deploy to Cloudflare Workers

```bash
# Set secrets
wrangler secret put THIRDWEB_SECRET_KEY
wrangler secret put COINGECKO_API_KEY

# Deploy
pnpm deploy
```

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `THIRDWEB_SECRET_KEY` | Yes | Backend API authentication |
| `THIRDWEB_CLIENT_ID` | No | Client identification |
| `COINGECKO_API_KEY` | No | Token price data (higher rate limits) |
| `XAVA_TREASURY_ADDRESS` | No | Buyback destination address |

### .dev.vars Example

```
THIRDWEB_SECRET_KEY="your-thirdweb-secret-key"
COINGECKO_API_KEY="your-coingecko-api-key"
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Server info and available endpoints |
| `/health` | GET | Health check |
| `/status` | GET | Server status with service state |
| `/tools` | GET | List available tools (simple format) |
| `/api/tools` | GET | List tools (OpenAI function format) |
| `/mcp/:sessionId/sse` | GET | MCP SSE transport for AI clients |

## MCP Tools (33 Total)

### Wallet & Session Management
| Tool | Description |
|------|-------------|
| `interpret_query` | Natural language routing to appropriate tools |
| `connect_wallet` | Connect wallet by address |
| `get_my_wallet` | Get connected wallet address |
| `disconnect_wallet` | Clear wallet session |

### Portfolio & Balance
| Tool | Description |
|------|-------------|
| `get_wallet_balance` | Check wallet balances (auto-uses connected wallet) |
| `get_token_price` | Get real-time token price |
| `get_portfolio` | Multi-chain portfolio view |

### Trading & Swaps
| Tool | Description |
|------|-------------|
| `swap_tokens` | Cross-chain token swaps with dynamic resolution |
| `transfer_tokens` | Transfer tokens to another address |
| `monitor_price` | Set price alerts with optional auto-swap |

### Autonomous Trading
| Tool | Description |
|------|-------------|
| `create_trading_wallet` | Create backend wallet for autonomous trading |
| `get_trading_wallet` | Get trading wallet info and balance |
| `get_trading_limits` | Check trading limits and usage stats |
| `list_active_alerts` | List all active price monitoring alerts |
| `cancel_alert` | Cancel a price alert by ID |

### DCA (Dollar Cost Averaging)
| Tool | Description |
|------|-------------|
| `schedule_dca` | Schedule recurring token purchases |
| `cancel_dca` | Cancel a DCA schedule |
| `list_dca_schedules` | List all DCA schedules |

### Stop Loss & Take Profit
| Tool | Description |
|------|-------------|
| `set_stop_loss` | Automatic sell when price drops below threshold |
| `set_take_profit` | Automatic sell when price rises above threshold |

### Transaction History
| Tool | Description |
|------|-------------|
| `get_transaction_history` | View history of executed swaps |

### Market Data (CoinGecko)
| Tool | Description |
|------|-------------|
| `get_global_market` | Global crypto market data (market cap, BTC dominance) |
| `get_token_chart` | Historical price chart for a token |
| `get_token_ohlcv` | OHLCV candlestick data |

### Token Approvals
| Tool | Description |
|------|-------------|
| `get_token_approvals` | Check token spending approvals |
| `revoke_approval` | Revoke token spending approval |

### AI Strategy (NEW - Leverages Connected LLM)
| Tool | Description |
|------|-------------|
| `get_market_conditions` | Analyze market volatility, sentiment, and trading conditions |
| `get_portfolio_health` | Calculate risk score, diversification metrics, asset exposure |
| `get_dca_opportunities` | Detect optimal DCA opportunities based on market conditions |
| `get_liquidation_risk` | Analyze liquidation risk for leveraged positions |
| `set_target_allocation` | Define target portfolio allocation for rebalancing |
| `get_rebalance_suggestion` | Get suggested trades to reach target allocation |
| `enable_auto_rebalance` | Enable automatic portfolio rebalancing on schedule |

> **Note:** AI Strategy tools return structured data that the connected LLM (Claude Desktop/ChatGPT) analyzes to provide recommendations. No separate OpenAI API key required.

## Dynamic Token Resolution

The swap system uses a three-tier resolution strategy:

1. **Static Cache (Fast)** - 45 popular tokens for instant lookups
2. **Thirdweb Bridge API** - Thousands of tokens via real-time API
3. **Contract Address** - Manual input for new/unlisted tokens

### Supported Token Formats

```
# By symbol (most common)
swap_tokens ETH USDC 0.1 ethereum

# By contract address (for new tokens)
swap_tokens 0x123...abc USDC 100 ethereum
```

## Connect to AI Assistants

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "https://mindfi-mcp.your-subdomain.workers.dev/mcp/default/sse"
    }
  }
}
```

### ChatGPT (via Actions)

1. Go to GPT Builder > Configure > Actions
2. Import OpenAPI schema from `/api/tools` endpoint
3. Configure authentication with Thirdweb secret key

See `CHATGPT_INTEGRATION.md` for detailed setup.

### MCP Inspector (Testing)

```bash
npx @modelcontextprotocol/inspector
# Connect to: http://localhost:8080/mcp/test/sse
```

## Architecture

### Technology Stack

- **Runtime**: Cloudflare Workers (global edge computing)
- **State**: Durable Objects (session isolation, persistent alerts)
- **Framework**: Nullshot MCP + Hono
- **Language**: TypeScript

### Service Layer

| Service | Responsibility |
|---------|----------------|
| `ThirdwebToolboxService` | Blockchain operations, wallet queries, token resolution |
| `ThirdwebEngineService` | Backend wallet management, autonomous execution |
| `CoinGeckoService` | Real-time price data, token ID resolution |
| `SwapExecutionAgent` | Swap orchestration, route optimization |
| `NaturalLanguageRouterAgent` | Query interpretation, tool routing |

### Data Flow

```
User Query → NaturalLanguageRouter → MCP Tool → Service Layer → External API
                                                      ↓
                                               Durable Object Storage
```

## File Structure

```
mcp/
├── src/
│   ├── server.ts           # Main MCP server (DefiMcpServer)
│   ├── tools.ts             # Tool definitions with Zod schemas
│   ├── services/
│   │   ├── ThirdwebToolboxService.ts  # Blockchain operations
│   │   ├── ThirdwebEngineService.ts   # Autonomous trading
│   │   └── CoinGeckoService.ts        # Price data
│   └── agents/
│       ├── swap/
│       │   └── SwapExecutionAgent.ts  # Swap orchestration
│       └── router/
│           └── NaturalLanguageRouterAgent.ts  # Query routing
├── wrangler.toml            # Cloudflare Workers config
├── package.json
└── tsconfig.json
```

## Testing

### Health Check

```bash
curl http://localhost:8080/health
```

### List Tools

```bash
curl http://localhost:8080/tools
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector
```

## Deployment

### Production URL

```
https://mindfi-mcp.your-subdomain.workers.dev
```

### Deploy Commands

```bash
# Deploy to Cloudflare Workers
pnpm deploy

# View logs
wrangler tail

# Check secrets
wrangler secret list
```

## Troubleshooting

### Common Issues

1. **"Token not found"** - Try using contract address instead of symbol
2. **"Insufficient balance"** - Ensure wallet has enough tokens + gas
3. **"Rate limited"** - Add COINGECKO_API_KEY for higher limits
4. **"Connection failed"** - Check THIRDWEB_SECRET_KEY is valid

### Debug Logging

Server logs show detailed information:
- Token resolution attempts
- API response structures
- Swap execution flow

View logs with `wrangler tail` in production.

## License

MIT

## Links

- [Thirdweb Documentation](https://portal.thirdweb.com/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [CoinGecko API](https://www.coingecko.com/en/api)
