# 📍 Local vs Production - Penjelasan Lengkap

## ✅ Status Saat Ini

**MCP Server sudah di-deploy ke Cloudflare Workers (Production)**
- URL: `https://mindfi-mcp.akusiapasij252.workers.dev`
- Status: ✅ Online dan siap digunakan

## 💡 Dua Opsi yang Tersedia

### 1. 🏠 LOCAL (Development)

**Kapan pakai:**
- Saat development/testing
- Ingin test perubahan sebelum deploy
- Tidak perlu internet (offline)

**Cara jalan:**
```bash
cd mcp
pnpm dev
```

**URL Local:**
- Base: `http://localhost:8787`
- SSE: `http://localhost:8787/sse?sessionId=default`
- Health: `http://localhost:8787/health`

**Setup Claude Desktop untuk LOCAL:**
```json
{
  "mcpServers": {
    "mindfi-defi": {
      "command": "node",
      "args": [
        "C:\\Users\\Antidump\\Nullshot Hackathon\\mcp\\claude-stdio-bridge.cjs"
      ],
      "env": {
        "MCP_URL": "http://localhost:8787/sse?sessionId=default",
        "SESSION_ID": "default"
      }
    }
  }
}
```

**Keuntungan:**
- ✅ Cepat (no network latency)
- ✅ Bisa test perubahan langsung
- ✅ Tidak perlu deploy
- ✅ Bisa pakai `.dev.vars` untuk secrets

**Kekurangan:**
- ❌ Harus jalan `pnpm dev` terus
- ❌ Hanya bisa dipakai di komputer yang jalan

---

### 2. ☁️ PRODUCTION (Deployed)

**Kapan pakai:**
- Sudah siap untuk production
- Ingin pakai dari mana saja
- Tidak perlu jalan local server

**URL Production:**
- Base: `https://mindfi-mcp.akusiapasij252.workers.dev`
- SSE: `https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default`
- Health: `https://mindfi-mcp.akusiapasij252.workers.dev/health`

**Setup Claude Desktop untuk PRODUCTION:**
```json
{
  "mcpServers": {
    "mindfi-defi": {
      "command": "node",
      "args": [
        "C:\\Users\\Antidump\\Nullshot Hackathon\\mcp\\claude-stdio-bridge.cjs"
      ],
      "env": {
        "MCP_URL": "https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default",
        "SESSION_ID": "default"
      }
    }
  }
}
```

**Keuntungan:**
- ✅ Bisa dipakai dari mana saja
- ✅ Tidak perlu jalan local server
- ✅ Selalu online
- ✅ Bisa dipakai multiple devices

**Kekurangan:**
- ❌ Perlu deploy untuk update
- ❌ Ada network latency
- ❌ Perlu internet connection

---

## 🎯 Rekomendasi

### Untuk Development:
1. **Jalankan local:**
   ```bash
   cd mcp
   pnpm dev
   ```

2. **Update Claude Desktop config** untuk pakai `http://localhost:8787`

3. **Test perubahan** langsung tanpa deploy

### Untuk Production:
1. **Deploy ke Cloudflare:**
   ```bash
   cd mcp
   pnpm run deploy
   ```

2. **Update Claude Desktop config** untuk pakai production URL

3. **Gunakan dari mana saja**

---

## 🔄 Switch Antara Local dan Production

**Cara ganti:**

1. **Edit config Claude Desktop:**
   - File: `%APPDATA%\Claude\claude_desktop_config.json`
   - Ganti `MCP_URL` di `env`:
     - Local: `http://localhost:8787/sse?sessionId=default`
     - Production: `https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default`

2. **Restart Claude Desktop**

3. **Done!**

---

## 📝 Checklist

### Local Setup:
- [ ] Install dependencies: `pnpm install`
- [ ] Setup `.dev.vars` dengan API keys
- [ ] Jalankan: `pnpm dev`
- [ ] Update Claude Desktop config ke local URL
- [ ] Restart Claude Desktop
- [ ] Test!

### Production Setup:
- [ ] Deploy: `pnpm run deploy`
- [ ] Set secrets di Cloudflare: `npx wrangler secret put THIRDWEB_SECRET_KEY`
- [ ] Update Claude Desktop config ke production URL
- [ ] Restart Claude Desktop
- [ ] Test!

---

## ❓ FAQ

**Q: Mana yang lebih baik?**
A: Untuk development, pakai LOCAL. Untuk production, pakai DEPLOYED.

**Q: Bisa pakai keduanya sekaligus?**
A: Bisa! Tapi perlu 2 config berbeda atau ganti-ganti config.

**Q: Local perlu internet?**
A: Untuk test tools yang call API (Thirdweb, CoinGecko), tetap perlu internet. Tapi server-nya jalan local.

**Q: Production perlu bayar?**
A: Cloudflare Workers free tier cukup untuk development. Check pricing untuk production scale.

---

**TL;DR:**
- **Local** = Development, cepat, perlu jalan `pnpm dev`
- **Production** = Deployed, bisa dipakai dari mana saja, sudah online


