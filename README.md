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
- **Backend**: Cloudflare Workers (Nullshot TypeScript Agent Framework)
- **Frontend**: Next.js 16 with React 19
- **AI**: Thirdweb AI Chat API for natural language processing
- **Blockchain**: Thirdweb MCP/HTTP APIs for DeFi operations
- **Storage**: Cloudflare Durable Objects for conversation persistence
- **Pricing**: CoinGecko API for token price data
- **Package Manager**: pnpm workspaces (monorepo)

### Project Structure

```
mindfi/
├── backend/              # Cloudflare Workers backend
│   ├── src/
│   │   ├── agents/      # DeFi agents (portfolio, swap, payment, buyback, strategy)
│   │   ├── services/    # Services (Thirdweb AI, CoinGecko, Thirdweb Toolbox)
│   │   ├── framework/   # Nullshot framework types
│   │   ├── index.ts     # Worker entry point
│   │   └── router.ts     # API routes
│   ├── scripts/         # Helper scripts
│   ├── mcp.json         # Thirdweb MCP configuration
│   ├── wrangler.toml    # Cloudflare Workers config
│   └── .dev.vars        # Environment variables (not in git)
├── frontend/            # Next.js chat interface
│   ├── app/             # Next.js app router
│   │   ├── page.tsx     # Main chat page
│   │   └── layout.tsx   # Root layout
│   ├── components/
│   │   ├── terminal-chat/  # Chat UI components
│   │   └── ui/             # Reusable UI components
│   └── lib/             # API client & utilities
├── docs/                # Architecture & implementation docs
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

2. **Configure backend environment**
   ```bash
   cd backend
   cp .dev.vars.example .dev.vars
   ```
   Edit `.dev.vars` and fill in:
   - `THIRDWEB_SECRET_KEY` - Your Thirdweb secret key (required)
   - `THIRDWEB_CLIENT_ID` - Your Thirdweb client ID (optional, fallback)
   - `XAVA_TREASURY_ADDRESS` - Treasury wallet address for payments/buybacks
   - `COINGECKO_API_KEY` - CoinGecko API key (optional)

3. **Configure frontend environment** (optional)
   ```bash
   cd frontend
   cp env.example .env.local
   ```
   Edit `.env.local` if you need to change the backend URL (default: `http://localhost:8787`)

4. **Run services** (from root directory)
   ```bash
   # Run backend only (port 8787)
   pnpm dev
   
   # Run frontend only (port 3000)
   pnpm dev:frontend
   
   # Run both simultaneously
   pnpm dev:all
   ```

5. **Open the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8787

### Alternative: Run from individual directories

You can also run commands from within each directory:

**Backend:**
```bash
cd backend
pnpm install
pnpm dev
```

**Frontend:**
```bash
cd frontend
pnpm install
pnpm dev
```

### Quick smoke test
```bash
# From root directory (recommended)
pnpm autonomous

# Or from backend directory
cd backend && pnpm autonomous
```
This ensures the environment is ready and prints example commands for the `/agent/chat` endpoint.

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

### Supported Commands

| Command | Description | Example |
|---------|-------------|---------|
| `balance` | Check wallet balance with USD estimation | "check balance 0x... BNB" |
| `price` | Get token price | "price of ETH" or "berapa harga XAVA" |
| `swap` | Cross-chain token swap | "swap 100 USDC from ethereum to avalanche to XAVA" |
| `bridge` | Bridge tokens between chains | "bridge 50 USDC from ethereum to polygon" |
| `payment` | Create X402 payment | "create payment 150 USD tier strategy" |
| `buyback` | Execute XAVA buyback | "buyback 500 XAVA from treasury" |
| `strategy` | Get portfolio strategy | "what strategy do you recommend?" |

### API Usage

You can also interact with MindFi via REST API:

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

## 🔧 Development

### Available Scripts

**From root directory:**
- `pnpm dev` - Run backend only
- `pnpm dev:frontend` - Run frontend only
- `pnpm dev:all` - Run both backend and frontend
- `pnpm build` - Build both backend and frontend
- `pnpm build:backend` - Build backend only
- `pnpm build:frontend` - Build frontend only
- `pnpm deploy:backend` - Deploy backend to Cloudflare
- `pnpm autonomous` - Run environment check

**Note:** All root-level commands use pnpm workspace filters (`--filter mindfi-backend` and `--filter mindfi-frontend`) to run commands in the correct packages without needing to `cd` into directories.

### Environment Variables

**Backend** (`.dev.vars`):
- `THIRDWEB_SECRET_KEY` - Thirdweb secret key (required)
- `THIRDWEB_CLIENT_ID` - Thirdweb client ID (optional fallback)
- `XAVA_TREASURY_ADDRESS` - Treasury wallet address
- `COINGECKO_API_KEY` - CoinGecko API key (optional)

**Frontend** (`.env.local`):
- `NEXT_PUBLIC_MINDFI_API_URL` - Backend API URL (default: `http://localhost:8787`)

### Testing

- `pnpm autonomous` (from root) → environment check plus sample commands
- `pnpm dev` (from root) → runs the backend worker (Miniflare in local mode)
- `pnpm dev:frontend` (from root) → runs the Next.js frontend on port 3000
- `pnpm dev:all` (from root) → runs both backend and frontend simultaneously

## 🎯 Key Features Explained

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

## 📚 Documentation

- [Project Vision](./docs/project-vision.md) - Long-term vision and roadmap
- [Implementation Plan](./docs/implementation-plan.md) - Technical implementation details
- [Nullshot Key Points](./docs/nullshot-keypoints.md) - Platform capabilities and features
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
