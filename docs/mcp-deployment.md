# MindFi MCP Server - Deployment & Claude Desktop Connection

## 🚀 Deployment

### Deploy to Cloudflare Workers

1. **Build the project:**
   ```bash
   cd backend
   pnpm build
   ```

2. **Deploy:**
   ```bash
   pnpm deploy
   # or
   wrangler deploy
   ```

3. **Set environment variables (secrets):**
   ```bash
   wrangler secret put ANTHROPIC_API_KEY
   wrangler secret put THIRDWEB_SECRET_KEY
   wrangler secret put COINGECKO_API_KEY
   ```

4. **Get your deployment URL:**
   After deployment, you'll get a URL like: `https://mindfi.workers.dev`

## 🔌 Connect to Claude Desktop

### Option 1: Using SSE Endpoint (Recommended)

1. **Get your deployment URL:**
   - Local: `http://localhost:8787`
   - Production: `https://your-worker.workers.dev`

2. **Configure Claude Desktop:**
   
   Edit Claude Desktop configuration file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

3. **Add MCP server configuration:**
   ```json
   {
     "mcpServers": {
       "mindfi-defi": {
         "url": "https://your-worker.workers.dev/mcp/default/sse",
         "description": "MindFi DeFi MCP server - provides DeFi tools (swap, balance, payment, portfolio, etc.)"
       }
     }
   }
   ```

4. **Restart Claude Desktop**

### Option 2: Using Local Development

For local testing:

```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "http://localhost:8787/mcp/default/sse",
      "description": "MindFi DeFi MCP server (local)"
    }
  }
}
```

Make sure to run `pnpm dev` in the backend directory first.

## 🧪 Testing MCP Server

### Test SSE Endpoint

```bash
# Test local endpoint
curl http://localhost:8787/mcp/default/sse

# Test production endpoint
curl https://your-worker.workers.dev/mcp/default/sse
```

### Test with MCP Inspector

Nullshot provides an MCP Inspector for testing:

```bash
# Start backend
cd backend
pnpm dev

# MCP Inspector should be available at:
# http://localhost:8787/sse
```

## 📋 Available MCP Tools

Once connected, Claude Desktop will have access to these tools:

1. **get_wallet_balance** - Check wallet balance on a specific chain
2. **get_token_price** - Get current token price from CoinGecko
3. **swap_tokens** - Swap tokens on a specific chain
4. **create_payment** - Create a subscription payment via Thirdweb X402
5. **monitor_price** - Monitor token price and set alert
6. **get_portfolio** - Get wallet portfolio across multiple chains
7. **transfer_tokens** - Transfer tokens to another address

## 🔍 Troubleshooting

### MCP Server Not Connecting

1. **Check endpoint is accessible:**
   ```bash
   curl https://your-worker.workers.dev/mcp/default/sse
   ```

2. **Check Cloudflare Workers logs:**
   ```bash
   wrangler tail
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

## 📝 Notes

- MCP server uses SSE (Server-Sent Events) transport
- Each session gets its own Durable Object instance
- Tools are automatically available to Claude Desktop once connected
- MCP server is separate from the Agent endpoint (`/agent/chat`)

