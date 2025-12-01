# Frontend Deployment Guide

## 🚀 Deployment Options

Frontend adalah **Next.js app** yang bisa di-deploy di berbagai platform:

### ✅ Recommended: Vercel

**Vercel** adalah platform terbaik untuk Next.js:

```bash
cd frontend
vercel deploy
```

**Environment Variables di Vercel:**
- `NEXT_PUBLIC_MINDFI_API_URL` = `https://your-agent-worker.workers.dev`

### Alternative Platforms

1. **Netlify**
   ```bash
   cd frontend
   netlify deploy --prod
   ```

2. **Cloudflare Pages**
   ```bash
   cd frontend
   wrangler pages deploy .next
   ```

3. **Railway/Render**
   - Connect GitHub repo
   - Set build command: `pnpm build`
   - Set start command: `pnpm start`

## 🔌 Backend Connection

Frontend menghubungi **Agent** (bukan MCP langsung):

```
Frontend → Agent (via API) → MCP (via ToolboxService)
```

### Environment Variables

**Local Development:**
```env
NEXT_PUBLIC_MINDFI_API_URL=http://localhost:8787
```

**Production:**
```env
NEXT_PUBLIC_MINDFI_API_URL=https://your-agent-worker.workers.dev
```

### API Endpoints

Frontend menggunakan:
- `POST /agent/chat/:sessionId` - Send chat messages
- `GET /` - Health check

## 📋 Deployment Steps

1. **Deploy Agent** (Cloudflare Workers)
   ```bash
   cd agent
   pnpm deploy
   # Get URL: https://your-agent-worker.workers.dev
   ```

2. **Deploy Frontend** (Vercel/Netlify/etc)
   ```bash
   cd frontend
   # Set NEXT_PUBLIC_MINDFI_API_URL to Agent URL
   vercel deploy
   ```

3. **Update Environment Variables**
   - Set `NEXT_PUBLIC_MINDFI_API_URL` di platform deployment
   - Value: Agent deployment URL

## 🎯 Architecture

```
User → Frontend (Vercel) → Agent (Cloudflare Workers) → MCP (Cloudflare Workers)
```

- **Frontend**: Next.js di Vercel/Netlify
- **Agent**: Cloudflare Workers (serverless)
- **MCP**: Cloudflare Workers (serverless)

## 💡 Notes

- Frontend **TIDAK** perlu connect ke MCP langsung
- Frontend hanya perlu connect ke Agent
- Agent yang akan handle MCP connection via ToolboxService
- Setelah deploy Agent, update `NEXT_PUBLIC_MINDFI_API_URL` di frontend

