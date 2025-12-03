# Cara Melihat Logs MCP Server

Ada beberapa cara untuk melihat logs dari MCP server yang sudah di-deploy:

## 1. Wrangler Tail (Command Line)

```bash
# Tail logs real-time
npx wrangler tail

# Tail dengan format JSON
npx wrangler tail --format json

# Tail untuk environment tertentu
npx wrangler tail --env production

# Tail dengan filter
npx wrangler tail --format pretty
```

**Catatan:** Jika mengalami error DNS (`EAI_AGAIN`), gunakan alternatif di bawah.

## 2. Cloudflare Dashboard (Recommended)

Cara paling reliable untuk melihat logs:

1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Login ke akun Cloudflare Anda
3. Pilih **Workers & Pages** dari sidebar
4. Pilih worker **mindfi-mcp**
5. Klik tab **Logs** atau **Real-time Logs**
6. Anda akan melihat semua logs dari worker

**Keuntungan:**
- Tidak perlu koneksi khusus
- Bisa filter dan search logs
- Bisa export logs
- Real-time updates

## 3. Wrangler Tail dengan Format Pretty

```bash
npx wrangler tail --format pretty
```

## 4. Troubleshooting DNS Error

Jika `wrangler tail` error dengan `EAI_AGAIN`:

1. **Cek koneksi internet** - Pastikan koneksi stabil
2. **Cek firewall/proxy** - Pastikan tidak memblokir `tail.developers.workers.dev`
3. **Gunakan Cloudflare Dashboard** - Alternatif yang lebih reliable
4. **Coba lagi nanti** - Kadang masalah DNS bersifat sementara

## 5. Melihat Logs dari Code

Anda juga bisa melihat logs langsung dari code dengan `console.log()`:

```typescript
console.log("[DefiMcpServer] Log message here");
console.error("[DefiMcpServer] Error message here");
```

Logs ini akan muncul di:
- Wrangler tail (jika berhasil connect)
- Cloudflare Dashboard logs
- `wrangler dev` console (saat development)

## 6. Filter Logs di Dashboard

Di Cloudflare Dashboard, Anda bisa filter logs berdasarkan:
- **Status code** (200, 400, 500, etc.)
- **Method** (GET, POST, etc.)
- **Path** (/, /sse, /health, etc.)
- **Time range** (last hour, last day, etc.)
- **Search text** (cari keyword tertentu)

## 7. Export Logs

Di Cloudflare Dashboard:
1. Pilih time range
2. Apply filters (optional)
3. Klik **Export** untuk download logs sebagai CSV atau JSON

## Tips

- **Development:** Gunakan `wrangler dev` untuk melihat logs langsung di terminal
- **Production:** Gunakan Cloudflare Dashboard untuk monitoring
- **Debugging:** Tambahkan `console.log()` di code untuk tracking
- **Errors:** Semua `console.error()` akan muncul di logs dengan level ERROR


