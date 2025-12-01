# MCP Inspector Testing Guide

## 🎯 Apa itu MCP Inspector?

**MCP Inspector** adalah tool GUI untuk test MCP servers. Seperti Postman tapi khusus untuk MCP protocol.

## 📋 Cara Install & Test

### Step 1: Install MCP Inspector

```bash
# Install globally
pnpm add -g @modelcontextprotocol/inspector

# Atau dengan npm
npm install -g @modelcontextprotocol/inspector
```

### Step 2: Start MCP Server

```bash
cd mcp
pnpm dev
```

Server akan start di: `http://localhost:8787`

### Step 3: Start MCP Inspector

```bash
# Jalankan inspector
mcp-inspector
```

Atau:

```bash
# Dengan port custom
mcp-inspector --port 6274
```

Inspector akan buka di browser: `http://localhost:6274`

### Step 4: Connect ke Server

1. **Buka MCP Inspector** di browser
2. **Pilih transport:** SSE (Server-Sent Events)
3. **Masukkan URL:**
   ```
   http://localhost:8787/sse?sessionId=test
   ```
4. **Click "Connect"**

### Step 5: Test Tools

Setelah connected, kamu bisa:

1. **Lihat semua tools** di sidebar
2. **Click tool** yang mau ditest (misalnya `get_token_price`)
3. **Isi parameters:**
   ```json
   {
     "token": "ethereum"
   }
   ```
4. **Click "Execute"**
5. **Lihat hasil** di response panel

## 🧪 Contoh Test Tools

### Test 1: get_token_price

**Tool:** `get_token_price`
**Parameters:**
```json
{
  "token": "ethereum"
}
```

**Expected Result:**
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\"symbol\":\"ETH\",\"price\":3000,\"priceUsd\":3000,...}"
    }
  ]
}
```

### Test 2: get_wallet_balance

**Tool:** `get_wallet_balance`
**Parameters:**
```json
{
  "address": "0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047",
  "chain": "ethereum"
}
```

### Test 3: monitor_price

**Tool:** `monitor_price`
**Parameters:**
```json
{
  "token": "ethereum",
  "targetPrice": 3000,
  "condition": "above"
}
```

## 🔄 Alternative: Manual Test dengan curl

Jika tidak mau install Inspector, bisa test dengan curl (tapi lebih terbatas):

```bash
# Test health
curl http://localhost:8787/health

# Test root
curl http://localhost:8787/

# Test SSE (akan stream, perlu interrupt dengan Ctrl+C)
curl http://localhost:8787/sse?sessionId=test
```

## 📝 Visual Guide

```
┌─────────────────────────────────────┐
│   MCP Inspector (Browser)           │
│   http://localhost:6274             │
├─────────────────────────────────────┤
│  [Connect]                          │
│  URL: http://localhost:8787/sse     │
│  Session: test                      │
│                                     │
│  ✅ Connected                       │
│                                     │
│  Tools:                             │
│  ├─ get_wallet_balance              │
│  ├─ get_token_price  ← Click ini   │
│  ├─ swap_tokens                     │
│  └─ ...                             │
│                                     │
│  Parameters:                        │
│  {                                  │
│    "token": "ethereum"              │
│  }                                  │
│                                     │
│  [Execute] ← Click untuk test      │
│                                     │
│  Response:                          │
│  {                                  │
│    "content": [...]                 │
│  }                                  │
└─────────────────────────────────────┘
         ↓
    MCP Protocol
         ↓
┌─────────────────────────────────────┐
│   MCP Server                        │
│   http://localhost:8787             │
│   (Your server)                     │
└─────────────────────────────────────┘
```

## ✅ Checklist

- [ ] MCP Server running (`pnpm dev`)
- [ ] MCP Inspector installed (`pnpm add -g @modelcontextprotocol/inspector`)
- [ ] Inspector opened (`mcp-inspector`)
- [ ] Connected to server (`http://localhost:8787/sse?sessionId=test`)
- [ ] Tools visible in sidebar
- [ ] Tested at least one tool

## 🐛 Troubleshooting

### Inspector tidak bisa connect
- Pastikan server running: `pnpm dev`
- Check URL: `http://localhost:8787/sse?sessionId=test`
- Check console untuk error messages

### Tools tidak muncul
- Pastikan server sudah fully loaded
- Check server logs untuk errors
- Verify `configureServer()` dipanggil dengan benar

### Tool execution error
- Check API keys di `.dev.vars`
- Check server logs untuk detailed error
- Verify tool parameters sesuai schema

