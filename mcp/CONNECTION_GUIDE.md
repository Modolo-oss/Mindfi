# 🚀 Panduan Koneksi MCP Server

## 📋 Opsi untuk Test MCP

### ✅ **1. Claude Desktop** (Recommended - Native Support)
- **Status**: ✅ Fully Supported
- **Cara**: Konfigurasi file config
- **Endpoint**: SSE

### ✅ **2. MCP Inspector** (Untuk Testing)
- **Status**: ✅ Fully Supported  
- **Cara**: GUI tool untuk test MCP
- **Endpoint**: SSE/WebSocket

### ⚠️ **3. Cursor IDE** (Mungkin Support)
- **Status**: ⚠️ Perlu dicoba
- **Cara**: Konfigurasi `mcp.json` di folder `.cursor`
- **Endpoint**: SSE (jika support)

---

## 🎯 Opsi 1: Claude Desktop (Paling Mudah)

### Step 1: Download Claude Desktop
- Download dari: https://claude.ai/download
- Install sesuai OS kamu

### Step 2: Cari File Config

**Windows:**
```
%APPDATA%\Claude\claude_desktop_config.json
```
Atau:
```
C:\Users\<YourUsername>\AppData\Roaming\Claude\claude_desktop_config.json
```

**macOS:**
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

**Linux:**
```
~/.config/Claude/claude_desktop_config.json
```

### Step 3: Edit Config File

Buat/edit file `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default",
      "description": "MindFi DeFi MCP server - provides DeFi tools (swap, balance, price, portfolio, etc.)"
    }
  }
}
```

**Atau dengan session ID dinamis:**
```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "https://mindfi-mcp.akusiapasij252.workers.dev/sse",
      "description": "MindFi DeFi MCP server"
    }
  }
}
```

### Step 4: Restart Claude Desktop
- Tutup Claude Desktop
- Buka lagi
- Tools akan otomatis tersedia!

### Step 5: Test di Claude Desktop
Coba tanya:
- "Cek harga ETH"
- "Berapa balance wallet 0x..."
- "Swap 0.1 ETH ke USDC di Ethereum"

---

## 🔧 Opsi 2: MCP Inspector (Untuk Testing)

### Install MCP Inspector
```bash
pnpm add -g @modelcontextprotocol/inspector
```

### Run Inspector
```bash
mcp-inspector
```

### Connect ke MCP Server
1. Buka browser: http://localhost:5173
2. Pilih transport: **SSE**
3. Masukkan URL: `https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=test`
4. Klik **Connect**

### Test Tools
- Pilih tool dari list
- Isi parameter
- Klik **Call Tool**
- Lihat hasil

---

## 💻 Opsi 3: Cursor IDE (Experimental)

### Step 1: Cari File Config
File sudah ada di:
```
C:\Users\Antidump\.cursor\mcp.json
```

### Step 2: Edit Config
Edit file `C:\Users\Antidump\.cursor\mcp.json`:

```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default",
      "description": "MindFi DeFi MCP server - provides DeFi tools"
    }
  }
}
```

### Step 3: Restart Cursor
- Tutup Cursor IDE
- Buka lagi
- Coba chat dengan Cursor AI dan minta untuk pakai tools

**Note**: Cursor IDE support MCP masih experimental. Jika tidak work, gunakan Claude Desktop atau MCP Inspector.

---

## 🧪 Quick Test

### Test Health Endpoint
```bash
curl https://mindfi-mcp.akusiapasij252.workers.dev/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": 1234567890
}
```

### Test SSE Endpoint
```bash
curl -v https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=test
```

Expected:
- HTTP 200
- `Content-Type: text/event-stream`
- Connection tetap open (normal untuk SSE)

---

## 📝 Available Tools

Setelah connect, tools berikut tersedia:

1. **`get_wallet_balance`** - Cek balance wallet
2. **`get_token_price`** - Cek harga token
3. **`swap_tokens`** - Swap tokens
4. **`monitor_price`** - Set price alert
5. **`get_portfolio`** - Cek portfolio multi-chain
6. **`transfer_tokens`** - Transfer tokens

---

## 🐛 Troubleshooting

### Claude Desktop tidak detect tools
1. ✅ Pastikan file config di lokasi yang benar
2. ✅ Pastikan format JSON valid
3. ✅ Restart Claude Desktop
4. ✅ Cek URL endpoint benar

### Connection Error
1. ✅ Test health endpoint dulu
2. ✅ Pastikan MCP server sudah deployed
3. ✅ Cek firewall/network

### Tools tidak muncul
1. ✅ Cek console log di Claude Desktop
2. ✅ Test dengan MCP Inspector dulu
3. ✅ Pastikan sessionId valid

---

## ✅ Checklist

- [ ] MCP server sudah deployed
- [ ] Health endpoint return OK
- [ ] Config file dibuat/diedit
- [ ] Application (Claude/Cursor) di-restart
- [ ] Tools muncul di chat
- [ ] Test salah satu tool

---

## 🎯 Rekomendasi

**Untuk Production/Testing:**
1. **Claude Desktop** - Paling mudah, native support
2. **MCP Inspector** - Untuk debugging dan testing tools

**Untuk Development:**
- Test dengan MCP Inspector dulu
- Setelah OK, connect ke Claude Desktop
- Cursor IDE bisa dicoba (experimental)

---

**MCP Server URL:** `https://mindfi-mcp.akusiapasij252.workers.dev`

