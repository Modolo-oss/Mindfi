# Quick Start Guide - MCP Server Testing

## ✅ Setup Complete!

API keys sudah diisi di `.dev.vars`:
- ✅ THIRDWEB_SECRET_KEY
- ✅ THIRDWEB_CLIENT_ID  
- ✅ COINGECKO_API_KEY
- ⚠️  XAVA_TREASURY_ADDRESS (optional, skip untuk sekarang)

## 🚀 Start Server

```bash
cd mcp
pnpm dev
```

Server akan start di: `http://localhost:8787`

## 🧪 Quick Tests

### 1. Health Check
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

### 2. MCP Server Info
```bash
curl "http://localhost:8787/?sessionId=test"
```

### 3. Test Tools (via MCP Inspector)

**Option A: Use MCP Inspector**
1. Install: `pnpm add -g @modelcontextprotocol/inspector`
2. Run: `mcp-inspector`
3. Connect to: `http://localhost:8787/sse?sessionId=test`

**Option B: Manual Test with curl**
```bash
# Test get_token_price (doesn't require wallet)
# This will test CoinGecko API integration
```

## 📋 Available Tools to Test

1. **get_token_price** - Test CoinGecko API
   ```json
   {
     "token": "ethereum"
   }
   ```

2. **get_wallet_balance** - Test Thirdweb API
   ```json
   {
     "address": "0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047",
     "chain": "ethereum"
   }
   ```

3. **get_portfolio** - Test multi-chain balance
   ```json
   {
     "address": "0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047"
   }
   ```

4. **monitor_price** - Test storage (no API needed)
   ```json
   {
     "token": "ethereum",
     "targetPrice": 3000,
     "condition": "above"
   }
   ```

## ⚠️ Notes

- **Treasury Address**: Skip untuk sekarang, tidak diperlukan untuk testing basic tools
- **Swap/Payment/Transfer**: Tools ini mungkin memerlukan wallet setup tambahan
- **Focus Testing**: Mulai dengan `get_token_price` dan `get_wallet_balance` dulu

## 🐛 Troubleshooting

### Server won't start
- Check `.dev.vars` file exists
- Verify API keys are correct
- Check for TypeScript errors: `pnpm build`

### API errors
- Verify API keys are valid
- Check network connectivity
- Review error messages in console

## ✅ Next Steps

1. Start server: `pnpm dev`
2. Test health endpoint
3. Test tools one by one
4. Fix any errors
5. Ready for deployment!

