# MindFi MCP Server

**Where minds meet DeFi.** MindFi MCP Server provides DeFi tools via Model Context Protocol (MCP). Built with Nullshot MCP Framework on Cloudflare Workers.

## 🚀 Features

### Core Capabilities
- **🤖 Natural Language Processing**: AI-powered query interpretation that automatically routes to the right tool
- **🔐 Autonomous Wallet Management**: Connect wallet once, use it automatically for all operations (no need to provide address repeatedly)
- **🔐 Wallet Creation**: Create new EOA wallets for users automatically
- **💰 Wallet Balance Checking**: Check wallet balances with automatic USD value estimation (auto-uses connected wallet)
- **💵 Token Price Queries**: Get real-time token prices from CoinGecko
- **💱 Cross-Chain Token Swaps**: Execute swaps across 200+ blockchains
- **📊 Portfolio Management**: Get multi-chain portfolio overview (auto-uses connected wallet)
- **💸 Token Transfers**: Transfer tokens to any address
- **🔔 Price Monitoring & Auto-Swap**: Set price alerts and automatically trigger swaps when target price is reached (autonomous trading)

### Available MCP Tools

1. **`interpret_query`** - Interpret natural language query and automatically route to appropriate tool (e.g., "tunjukkan saldo ETH saya" → `get_wallet_balance`)
2. **`connect_wallet`** - Connect and save your wallet for this session (autonomous mode - wallet will be remembered)
3. **`get_my_wallet`** - Get your connected wallet address for this session
4. **`disconnect_wallet`** - Disconnect and clear your wallet from this session
5. **`create_wallet`** - Create a new EOA wallet for the user (returns address and private key)
6. **`get_wallet_balance`** - Check wallet balance on a specific chain (auto-uses connected wallet if address not provided)
7. **`get_token_price`** - Get current token price from CoinGecko
8. **`swap_tokens`** - Swap tokens across chains
9. **`monitor_price`** - Set price alert for tokens. Optionally trigger swap automatically when price is reached (autonomous trading)
10. **`get_portfolio`** - Get multi-chain portfolio (auto-uses connected wallet if address not provided)
11. **`transfer_tokens`** - Transfer tokens to another address

## 🏗️ Architecture

### Tech Stack
- **Runtime**: Cloudflare Workers (serverless)
- **MCP Framework**: Nullshot `McpHonoServerDO` for DeFi tools
- **Blockchain**: Thirdweb HTTP APIs for DeFi operations
- **Storage**: Cloudflare Durable Objects for state management (alerts, etc.)
- **Pricing**: CoinGecko API for token price data
- **Package Manager**: pnpm

### Project Structure

```
mindfi/
├── mcp/                          # MCP Server (standalone)
│   ├── src/
│   │   ├── server.ts            # MCP server (extends McpHonoServerDO)
│   │   ├── tools.ts             # MCP tools definitions
│   │   ├── resources.ts         # MCP resources definitions
│   │   ├── agents/
│   │   │   └── swap/
│   │   │       └── SwapExecutionAgent.ts
│   │   ├── services/
│   │   │   ├── CoinGeckoService.ts
│   │   │   └── ThirdwebToolboxService.ts
│   │   ├── types.ts
│   │   └── index.ts             # Worker entry point
│   ├── wrangler.toml            # Cloudflare Workers config
│   ├── package.json             # All dependencies here
│   ├── tsconfig.json
│   └── .dev.vars                # Local environment variables
│
├── docs/                        # Documentation
├── README.md                    # This file
└── DEPLOYMENT_GUIDE.md          # Deployment instructions
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+ and **pnpm** installed
- **Cloudflare account** (for deployment)
- **Thirdweb account** with API credentials
- **CoinGecko API key** (optional, for enhanced price data)

### Quick Start

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd mindfi/mcp
   pnpm install
   ```

2. **Configure environment**
   
   Create `mcp/.dev.vars` file:
   ```bash
   cd mcp
   cp .dev.vars.example .dev.vars  # If example exists
   # Or create manually
   ```
   
   Edit `mcp/.dev.vars`:
   ```env
   THIRDWEB_SECRET_KEY=your_thirdweb_secret_key
   THIRDWEB_CLIENT_ID=your_thirdweb_client_id  # Optional
   COINGECKO_API_KEY=your_coingecko_api_key    # Optional
   ```

3. **Run locally**
   ```bash
   cd mcp
   pnpm dev
   ```
   
   MCP server will run on `http://localhost:8787`

4. **Test MCP Server**
   ```bash
   # Health check
   curl http://localhost:8787/health
   
   # Test with MCP Inspector
   pnpm inspector
   # Then connect to: http://localhost:8787/sse?sessionId=test
   ```

## 🔧 Development

### Available Scripts

```bash
cd mcp

pnpm dev          # Run MCP server locally
pnpm build        # Build TypeScript (type checking)
pnpm deploy       # Deploy to Cloudflare Workers
pnpm inspector    # Run MCP Inspector for testing
pnpm test:tools   # Test tools directly
```

### Environment Variables

**Local Development** (`mcp/.dev.vars`):
- `THIRDWEB_SECRET_KEY` - Thirdweb secret key (required)
- `THIRDWEB_CLIENT_ID` - Thirdweb client ID (optional)
- `COINGECKO_API_KEY` - CoinGecko API key (optional)

**Production** (set via `wrangler secret`):
```bash
cd mcp
wrangler secret put THIRDWEB_SECRET_KEY
wrangler secret put COINGECKO_API_KEY
```

