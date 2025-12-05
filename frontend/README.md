# MindFi Terminal Frontend

Terminal-style chat interface for MindFi DeFi platform.

## 🚀 Deploy to Vercel

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Install Vercel CLI** (if not already installed):
```bash
npm i -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Navigate to frontend directory**:
```bash
cd frontend
```

4. **Deploy**:
```bash
vercel
```

5. **Set Environment Variables**:
```bash
vercel env add ANTHROPIC_API_KEY
vercel env add MCP_SERVER_URL
```

6. **Deploy to Production**:
```bash
vercel --prod
```

### Option 2: Deploy via GitHub Integration

1. **Push code to GitHub** (already done ✅)

2. **Go to Vercel Dashboard**: https://vercel.com/new

3. **Import your repository**: `Modolo-oss/Mindfi`

4. **Configure Project**:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. **Add Environment Variables**:
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `MCP_SERVER_URL` - (Optional) MCP server URL
   - `NEXT_PUBLIC_MCP_SERVER_URL` - (Optional) Public MCP server URL

6. **Deploy** - Vercel will automatically deploy on every push to main branch

## 📋 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | ✅ Yes | Anthropic API key for Claude AI |
| `MCP_SERVER_URL` | ❌ No | MCP server URL (default: https://mindfi-mcp.akusiapasij252.workers.dev) |
| `NEXT_PUBLIC_MCP_SERVER_URL` | ❌ No | Public MCP server URL for client-side |

## 🛠️ Local Development

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5000`

## 📦 Build

```bash
npm run build
npm start
```

## 🔗 Links

- **MCP Server**: https://mindfi-mcp.akusiapasij252.workers.dev
- **GitHub**: https://github.com/Modolo-oss/Mindfi

