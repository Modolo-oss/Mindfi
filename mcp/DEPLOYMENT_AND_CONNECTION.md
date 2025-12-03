# 🚀 MCP Server - Deployment & Connection Guide

## ✅ Status: READY TO DEPLOY & CONNECT

MCP server sudah **fully tested (100% pass)** dan siap untuk:
- ✅ Deploy ke Cloudflare Workers
- ✅ Connect ke Claude Desktop
- ✅ Connect ke LLM Agents lainnya (via ToolboxService)

---

## 📋 Pre-Deployment Checklist

- [x] ✅ All tools tested (6 tools + 1 resource)
- [x] ✅ Server endpoints working
- [x] ✅ SSE endpoint accessible
- [x] ✅ APIs connected (CoinGecko & Thirdweb)
- [x] ✅ Durable Objects configured
- [x] ✅ Environment variables ready

---

## 🚀 Deployment Steps

### 1. Deploy to Cloudflare Workers

```bash
cd mcp
pnpm deploy
```

Atau dengan wrangler langsung:
```bash
npx wrangler deploy
```

### 2. Set Environment Variables (Secrets)

Set secrets di Cloudflare Workers dashboard atau via CLI:

```bash
# Via CLI
npx wrangler secret put THIRDWEB_SECRET_KEY
npx wrangler secret put THIRDWEB_CLIENT_ID
npx wrangler secret put COINGECKO_API_KEY
```

Atau set di Cloudflare Dashboard:
1. Go to Workers & Pages → Your Worker → Settings → Variables
2. Add secrets:
   - `THIRDWEB_SECRET_KEY`
   - `THIRDWEB_CLIENT_ID` (optional)
   - `COINGECKO_API_KEY`

### 3. Get Deployment URL

Setelah deploy, kamu akan dapat URL seperti:
```
https://mindfi-mcp-production.USERNAME.workers.dev
```

Atau custom domain jika sudah setup.

---

## 🔌 Connect to Claude Desktop

### Step 1: Get SSE Endpoint URL

**Production:**
```
https://your-worker.workers.dev/sse?sessionId=default
```

**Local (for testing):**
```
http://localhost:8787/sse?sessionId=default
```

### Step 2: Configure Claude Desktop

Edit Claude Desktop configuration file:

**macOS:**
```bash
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Windows:**
```bash
%APPDATA%\Claude\claude_desktop_config.json
```

**Linux:**
```bash
~/.config/Claude/claude_desktop_config.json
```

### Step 3: Add MCP Server Config

```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "https://your-worker.workers.dev/sse?sessionId=default",
      "description": "MindFi DeFi MCP Server - Wallet balance, token prices, swaps, portfolio, transfers"
    }
  }
}
```

**Untuk local testing:**
```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "http://localhost:8787/sse?sessionId=default",
      "description": "MindFi DeFi MCP Server (local)"
    }
  }
}
```

### Step 4: Restart Claude Desktop

Restart Claude Desktop untuk load MCP server.

### Step 5: Verify Connection

1. Open Claude Desktop
2. Check MCP server status (should show "Connected")
3. Try asking Claude: "What tools do you have access to?"
4. Claude should list all 6 MindFi tools

---

## 🤖 Connect to Other LLM Agents

### Via ToolboxService (Nullshot Framework)

Jika agent menggunakan Nullshot Framework dengan `ToolboxService`:

**1. Update `mcp.json` di agent project:**

```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "https://your-worker.workers.dev/sse?sessionId=default"
    }
  }
}
```

**2. Agent akan otomatis load tools:**

```typescript
import { ToolboxService } from "@nullshot/agent";
import mcpConfig from "./mcp.json";

export class MyAgent extends AiSdkAgent<Env> {
  constructor(state: DurableObjectState, env: Env, model: LanguageModel) {
    super(state, env, model, [
      new ToolboxService(env, mcpConfig) // Auto-loads MindFi tools
    ]);
  }
}
```

### Via Direct MCP Client

Untuk agent custom yang tidak pakai Nullshot:

```typescript
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";

const transport = new SSEClientTransport(
  new URL("https://your-worker.workers.dev/sse?sessionId=default")
);

const client = new Client({
  name: "my-agent",
  version: "1.0.0",
}, {
  capabilities: {}
});

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log("Available tools:", tools);
```

---

## 🧪 Testing Connection

### Test SSE Endpoint

```bash
# Production
curl https://your-worker.workers.dev/sse?sessionId=test

# Local
curl http://localhost:8787/sse?sessionId=test
```

Should return Server-Sent Events stream.

### Test with MCP Inspector

```bash
# Install inspector
npm install -g @modelcontextprotocol/inspector

# Start inspector
mcp-inspector

# Connect to:
# Production: https://your-worker.workers.dev/sse?sessionId=test
# Local: http://localhost:8787/sse?sessionId=test
```

### Test Tools via Claude Desktop

1. Ask Claude: "Check the price of Ethereum"
2. Claude should use `get_token_price` tool
3. Should return current ETH price

---

## 📊 Available Tools (After Connection)

Setelah connected, agent akan punya akses ke:

1. **get_wallet_balance** - Check wallet balance on any chain
2. **get_token_price** - Get real-time token prices
3. **swap_tokens** - Find swap routes (cross-chain)
4. **monitor_price** - Set price alerts
5. **get_portfolio** - Get multi-chain portfolio
6. **transfer_tokens** - Transfer tokens

Plus 1 resource:
- **defi_stats** - DeFi statistics and market data

---

## 🔍 Troubleshooting

### MCP Server Not Connecting

1. **Check endpoint is accessible:**
   ```bash
   curl https://your-worker.workers.dev/health
   ```

2. **Check Cloudflare Workers logs:**
   ```bash
   npx wrangler tail
   ```

3. **Verify Durable Object binding:**
   - Check `wrangler.toml` has `DEFI_MCP_SERVER` binding
   - Verify migration is applied

### Claude Desktop Not Showing Tools

1. **Check Claude Desktop logs:**
   - Look for MCP connection errors
   - Verify JSON config is valid

2. **Verify SSE endpoint:**
   - Endpoint should return Server-Sent Events stream
   - Check CORS headers if accessing from different origin

3. **Check environment variables:**
   - Ensure all required secrets are set in Cloudflare
   - Verify API keys are valid

### Tools Not Working

1. **Check API keys:**
   - Verify `THIRDWEB_SECRET_KEY` is valid
   - Verify `COINGECKO_API_KEY` is valid

2. **Check server logs:**
   ```bash
   npx wrangler tail
   ```

3. **Test tools directly:**
   ```bash
   pnpm test
   ```

---

## 📝 Notes

- **SSE Transport**: MCP server uses SSE (Server-Sent Events) for real-time communication
- **Session-based**: Each session gets its own Durable Object instance
- **Auto-discovery**: Tools are automatically available once connected
- **Separate from Agent**: MCP server is separate from Agent endpoint (`/agent/chat`)

---

## ✅ Quick Start Summary

1. **Deploy:**
   ```bash
   cd mcp
   pnpm deploy
   ```

2. **Set secrets:**
   ```bash
   npx wrangler secret put THIRDWEB_SECRET_KEY
   npx wrangler secret put COINGECKO_API_KEY
   ```

3. **Configure Claude Desktop:**
   ```json
   {
     "mcpServers": {
       "mindfi-defi": {
         "url": "https://your-worker.workers.dev/sse?sessionId=default"
       }
     }
   }
   ```

4. **Restart Claude Desktop & Test!**

---

**Status:** ✅ READY FOR PRODUCTION


