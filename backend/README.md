# MindFi Agent (Nullshot Hackathon Track 1)

**Autonomous DeFi Agent** built with the **Nullshot Framework**, integrating **Thirdweb** for blockchain operations and **Anthropic Claude** for intelligence.

This agent is designed to be a fully autonomous "DeFi Employee" that can manage portfolios, execute swaps, bridge tokens, and monitor market conditions 24/7 without user intervention.

## 🚀 Key Features

### 1. Nullshot Agent Framework
- Built on top of **@nullshot/agent** (Vercel AI SDK wrapper).
- Deployed on **Cloudflare Workers** + **Durable Objects** for stateful, long-running agent processes.
- **Model Agnostic**: Configured for **Claude 3.5 Sonnet/Haiku** (via Anthropic API) but supports any Vercel AI SDK provider.

### 2. Custom Thirdweb Integration (Edge-Optimized)
- **Lightweight MCP Layer**: Instead of using the heavy Thirdweb SDK, we built a custom `ThirdwebToolboxService` that interacts directly with **Thirdweb Engine & Nebula HTTP APIs**.
- **Zero-Dependency**: Optimized for Edge environments (low latency, no cold start issues).
- **Capabilities**:
  - 🔄 **Cross-Chain Swaps**: Intelligent routing across chains.
  - 🌉 **Bridging**: Seamless asset transfer.
  - 💰 **Balance Checks**: Multi-chain wallet monitoring.
  - 💳 **Payments**: Crypto payment generation (X402 standard).

### 3. Autonomous Price Monitoring (Bonus)
- **Proactive Alarms**: Uses **Durable Object Alarms** to wake up the agent periodically.
- **Self-Triggered**: The agent can set its own "wake up calls" to check prices and alert the user.
- **Example**: "Alert me if ETH goes above $3000" -> Agent stores alert -> Agent wakes up every 10s to check -> Agent notifies when condition met.

## 🛠 Tech Stack

- **Framework**: Nullshot Agent Framework (`@nullshot/agent`)
- **Runtime**: Cloudflare Workers (Durable Objects)
- **AI**: Anthropic Claude 3.5 (via `@ai-sdk/anthropic`)
- **Blockchain**: Thirdweb Engine API (Custom HTTP Integration)
- **Data**: CoinGecko API

## 📦 Project Structure

```
backend/
├── src/
│   ├── agents/
│   │   ├── MindFiAgent.ts       # Main Agent Logic (Durable Object)
│   │   └── swap/                # Swap execution logic
│   ├── tools/
│   │   └── defiTools.ts         # MCP Tools (Swap, Bridge, Price, Monitor)
│   ├── services/
│   │   ├── ThirdwebToolboxService.ts # Custom Thirdweb HTTP Client
│   │   └── CoinGeckoService.ts       # Price Data
│   ├── index.ts                 # Worker Entry Point
│   └── router.ts                # Hono Router
├── wrangler.toml                # Cloudflare Config
└── package.json
```

## ⚡ Setup & Deployment

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Configure Secrets**
   Copy `.dev.vars.example` to `.dev.vars` and fill in:
   ```bash
   ANTHROPIC_API_KEY=sk-ant-...
   THIRDWEB_SECRET_KEY=...
   THIRDWEB_CLIENT_ID=...
   COINGECKO_API_KEY=...
   ```

3. **Run Locally**
   ```bash
   pnpm dev
   ```

4. **Deploy to Cloudflare**
   ```bash
   pnpm deploy
   ```

## 🤖 Usage Examples

**Chat with the Agent:**

> "Swap 100 USDC on Ethereum to XAVA on Avalanche"

> "Check my balance on Base"

> "What is the price of Bitcoin?"

> "Alert me if ETH drops below $2500" (Triggers Autonomous Alarm)

## 🏆 Hackathon Tracks

**Track 1: Agents using Nullshot Framework**
- ✅ **Nullshot Integration**: Fully implemented using `@nullshot/agent`.
- ✅ **Partner Tech**: Deep integration with **Thirdweb** (Co-Sponsor).
- ✅ **Innovation**: Custom lightweight HTTP wrapper for Thirdweb & Autonomous Alarms.

---
*Built with ❤️ for the Nullshot Hackathon*
