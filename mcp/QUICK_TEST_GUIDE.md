# 🧪 Quick Test Guide - MCP Server

## 🚀 Cara Test dengan MCP Inspector

### Step 1: Jalankan MCP Inspector

```bash
cd mcp
pnpm inspector
```

Browser akan terbuka otomatis di `http://localhost:5173`

### Step 2: Connect ke MCP Server

**Di MCP Inspector UI:**

1. **Pilih Transport:** `SSE` (Server-Sent Events)
2. **Masukkan URL:**
   ```
   https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=test
   ```
3. **Klik "Connect"**

Setelah connect, tools akan muncul di sidebar kiri.

---

## 🧪 Test Tools

### 1. Test `get_token_price` (Paling Mudah)

**Tool:** `get_token_price`

**Parameters:**
```json
{
  "token": "ethereum"
}
```

**Expected Result:**
- Price dalam USD
- 24h change
- Market cap

---

### 2. Test `get_wallet_balance`

**Tool:** `get_wallet_balance`

**Parameters:**
```json
{
  "address": "0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047",
  "chain": "ethereum"
}
```

**Expected Result:**
- Balance per token
- USD values
- Token details

---

### 3. Test `get_portfolio`

**Tool:** `get_portfolio`

**Parameters:**
```json
{
  "address": "0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047"
}
```

**Expected Result:**
- Balances across multiple chains
- Ethereum, BSC, Polygon, Avalanche

---

### 4. Test `monitor_price`

**Tool:** `monitor_price`

**Parameters:**
```json
{
  "token": "ethereum",
  "targetPrice": 3000,
  "condition": "above"
}
```

**Expected Result:**
- Success message
- Alert stored in Durable Object

---

### 5. Test `swap_tokens`

**Tool:** `swap_tokens`

**Parameters:**
```json
{
  "amount": "100",
  "fromChain": "ethereum",
  "toChain": "avalanche",
  "fromToken": "USDC",
  "toToken": "XAVA"
}
```

**Expected Result:**
- Swap route information
- Estimated output amount
- (Note: Route finding only, tidak execute swap)

---

### 6. Test `transfer_tokens`

**Tool:** `transfer_tokens`

**Parameters:**
```json
{
  "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "10",
  "token": "USDC",
  "chain": "ethereum"
}
```

**Expected Result:**
- Validation result
- (Note: May not execute without wallet setup)

---

## 📊 Test Resource

### Test `defi_stats` Resource

1. Klik tab **"Resources"** di MCP Inspector
2. Pilih `defi://stats`
3. Klik **"Read Resource"**

**Expected Result:**
```json
{
  "supportedChains": ["ethereum", "bsc", "polygon", "avalanche"],
  "supportedOperations": ["swap", "balance", "payment", "transfer"],
  "timestamp": 1234567890
}
```

---

## ✅ Testing Checklist

- [ ] Connect ke MCP server berhasil
- [ ] Tools muncul di sidebar
- [ ] `get_token_price` - Test dengan "ethereum"
- [ ] `get_wallet_balance` - Test dengan valid address
- [ ] `get_portfolio` - Test multi-chain
- [ ] `monitor_price` - Test alert storage
- [ ] `swap_tokens` - Test route finding
- [ ] `transfer_tokens` - Test validation
- [ ] `defi_stats` resource - Test resource access

---

## 🐛 Troubleshooting

### Error: "Cannot connect to server"
- ✅ Pastikan MCP server sudah deployed
- ✅ Test health endpoint: `curl https://mindfi-mcp.akusiapasij252.workers.dev/health`
- ✅ Pastikan URL benar dengan `?sessionId=test`

### Error: "Tool not found"
- ✅ Pastikan sudah connect ke server
- ✅ Refresh browser
- ✅ Check console untuk error messages

### Error: "API key not configured"
- ✅ Pastikan secrets sudah di-set di Cloudflare Workers
- ✅ Check `.dev.vars` untuk local testing

---

## 🎯 Quick Test Commands

**Test Health:**
```bash
curl https://mindfi-mcp.akusiapasij252.workers.dev/health
```

**Test Server Info:**
```bash
curl https://mindfi-mcp.akusiapasij252.workers.dev/
```

---

**Happy Testing! 🚀**


