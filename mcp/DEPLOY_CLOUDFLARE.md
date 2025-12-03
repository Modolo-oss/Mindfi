# 🚀 Deploy MCP Server ke Cloudflare Workers

## 📋 Prerequisites

1. **Cloudflare Account** - Sign up di [cloudflare.com](https://cloudflare.com)
2. **Wrangler CLI** - Sudah terinstall (via `pnpm` atau `npm`)
3. **API Keys Ready**:
   - `THIRDWEB_SECRET_KEY`
   - `COINGECKO_API_KEY`
   - `THIRDWEB_CLIENT_ID` (optional)

---

## 🎯 Method 1: Deploy via Wrangler CLI (Recommended)

### Step 1: Login ke Cloudflare

```bash
cd mcp
npx wrangler login
```

Ini akan buka browser untuk login ke Cloudflare account.

### Step 2: Set Environment Variables (Secrets)

Set secrets via CLI:

```bash
# Set Thirdweb Secret Key
npx wrangler secret put THIRDWEB_SECRET_KEY

# Set CoinGecko API Key
npx wrangler secret put COINGECKO_API_KEY

# Set Thirdweb Client ID (optional)
npx wrangler secret put THIRDWEB_CLIENT_ID
```

Saat diminta, paste API key yang sesuai.

### Step 3: Deploy

```bash
npx wrangler deploy
```

Atau dengan pnpm:

```bash
pnpm deploy
```

### Step 4: Get Deployment URL

Setelah deploy, kamu akan dapat output seperti:

```
✨  Deployed to https://mindfi-mcp-production.USERNAME.workers.dev
```

**SSE Endpoint URL:**
```
https://mindfi-mcp-production.USERNAME.workers.dev/sse?sessionId=default
```

---

## 🎯 Method 2: Deploy via Cloudflare Dashboard (GitHub Actions)

### Step 1: Setup GitHub Repository

Pastikan code sudah di-push ke GitHub:
```bash
git push origin main
```

### Step 2: Connect Repository di Cloudflare

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Navigate to **Workers & Pages**
3. Click **Create Application**
4. Select **Pages** or **Workers**
5. Connect your GitHub repository

### Step 3: Configure Build Settings

**Project name:**
```
mindfi-mcp
```

**Build command:**
```
pnpm run build
```
*(Optional - Cloudflare Workers auto-builds TypeScript)*

**Deploy command:**
```
npx wrangler deploy
```

**Path:**
```
/mcp
```

**Branch:**
```
main
```

### Step 4: Set Environment Variables

Di Cloudflare Dashboard:

1. Go to your Worker → **Settings** → **Variables**
2. Add secrets:
   - `THIRDWEB_SECRET_KEY` = `your-secret-key`
   - `COINGECKO_API_KEY` = `your-api-key`
   - `THIRDWEB_CLIENT_ID` = `your-client-id` (optional)

**Important:** Use **"Encrypted"** (secrets) for sensitive values, not plain variables.

### Step 5: Configure Durable Objects

1. Go to **Settings** → **Durable Objects**
2. Verify binding:
   - **Name:** `DEFI_MCP_SERVER`
   - **Class Name:** `DefiMcpServer`
3. Apply migration if needed

### Step 6: Deploy

Click **Deploy** atau push ke GitHub (auto-deploy jika CI/CD enabled).

---

## 🎯 Method 3: Deploy via GitHub Actions (CI/CD)

### Step 1: Create GitHub Actions Workflow

Create file: `.github/workflows/deploy-mcp.yml`

```yaml
name: Deploy MCP Server

on:
  push:
    branches:
      - main
    paths:
      - 'mcp/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
        working-directory: ./mcp
      
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: ./mcp
          command: deploy
```

### Step 2: Set GitHub Secrets

Di GitHub repository → **Settings** → **Secrets and variables** → **Actions**:

1. `CLOUDFLARE_API_TOKEN` - Get from Cloudflare Dashboard
2. `CLOUDFLARE_ACCOUNT_ID` - Get from Cloudflare Dashboard

**Get API Token:**
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/profile/api-tokens)
2. Click **Create Token**
3. Use **Edit Cloudflare Workers** template
4. Copy token

**Get Account ID:**
1. Go to Cloudflare Dashboard
2. Select any domain
3. Account ID is in the right sidebar

### Step 3: Set Worker Secrets

Set secrets di Cloudflare Dashboard (Method 2, Step 4) atau via CLI:

```bash
npx wrangler secret put THIRDWEB_SECRET_KEY
npx wrangler secret put COINGECKO_API_KEY
```

---

## ✅ Verify Deployment

### Test Health Endpoint

```bash
curl https://your-worker.workers.dev/health
```

Expected response:
```json
{"status":"ok","timestamp":1234567890}
```

### Test SSE Endpoint

```bash
curl https://your-worker.workers.dev/sse?sessionId=test
```

Should return Server-Sent Events stream.

### Test with MCP Inspector

1. Install MCP Inspector:
   ```bash
   npm install -g @modelcontextprotocol/inspector
   ```

2. Start Inspector:
   ```bash
   mcp-inspector
   ```

3. Connect to:
   ```
   https://your-worker.workers.dev/sse?sessionId=test
   ```

---

## 🔧 Troubleshooting

### Error: "No Durable Object binding found"

**Solution:**
1. Check `wrangler.toml` has correct binding:
   ```toml
   [[durable_objects.bindings]]
   name = "DEFI_MCP_SERVER"
   class_name = "DefiMcpServer"
   ```

2. Apply migration:
   ```bash
   npx wrangler deploy
   ```

### Error: "Secret not found"

**Solution:**
Set secrets via CLI:
```bash
npx wrangler secret put THIRDWEB_SECRET_KEY
npx wrangler secret put COINGECKO_API_KEY
```

### Error: "Module not found"

**Solution:**
1. Install dependencies:
   ```bash
   cd mcp
   pnpm install
   ```

2. Check `package.json` has all dependencies

### Deployment URL Not Working

**Solution:**
1. Check Cloudflare Dashboard → Workers → Your Worker → **Triggers**
2. Verify custom domain or workers.dev URL
3. Check logs: `npx wrangler tail`

---

## 📝 Quick Deploy Checklist

- [ ] Login to Cloudflare: `npx wrangler login`
- [ ] Set secrets: `npx wrangler secret put THIRDWEB_SECRET_KEY`
- [ ] Set secrets: `npx wrangler secret put COINGECKO_API_KEY`
- [ ] Deploy: `npx wrangler deploy`
- [ ] Test health: `curl https://your-worker.workers.dev/health`
- [ ] Test SSE: `curl https://your-worker.workers.dev/sse?sessionId=test`
- [ ] Update Claude Desktop config with deployment URL

---

## 🔗 Next Steps

After deployment:

1. **Connect to Claude Desktop:**
   - Edit `claude_desktop_config.json`
   - Add MCP server URL
   - Restart Claude Desktop

2. **Connect to Agent:**
   - Update `agent/mcp.json` with deployment URL
   - Agent will auto-load tools

3. **Monitor:**
   - Check logs: `npx wrangler tail`
   - Monitor usage in Cloudflare Dashboard

---

**Ready to deploy?** Start with Method 1 (Wrangler CLI) - it's the fastest! 🚀