## 📦 Deployment

### Deploy to Cloudflare Workers

```bash
cd mcp
pnpm deploy
```

**Set Secrets:**
```bash
cd mcp
wrangler secret put THIRDWEB_SECRET_KEY
wrangler secret put COINGECKO_API_KEY
```

**Deployed URL:**
- **Base URL**: `https://mindfi-mcp.akusiapasij252.workers.dev`
- **SSE Endpoint**: `https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default`
- **Health Check**: `https://mindfi-mcp.akusiapasij252.workers.dev/health`

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed deployment instructions.

## 🔌 Connect to Claude Desktop

MindFi MCP bisa dipakai dari:
- **LOCAL** (pakai `pnpm dev`) → cocok untuk development + Claude Desktop di laptop yang sama
- **PRODUCTION** (Cloudflare Workers) → cocok untuk integrasi eksternal (ChatGPT, server lain, dsb.)

Lihat dokumen detail di `mcp/LOCAL_VS_PRODUCTION.md`.

### Claude Desktop (LOCAL via stdio bridge)

Mode ini tidak memakai `url` SSE langsung, tapi **command stdio** yang menjalankan bridge:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`  
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`  
**Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "mindfi-defi": {
      "command": "node",
      "args": [
        "C:\\Users\\Antidump\\Nullshot Hackathon\\mcp\\claude-stdio-bridge.cjs"
      ],
      "env": {
        "MCP_URL": "http://localhost:8787/sse?sessionId=default",
        "SESSION_ID": "default"
      }
    }
  }
}
```

Langkah cepat:
- Jalankan server lokal: `cd mcp && pnpm dev`
- Pastikan health: `http://localhost:8787/health`
- Restart Claude Desktop, aktifkan connector `mindfi-defi`

Script helper: jalankan `mcp/setup-local.ps1` atau `mcp/start-local.ps1` untuk auto-generate config dan start server.

### Claude / MCP Client Lain (PRODUCTION via SSE URL)

Jika client mendukung SSE MCP standard (contoh: MCP Inspector atau Nullshot tooling), gunakan:

```text
https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default
```

> Untuk Inspector lokal: jalankan `pnpm inspector` lalu connect ke `http://localhost:8787/sse?sessionId=default`.

See [mcp/CONNECTION_GUIDE.md](./mcp/CONNECTION_GUIDE.md) for detailed connection instructions.

## 🧪 Testing

### Using MCP Inspector

```bash
cd mcp
pnpm inspector
```

Then connect to: `https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=test`

### Test Tools Directly

```bash
cd mcp
pnpm test:tools
```

See [mcp/TEST_GUIDE.md](./mcp/TEST_GUIDE.md) for comprehensive testing instructions.

## 📚 Documentation

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[mcp/CONNECTION_GUIDE.md](./mcp/CONNECTION_GUIDE.md)** - How to connect to Claude Desktop
- **[mcp/FEATURES.md](./mcp/FEATURES.md)** - All available MCP tools and resources
- **[mcp/TEST_GUIDE.md](./mcp/TEST_GUIDE.md)** - Testing instructions
- **[mcp/THIRDWEB_INTEGRATION.md](./mcp/THIRDWEB_INTEGRATION.md)** - Thirdweb API integration details
- **[mcp/DEPLOY_CLOUDFLARE.md](./mcp/DEPLOY_CLOUDFLARE.md)** - Cloudflare deployment instructions

## 🎯 Key Features Explained

### Nullshot MCP Framework Integration
- **MCP Server**: `DefiMcpServer` extends `McpHonoServerDO` from Nullshot framework
- **Tools**: All DeFi operations exposed as MCP tools with Zod schemas for type safety
- **Resources**: Data resources for agent context
- **State Management**: Cloudflare Durable Objects for persistent state (price alerts, etc.)

### Multi-Chain Support
Supports 200+ blockchains via Thirdweb API:
- Ethereum
- BNB Smart Chain (BSC)
- Avalanche
- Polygon
- And 200+ more chains

### Real-Time Price Data
Integrated with CoinGecko API for accurate, real-time token prices and USD value calculations.

## 🔗 API Endpoints

- `GET /health` - Health check endpoint
- `GET /` - Server info endpoint + daftar endpoint lain
- `GET /sse?sessionId=<id>` - SSE endpoint untuk klien MCP (Inspector, dll.)
- `GET /mcp/:sessionId/*` - Endpoint MCP (JSON-RPC) untuk Nullshot/Workers
- `GET /api/tools?sessionId=<id>` - **List tools** dalam format OpenAI function (dipakai Claude bridge / ChatGPT)
- `POST /api/tools/:toolName?sessionId=<id>` - **Call tool** dengan body JSON argumen (wrapper di atas MCP `tools/call`)

## 🤝 Contributing

This project is built for **Nullshot Hacks Season 0**. Contributions, suggestions, and feedback are welcome!

## 📄 License

Private repository - see repository settings for license details.

## 🔗 Links

- **Repository**: [Modolo-oss/Mindfi](https://github.com/Modolo-oss/Mindfi) (private)
- **Thirdweb**: https://thirdweb.com
- **Nullshot**: https://nullshot.com
- **CoinGecko**: https://www.coingecko.com
- **MCP Specification**: https://modelcontextprotocol.io
- **Deployed MCP Server**: https://mindfi-mcp.akusiapasij252.workers.dev

---

**Built with ❤️ for Nullshot Hacks Season 0**
