# 🚀 Setup Claude Desktop dengan MindFi MCP

## 📍 Lokasi File Config

### Windows
```
%APPDATA%\Claude\claude_desktop_config.json
```
Atau full path:
```
C:\Users\<YourUsername>\AppData\Roaming\Claude\claude_desktop_config.json
```

### macOS
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

### Linux
```
~/.config/Claude/claude_desktop_config.json
```

---

## 📝 Step-by-Step Setup

### Step 1: Download Claude Desktop
1. Buka: https://claude.ai/download
2. Download sesuai OS kamu
3. Install Claude Desktop

### Step 2: Cari Folder Config

**Windows:**
1. Tekan `Win + R`
2. Ketik: `%APPDATA%\Claude`
3. Tekan Enter
4. Jika folder tidak ada, buat folder `Claude` di dalam `AppData\Roaming`

**Atau via File Explorer:**
1. Buka File Explorer
2. Ketik di address bar: `%APPDATA%\Claude`
3. Tekan Enter

### Step 3: Buat/Edit File Config

1. Di folder `Claude`, buat file baru: `claude_desktop_config.json`
2. Copy isi dari file `mcp/claude_desktop_config.json` di project ini
3. Paste ke file tersebut

**Atau copy langsung:**

**Windows (PowerShell):**
```powershell
# Dari project root
Copy-Item "mcp\claude_desktop_config.json" "$env:APPDATA\Claude\claude_desktop_config.json"
```

**macOS/Linux:**
```bash
# Dari project root
cp mcp/claude_desktop_config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json
# atau untuk Linux:
cp mcp/claude_desktop_config.json ~/.config/Claude/claude_desktop_config.json
```

### Step 4: Restart Claude Desktop
1. Tutup Claude Desktop sepenuhnya
2. Buka lagi
3. Tools akan otomatis tersedia!

---

## ✅ Verifikasi

### Test di Claude Desktop:
1. Buka Claude Desktop
2. Mulai chat baru
3. Coba tanya:
   - "Cek harga ETH"
   - "Berapa balance wallet 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
   - "Swap 0.1 ETH ke USDC di Ethereum"

### Jika Tools Tidak Muncul:
1. ✅ Pastikan file config di lokasi yang benar
2. ✅ Pastikan format JSON valid (no trailing comma)
3. ✅ Restart Claude Desktop
4. ✅ Cek URL endpoint benar: `https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default`

---

## 📋 Isi File Config

```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default",
      "description": "MindFi DeFi MCP server - provides DeFi tools (swap, balance, price, portfolio, transfer, etc.)"
    }
  }
}
```

---

## 🛠️ Available Tools

Setelah connect, tools berikut tersedia:

1. **`get_wallet_balance`** - Cek balance wallet di chain tertentu
2. **`get_token_price`** - Cek harga token dari CoinGecko
3. **`swap_tokens`** - Swap tokens cross-chain
4. **`monitor_price`** - Set price alert untuk token
5. **`get_portfolio`** - Cek portfolio multi-chain
6. **`transfer_tokens`** - Transfer tokens ke address lain

---

## 🐛 Troubleshooting

### Error: "Cannot connect to MCP server"
- ✅ Test health endpoint: `curl https://mindfi-mcp.akusiapasij252.workers.dev/health`
- ✅ Pastikan MCP server sudah deployed
- ✅ Cek firewall/network

### Error: "Invalid JSON"
- ✅ Validasi JSON di: https://jsonlint.com
- ✅ Pastikan no trailing comma
- ✅ Pastikan semua quotes benar

### Tools tidak muncul
- ✅ Restart Claude Desktop
- ✅ Cek console log (jika ada)
- ✅ Test dengan MCP Inspector dulu

---

## 📚 Referensi

- [Claude Desktop Docs](https://claude.ai/docs)
- [MCP Specification](https://modelcontextprotocol.io)
- [Nullshot MCP Framework](https://nullshot.ai/docs/mcp)

---

**MCP Server URL:** `https://mindfi-mcp.akusiapasij252.workers.dev`


