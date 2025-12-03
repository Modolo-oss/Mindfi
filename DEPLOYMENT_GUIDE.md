# MindFi MCP Deployment Guide

## 📋 Struktur Deployment

**MCP Server Deployment:**

1. **MCP** (Deploy ke Cloudflare Workers)

## 🚀 Deployment Steps

### 1️⃣ Deploy MCP

```bash
cd mcp
pnpm install
pnpm deploy
```

**Output:**
- URL: `https://mindfi-mcp.akusiapasij252.workers.dev`
- SSE Endpoint: `https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default`

**Set Secrets:**
```bash
cd mcp
wrangler secret put THIRDWEB_SECRET_KEY
wrangler secret put COINGECKO_API_KEY
```

## 🔗 Connection Flow

```
MCP Client (Claude Desktop, MCP Inspector, etc.)
         ↓
      MCP Server (Cloudflare Workers)
         ↓
      Thirdweb API / CoinGecko API
```

## 📋 Summary

| Component | Platform | URL Example |
|-----------|----------|-------------|
| **MCP** | Cloudflare Workers | `https://mindfi-mcp.akusiapasij252.workers.dev` |

## ✅ Checklist

- [ ] Deploy MCP → Dapat URL
- [ ] Set secrets (THIRDWEB_SECRET_KEY, COINGECKO_API_KEY)
- [ ] Test health endpoint: `curl https://mindfi-mcp.akusiapasij252.workers.dev/health`
- [ ] Connect to Claude Desktop (see [mcp/CONNECTION_GUIDE.md](./mcp/CONNECTION_GUIDE.md))
- [ ] Test tools via MCP Inspector

## 💡 Notes

- **Serverless** - no server management needed!
- After deployment, URL will remain the same (unless changed)
- SSE endpoint supports multiple sessions via `sessionId` parameter

## 🔌 Connect to Clients

### Claude Desktop
See [mcp/CONNECTION_GUIDE.md](./mcp/CONNECTION_GUIDE.md) for detailed instructions.

### MCP Inspector
```bash
cd mcp
pnpm inspector
```
Connect to: `https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=test`
