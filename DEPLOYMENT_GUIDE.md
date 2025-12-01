# MindFi Deployment Guide

## 📋 Struktur Deployment

**YA, 3 KALI DEPLOY:**

1. **MCP** (Deploy PERTAMA)
2. **Agent** (Deploy KEDUA - butuh MCP URL)
3. **Frontend** (Deploy KETIGA - butuh Agent URL)

## 🚀 Deployment Steps

### 1️⃣ Deploy MCP (PERTAMA)

```bash
cd mcp
pnpm install
pnpm deploy
```

**Output:**
- URL: `https://mindfi-mcp.workers.dev`
- SSE Endpoint: `https://mindfi-mcp.workers.dev/mcp/default/sse`

**Set Secrets:**
```bash
wrangler secret put THIRDWEB_SECRET_KEY
wrangler secret put COINGECKO_API_KEY
```

### 2️⃣ Deploy Agent (KEDUA)

**Update `agent/mcp.json` dengan MCP URL:**
```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "https://mindfi-mcp.workers.dev/mcp/default/sse"
    }
  }
}
```

**Deploy:**
```bash
cd agent
pnpm install
pnpm deploy
```

**Output:**
- URL: `https://mindfi-agent.workers.dev`
- Chat Endpoint: `https://mindfi-agent.workers.dev/agent/chat/:sessionId`

**Set Secrets:**
```bash
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put THIRDWEB_SECRET_KEY
wrangler secret put COINGECKO_API_KEY
```

### 3️⃣ Deploy Frontend (KETIGA)

**Set Environment Variable:**
```env
NEXT_PUBLIC_MINDFI_API_URL=https://mindfi-agent.workers.dev
```

**Deploy ke Vercel:**
```bash
cd frontend
vercel deploy
```

**Atau via Vercel Dashboard:**
1. Connect GitHub repo
2. Set environment variable: `NEXT_PUBLIC_MINDFI_API_URL`
3. Deploy

**Output:**
- URL: `https://mindfi.vercel.app`

## 🔗 Connection Flow

```
User → Frontend (Vercel)
         ↓
      Agent (Cloudflare Workers)
         ↓
      MCP (Cloudflare Workers)
```

## 📋 Summary

| Component | Platform | URL Example |
|-----------|----------|-------------|
| **MCP** | Cloudflare Workers | `https://mindfi-mcp.workers.dev` |
| **Agent** | Cloudflare Workers | `https://mindfi-agent.workers.dev` |
| **Frontend** | Vercel | `https://mindfi.vercel.app` |

## ✅ Checklist

- [ ] Deploy MCP → Dapat URL
- [ ] Update `agent/mcp.json` dengan MCP URL
- [ ] Deploy Agent → Dapat URL
- [ ] Set `NEXT_PUBLIC_MINDFI_API_URL` = Agent URL
- [ ] Deploy Frontend → Dapat URL
- [ ] Test: Frontend → Agent → MCP

## 💡 Notes

- **MCP harus di-deploy dulu** karena Agent butuh MCP URL
- **Agent harus di-deploy dulu** karena Frontend butuh Agent URL
- Semua **serverless** - no server management needed!
- Setelah deploy, semua URL akan tetap sama (kecuali jika diubah)

