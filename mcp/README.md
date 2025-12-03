# MindFi MCP Server

DeFi MCP server using Nullshot framework. Provides DeFi tools via Model Context Protocol.

## Deployment

```bash
cd mcp
pnpm install
pnpm deploy
```

## Configuration

Set environment variables in `.dev.vars`:
- `THIRDWEB_SECRET_KEY` - Required
- `THIRDWEB_CLIENT_ID` - Optional
- `COINGECKO_API_KEY` - Optional

## Endpoints

- `GET /mcp/:sessionId/sse` - SSE endpoint for Claude Desktop
- `GET /health` - Health check

## MCP Tools

1. `get_wallet_balance` - Check wallet balance
2. `get_token_price` - Get token price
3. `swap_tokens` - Swap tokens
4. `monitor_price` - Set price alert
5. `get_portfolio` - Get multi-chain portfolio
6. `transfer_tokens` - Transfer tokens

## Connect to Claude Desktop

After deployment, update Claude Desktop config:
```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "https://your-mcp-worker.workers.dev/mcp/default/sse"
    }
  }
}
```

## Architecture

- **MCP Server**: `DefiMcpServer` extends `McpHonoServerDO`
- **Tools**: 6 DeFi tools with Zod schemas
- **Resources**: 1 resource (defi_stats)
- **State**: Cloudflare Durable Objects for alerts

