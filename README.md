# MindFi

**Where minds meet DeFi.** MindFi is an AI-powered multi-agent DeFi platform built for Nullshot Hacks Season 0. The platform enables natural language interaction with DeFi operations across multiple blockchains, powered by Thirdweb's infrastructure and AI capabilities.

## 🚀 Features

### Core Capabilities
- **🤖 AI-Powered Natural Language Processing**: Chat with MindFi in any language - English, Indonesian, Spanish, Chinese, and more
- **💱 Cross-Chain Token Swaps**: Execute swaps across 200+ blockchains with intelligent route optimization
- **🌉 Token Bridging**: Seamlessly bridge tokens between different chains
- **💰 Wallet Balance Checking**: Check wallet balances with automatic USD value estimation
- **💵 Token Price Queries**: Get real-time token prices from CoinGecko
- **💳 X402 Payments**: Create and manage subscription payments via Thirdweb X402
- **📊 Portfolio Strategy**: Get AI-powered portfolio recommendations
- **🔄 XAVA Buybacks**: Execute automated XAVA token buybacks

### Smart Features
- **🧠 Persistent Conversation Memory**: MindFi remembers your conversation history across sessions using Cloudflare Durable Objects
- **🌍 Multilingual Support**: Understands and responds in multiple languages naturally
- **🔍 Smart Chain Detection**: Automatically detects the correct blockchain from token mentions (e.g., "BNB" → BSC, "AVAX" → Avalanche)
- **💲 USD Value Estimation**: Automatically calculates USD values for wallet balances
- **⌨️ Real-time Typing Indicators**: Visual feedback while AI processes your requests
- **📱 Responsive Terminal UI**: Beautiful terminal-style interface optimized for all devices

## 🏗️ Architecture

### Tech Stack
- **Backend**: Cloudflare Workers (Nullshot TypeScript Agent & MCP Framework)
- **Frontend**: Next.js 16 with React 19
- **AI**: Anthropic Claude (via Vercel AI SDK)
- **Agent Framework**: Nullshot AiSdkAgent with ToolboxService
- **MCP Framework**: Nullshot McpHonoServerDO for DeFi tools
- **Blockchain**: Thirdweb HTTP APIs for DeFi operations
- **Storage**: Cloudflare Durable Objects for conversation persistence
- **Pricing**: CoinGecko API for token price data
- **Package Manager**: pnpm workspaces (monorepo)

### Project Structure

```
mindfi/
├── agent/               # Agent deployment (Cloudflare Workers)
│   ├── src/
│   │   ├── agents/
│   │   │   ├── MindFiAgent.ts      # Main AI agent (extends AiSdkAgent)
│   │   │   ├── swap/               # Swap execution agent
│   │   │   └── payments/           # Payment agent
│   │   ├── services/
│   │   │   └── CoinGeckoService.ts # Price service
│   │   ├── types.ts                # TypeScript types
│   │   ├── index.ts                # Worker entry point
│   │   └── router.ts               # Agent API routes
│   ├── mcp.json                    # MCP server configuration
│   ├── wrangler.toml               # Cloudflare Workers config
│   └── package.json                # Agent dependencies
│
├── mcp/                 # MCP deployment (Cloudflare Workers)
│   ├── src/
│   │   ├── mcp/
│   │   │   └── DefiMcpServer.ts    # DeFi MCP server (extends McpHonoServerDO)
│   │   ├── agents/
│   │   │   ├── swap/               # Swap execution agent
│   │   │   └── payments/           # Payment agent
│   │   ├── services/
│   │   │   ├── CoinGeckoService.ts # Price service
│   │   │   └── ThirdwebToolboxService.ts # Thirdweb integration
│   │   ├── types.ts                # TypeScript types
│   │   ├── index.ts                # Worker entry point
│   │   └── router.ts               # MCP API routes
│   ├── wrangler.toml               # Cloudflare Workers config
│   └── package.json                # MCP dependencies
│
├── frontend/            # Frontend deployment (Vercel/Next.js)
│   ├── app/             # Next.js app router
│   │   ├── page.tsx     # Main chat page
│   │   └── layout.tsx   # Root layout
│   ├── components/
│   │   ├── terminal-chat/  # Chat UI components
│   │   └── ui/             # Reusable UI components
│   └── lib/             # API client & utilities
│
├── backend/             # Legacy folder (docs only)
│   └── docs/            # Old documentation
│
├── docs/                # Architecture & implementation docs
├── DEPLOYMENT_GUIDE.md  # Deployment instructions
└── pnpm-workspace.yaml  # Monorepo configuration
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and pnpm installed
- Cloudflare account (for deployment)
- Thirdweb account with API credentials
- CoinGecko API key (optional, for enhanced price data)

### Quick Start (from root)

1. **Install all dependencies**
   ```bash
   pnpm install
   ```
   This installs dependencies for both backend and frontend using pnpm workspace.

2. **Configure Agent environment**
   ```bash
   cd agent
   # Create .dev.vars file manually or copy from example
   ```
   Edit `agent/.dev.vars` and fill in:
   - `ANTHROPIC_API_KEY` - Your Anthropic API key (required for AI)
   - `THIRDWEB_SECRET_KEY` - Your Thirdweb secret key (required for DeFi operations)
   - `THIRDWEB_CLIENT_ID` - Your Thirdweb client ID (optional, fallback)
   - `COINGECKO_API_KEY` - CoinGecko API key (optional, for price data)
   - `MODEL_ID` - AI model ID (optional, default: claude-3-5-sonnet-20241022)

3. **Configure MCP environment**
   ```bash
   cd mcp
   # Create .dev.vars file manually
   ```
   Edit `mcp/.dev.vars` and fill in:
   - `THIRDWEB_SECRET_KEY` - Your Thirdweb secret key (required for DeFi operations)
   - `THIRDWEB_CLIENT_ID` - Your Thirdweb client ID (optional, fallback)
   - `COINGECKO_API_KEY` - CoinGecko API key (optional, for price data)

4. **Configure frontend environment** (optional)
   ```bash
   cd frontend
   cp env.example .env.local
   ```
   Edit `.env.local` if you need to change the agent URL (default: `http://localhost:8787`)

