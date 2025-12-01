# MCP Tools Testing Guide

## 🧪 Testing All MCP Tools

### Prerequisites

1. **Environment Variables**
   ```bash
   # Create .dev.vars file
   THIRDWEB_SECRET_KEY=your-thirdweb-secret-key
   THIRDWEB_CLIENT_ID=your-client-id  # optional
   COINGECKO_API_KEY=your-coingecko-key
   XAVA_TREASURY_ADDRESS=0x...  # optional
   ```

2. **Install Dependencies**
   ```bash
   cd mcp
   pnpm install
   ```

## 🚀 Method 1: Test with Wrangler Dev

### Start Server
```bash
cd mcp
pnpm dev
```

Server will start on `http://localhost:8787`

### Test Endpoints

1. **Health Check**
   ```bash
   curl http://localhost:8787/health
   ```

2. **MCP Server Info**
   ```bash
   curl http://localhost:8787/?sessionId=test
   ```

3. **MCP SSE Endpoint** (for MCP Inspector)
   ```
   http://localhost:8787/sse?sessionId=test
   ```

## 🧪 Method 2: Test with MCP Inspector

1. **Start MCP Server**
   ```bash
   cd mcp
   pnpm dev
   ```

2. **Start MCP Inspector** (if installed)
   ```bash
   # Install MCP Inspector globally
   pnpm add -g @modelcontextprotocol/inspector
   
   # Run inspector
   mcp-inspector
   ```

3. **Connect to Server**
   - URL: `http://localhost:8787/sse`
   - Session ID: `test-session`

4. **Test Tools**
   - Use Inspector UI to call each tool
   - Verify responses

## 📋 Tools to Test

### 1. `get_wallet_balance`
**Test Case:**
```json
{
  "address": "0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047",
  "chain": "ethereum"
}
```

**Expected:**
- Returns wallet balance with token details
- Includes USD values if available

### 2. `get_token_price`
**Test Case:**
```json
{
  "token": "ethereum"
}
```

**Expected:**
- Returns current token price
- Includes price in USD

### 3. `swap_tokens`
**Test Case:**
```json
{
  "amount": "100",
  "fromChain": "ethereum",
  "toChain": "avalanche",
  "fromToken": "USDC",
  "toToken": "XAVA"
}
```

**Expected:**
- Returns swap route information
- Includes estimated output amount

### 4. `create_payment`
**Test Case:**
```json
{
  "amount": "100",
  "token": "USDC",
  "chainId": "1",
  "description": "Test payment"
}
```

**Expected:**
- Returns payment creation result
- Includes payment ID

### 5. `monitor_price`
**Test Case:**
```json
{
  "token": "ethereum",
  "targetPrice": 3000,
  "condition": "above"
}
```

**Expected:**
- Returns success message
- Alert stored in Durable Object storage

### 6. `get_portfolio`
**Test Case:**
```json
{
  "address": "0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047"
}
```

**Expected:**
- Returns balances across multiple chains
- Includes Ethereum, BSC, Polygon, Avalanche

### 7. `transfer_tokens`
**Test Case:**
```json
{
  "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "10",
  "token": "USDC",
  "chain": "ethereum"
}
```

**Expected:**
- Returns transfer result
- Includes transaction hash (if executed)

## 🔍 Manual Testing Steps

### Step 1: Verify Server Starts
```bash
cd mcp
pnpm dev
```

Check for:
- ✅ Server starts without errors
- ✅ Port 8787 is listening
- ✅ No TypeScript errors

### Step 2: Test Health Endpoint
```bash
curl http://localhost:8787/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

### Step 3: Test MCP Endpoint
```bash
curl "http://localhost:8787/?sessionId=test"
```

Expected: Server info with endpoints

### Step 4: Test Each Tool

Use MCP Inspector or create test script to call each tool with sample parameters.

## 🐛 Troubleshooting

### Issue: "THIRDWEB_SECRET_KEY is not configured"
**Solution:**
- Create `.dev.vars` file with `THIRDWEB_SECRET_KEY=your-key`
- Or set environment variable: `export THIRDWEB_SECRET_KEY=your-key`

### Issue: "COINGECKO_API_KEY is not configured"
**Solution:**
- Add to `.dev.vars`: `COINGECKO_API_KEY=your-key`
- Or set environment variable

### Issue: Server won't start
**Solution:**
- Check `wrangler.toml` configuration
- Verify Durable Object binding is correct
- Check for TypeScript errors: `pnpm build`

### Issue: Tools return errors
**Solution:**
- Verify API keys are valid
- Check network connectivity
- Review tool implementation in `src/tools.ts`
- Check service implementations in `src/services/`

## ✅ Pre-Deployment Checklist

- [ ] All tools tested locally
- [ ] Health endpoint responds
- [ ] MCP endpoint accessible
- [ ] All tools return expected responses
- [ ] Error handling works correctly
- [ ] Environment variables configured
- [ ] No TypeScript errors
- [ ] No runtime errors in logs

## 📝 Test Results Template

```
Tool: get_wallet_balance
Status: ✅ PASS
Response: {...}
Duration: 250ms

Tool: get_token_price
Status: ✅ PASS
Response: {...}
Duration: 180ms

Tool: swap_tokens
Status: ✅ PASS
Response: {...}
Duration: 1200ms

...
```

## 🚀 Next Steps After Testing

1. **Fix any failing tests**
2. **Document any known limitations**
3. **Update README with test results**
4. **Deploy to Cloudflare Workers**

