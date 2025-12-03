# 🔧 Claude Desktop MCP Troubleshooting

## ❌ Error: "Required field 'command' is missing"

Claude Desktop membutuhkan field `command` untuk MCP server. Untuk SSE/URL-based MCP server, ada beberapa opsi:

### Opsi 1: Gunakan Wrapper Script (Recommended)

1. Install dependencies:
```bash
cd mcp
pnpm add @modelcontextprotocol/sdk
```

2. File `claude-sse-client.js` sudah dibuat
3. Update config dengan path absolut ke script

### Opsi 2: Format Alternatif (Jika Claude Desktop Support)

Coba format dengan transport type eksplisit:

```json
{
  "mcpServers": {
    "mindfi-defi": {
      "transport": {
        "type": "sse",
        "url": "https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default"
      }
    }
  }
}
```

### Opsi 3: Gunakan MCP Inspector (Alternative)

Jika Claude Desktop belum support SSE URL langsung, gunakan **MCP Inspector** untuk testing:

```bash
pnpm add -g @modelcontextprotocol/inspector
mcp-inspector
```

Connect ke: `https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=test`

---

## 📝 Format Config yang Benar

### Format dengan Command (Required oleh Claude Desktop)

```json
{
  "mcpServers": {
    "mindfi-defi": {
      "command": "node",
      "args": ["path/to/wrapper-script.js"],
      "env": {
        "MCP_URL": "https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default"
      }
    }
  }
}
```

### Format dengan URL (Jika Support)

```json
{
  "mcpServers": {
    "mindfi-defi": {
      "url": "https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default"
    }
  }
}
```

---

## 🐛 Common Issues

### Issue 1: "command field required"
- **Solution**: Claude Desktop membutuhkan `command` field
- **Workaround**: Gunakan wrapper script atau cek versi Claude Desktop

### Issue 2: "Cannot connect to MCP server"
- **Solution**: Test health endpoint dulu
- **Check**: `curl https://mindfi-mcp.akusiapasij252.workers.dev/health`

### Issue 3: "Invalid JSON"
- **Solution**: Validasi JSON di https://jsonlint.com
- **Check**: No trailing comma, semua quotes benar

---

## ✅ Recommended Solution

**Untuk sekarang, gunakan MCP Inspector untuk testing:**

1. Install: `pnpm add -g @modelcontextprotocol/inspector`
2. Run: `mcp-inspector`
3. Connect ke: `https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=test`

**Atau tunggu update Claude Desktop yang support SSE URL transport langsung.**

---

## 📚 Referensi

- [MCP Specification](https://modelcontextprotocol.io)
- [Claude Desktop Docs](https://claude.ai/docs)
- [MCP Inspector](https://github.com/modelcontextprotocol/inspector)