5. **Run services** (from individual directories)

   **Run Agent:**
   ```bash
   cd agent
   pnpm dev
   ```
   Agent will run on http://localhost:8787

   **Run MCP** (in another terminal):
   ```bash
   cd mcp
   pnpm dev
   ```
   MCP will run on http://localhost:8788 (or next available port)

   **Run Frontend** (in another terminal):
   ```bash
   cd frontend
   pnpm dev
   ```
   Frontend will run on http://localhost:3000

6. **Update Agent MCP configuration**
   After MCP is running, update `agent/mcp.json` with the MCP URL:
   ```json
   {
     "mcpServers": {
       "mindfi-defi": {
         "url": "http://localhost:8788/mcp/default/sse"
       }
     }
   }
   ```

7. **Open the application**
   - Frontend: http://localhost:3000
   - Agent API: http://localhost:8787
   - MCP API: http://localhost:8788

### Quick smoke test
```bash
# Test Agent
cd agent
pnpm dev
# Then test: curl http://localhost:8787/health

# Test MCP
cd mcp
pnpm dev
# Then test: curl http://localhost:8788/health
```

## 💬 Usage Examples

### Natural Language Commands

MindFi understands natural language in multiple languages. Here are some examples:

**English:**
- "Check balance of wallet 0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047 on BSC"
- "What's the price of ETH?"
- "Swap 100 USDC from Ethereum to XAVA on Avalanche"

**Indonesian:**
- "Cek balance wallet saya 0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047 BNB"
- "Berapa harga XAVA sekarang?"
- "Swap 100 USDC dari Ethereum ke XAVA di Avalanche"

**Spanish:**
- "Balance de la billetera 0x... en BSC"
- "¿Cuál es el precio de ETH?"

### Supported Commands (via MCP Tools)

| Command | MCP Tool | Description | Example |
|---------|----------|-------------|---------|
| `balance` | `get_wallet_balance` | Check wallet balance with USD estimation | "check balance 0x... BNB" |
| `price` | `get_token_price` | Get token price | "price of ETH" or "berapa harga XAVA" |
| `swap` | `swap_tokens` | Cross-chain token swap | "swap 100 USDC from ethereum to avalanche to XAVA" |
| `payment` | `create_payment` | Create X402 payment | "create payment 150 USD tier strategy" |
| `monitor` | `monitor_price` | Set price alert | "alert me when ETH goes above $3000" |
| `portfolio` | `get_portfolio` | Get multi-chain portfolio | "show my portfolio across all chains" |
| `transfer` | `transfer_tokens` | Transfer tokens | "transfer 10 USDC to 0x..." |

### API Usage

**Agent Endpoint:**
```bash
curl -X POST http://localhost:8787/agent/chat/demo-session \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "cek balance wallet saya 0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047 BNB"
      }
    ]
  }'
```

**MCP Server Endpoint (SSE):**
```bash
# MCP server is accessible at:
http://localhost:8788/mcp/default/sse
```

The MCP server exposes DeFi tools that are automatically available to the agent via ToolboxService. The agent connects to MCP using the URL configured in `agent/mcp.json`.

## 🔧 Development

### Available Scripts

**From individual directories:**

**Agent:**
```bash
cd agent
pnpm dev          # Run agent locally
pnpm build        # Build agent
pnpm deploy       # Deploy to Cloudflare Workers
```

