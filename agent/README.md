# MindFi Agent

AI-powered DeFi agent using Nullshot framework.

## Deployment

```bash
cd backend/agent
pnpm install
pnpm deploy
```

## Configuration

1. Set environment variables in `.dev.vars`:
   - `ANTHROPIC_API_KEY` - Required
   - `THIRDWEB_SECRET_KEY` - Required
   - `COINGECKO_API_KEY` - Optional
   - `MODEL_ID` - Optional (default: claude-3-5-sonnet-20241022)

2. Update `mcp.json` with your MCP server URL:
   ```json
   {
     "mcpServers": {
       "mindfi-defi": {
         "url": "https://your-mcp-worker.workers.dev/mcp/default/sse"
       }
     }
   }
   ```

## Endpoints

- `POST /agent/chat/:sessionId` - Chat with agent
- `GET /health` - Health check

## Architecture

- **Agent**: `MindFiAgent` extends `AiSdkAgent`
- **MCP Integration**: Uses `ToolboxService` to connect to MCP server
- **State**: Cloudflare Durable Objects for session persistence