**MCP:**
```bash
cd mcp
pnpm dev          # Run MCP locally
pnpm build        # Build MCP
pnpm deploy       # Deploy to Cloudflare Workers
```

**Frontend:**
```bash
cd frontend
pnpm dev          # Run frontend locally
pnpm build        # Build frontend
vercel deploy     # Deploy to Vercel
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

### Environment Variables

**Agent** (`agent/.dev.vars`):
- `ANTHROPIC_API_KEY` - Anthropic API key (required for AI)
- `THIRDWEB_SECRET_KEY` - Thirdweb secret key (required for DeFi operations)
- `THIRDWEB_CLIENT_ID` - Thirdweb client ID (optional fallback)
- `COINGECKO_API_KEY` - CoinGecko API key (optional)
- `MODEL_ID` - AI model ID (optional, default: claude-3-5-sonnet-20241022)

**MCP** (`mcp/.dev.vars`):
- `THIRDWEB_SECRET_KEY` - Thirdweb secret key (required for DeFi operations)
- `THIRDWEB_CLIENT_ID` - Thirdweb client ID (optional fallback)
- `COINGECKO_API_KEY` - CoinGecko API key (optional)

**Frontend** (`frontend/.env.local`):
- `NEXT_PUBLIC_MINDFI_API_URL` - Agent API URL (default: `http://localhost:8787`)

### Testing

- `cd agent && pnpm dev` → runs the agent worker (Miniflare in local mode)
- `cd mcp && pnpm dev` → runs the MCP server (Miniflare in local mode)
- `cd frontend && pnpm dev` → runs the Next.js frontend on port 3000

**Note:** Run Agent, MCP, and Frontend in separate terminals for local development.

## 🎯 Key Features Explained

### Nullshot Framework Integration
- **Agent**: `MindFiAgent` extends `AiSdkAgent` from Nullshot framework
- **MCP Server**: `DefiMcpServer` extends `McpHonoServerDO` for DeFi tools
- **Tool Integration**: Tools are automatically injected via `ToolboxService` middleware
- **Session Management**: Cloudflare Durable Objects for persistent conversation state

### Smart Chain Detection
MindFi automatically detects the correct blockchain from token mentions:
- "BNB" → BNB Smart Chain (BSC, chain ID: 56)
- "AVAX" → Avalanche (chain ID: 43114)
- "MATIC" → Polygon (chain ID: 137)
- "ETH" → Ethereum (chain ID: 1)

### Conversation Memory
Using Cloudflare Durable Objects, MindFi maintains conversation history across sessions, allowing for context-aware interactions and follow-up questions.

### Multilingual Support
The AI understands and responds in multiple languages, making MindFi accessible to users worldwide. The system automatically detects the user's language and responds accordingly.

### USD Value Estimation
When checking wallet balances, MindFi automatically fetches token prices and calculates USD values for each token, providing a complete financial overview.

### MCP Tools
All DeFi operations are exposed as MCP tools:
- `get_wallet_balance` - Check wallet balances
- `get_token_price` - Get token prices
- `swap_tokens` - Execute token swaps
- `create_payment` - Create X402 payments
- `monitor_price` - Set price alerts
- `get_portfolio` - Get multi-chain portfolio
- `transfer_tokens` - Transfer tokens

## 📚 Documentation

- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Complete deployment instructions for Agent, MCP, and Frontend
- [Deployment Options](./docs/deployment-options.md) - Deployment platform options and recommendations
- [Project Vision](./docs/project-vision.md) - Long-term vision and roadmap
- [Implementation Plan](./docs/implementation-plan.md) - Technical implementation details
- [Nullshot Key Points](./docs/nullshot-keypoints.md) - Platform capabilities and features
- [MCP Deployment Guide](./docs/mcp-deployment.md) - How to deploy MCP server and connect to Claude Desktop
- [Frontend README](./frontend/README.md) - Frontend-specific documentation

## 🚧 Current Limitations

- Full swap/bridge execution requires Thirdweb wallet authentication & funding. MindFi reports errors back to the user clearly.
- Strategy module currently returns placeholder responses—ready for custom AI/logic integration.
- Some advanced features are in development (see roadmap in `docs/project-vision.md`).

## 🤝 Contributing

This project is built for Nullshot Hacks Season 0. Contributions, suggestions, and feedback are welcome!

## 📄 License

Private repository - see repository settings for license details.

## 🔗 Links

- Repository: [Modolo-oss/Mindfi](https://github.com/Modolo-oss/Mindfi) (private)
- Thirdweb: https://thirdweb.com
- Nullshot: https://nullshot.com
- CoinGecko: https://www.coingecko.com

---

**Built with ❤️ for Nullshot Hacks Season 0**
