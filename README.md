# MindFi

Where minds meet DeFi. Multi-agent platform prototype for Nullshot Hacks Season 0. This workspace houses the TypeScript agent network, Thirdweb integrations, and associated documentation.

## Project Structure

- `docs/` — vision, keypoints, and implementation planning.
- `src/` — application source (agents, services, workflows). *(Swap/Payment/Buyback sudah terhubung Thirdweb).*
- `mcp.json` — MCP toolbox configuration (Thirdweb endpoint filtered to swap/payment toolset).
- `wrangler.toml` — Cloudflare Workers configuration.
- `.dev.vars.example` — environment variable template (copy to `.dev.vars` locally).

## Getting Started

1. **Install dependencies**
   ```bash
   pnpm install
   ```
2. **Configure environment**
   ```bash
   cp .dev.vars.example .dev.vars
   # isi THIRDWEB_SECRET_KEY, THIRDWEB_CLIENT_ID, XAVA_TREASURY_ADDRESS (opsional)
   ```
3. **Run locally**
   ```bash
   pnpm dev
   ```

### Uji cepat (autonomous smoke test)
```bash
pnpm autonomous
```
Perintah ini memastikan variabel lingkungan sudah terisi dan menampilkan contoh instruksi yang bisa dikirim ke endpoint `/agent/chat`.

### Contoh instruksi yang sudah teruji
| Perintah | Deskripsi | Catatan |
|----------|-----------|---------|
| `swap amount=100 fromChain=ethereum toChain=avalanche fromToken=USDC toToken=XAVA receiver=<wallet>` | Meminta MindFi mencari rute dan mengeksekusi swap via Thirdweb `bridgeSwap`. | Thirdweb mengembalikan link top-up jika wallet belum punya USDC. |
| `bridge amount=100 fromChain=ethereum toChain=avalanche token=USDC receiver=<wallet>` | Menggabungkan `getBridgeChains`, `bridge/routes`, `bridge/convert`, dan `bridge/swap` untuk bridge sederhana. | Memerlukan saldo USDC di chain asal agar eksekusi selesai. |
| `payment amount=150 tier=strategy user=0x1234` | Membuat payment link X402 Thirdweb. | Mengembalikan `id` dan URL checkout. |
| `balance address=0x... chain=1` | Mengecek saldo via Thirdweb `/wallets/{address}/balance`. | Chain dapat berupa ID numerik atau nama (`ethereum`). |
| `buyback amount=500 from=0xTreasury to=0xBuyback cycle=2025Q1` | Menjadwalkan buyback XAVA lewat `wallets/send`. | Thirdweb mengembalikan `transactionIds`. |
| `strategy ...` | Menampilkan rekomendasi strategi MindFi (placeholder). | Dapat dikembangkan dengan logika AI. |

Contoh curl:
```bash
curl.exe -X POST http://127.0.0.1:8787/agent/chat/demo-session \
  -H "Content-Type: application/json" \
  --data-binary '{
    "messages": [
      {
        "role": "user",
        "content": "swap amount=100 fromChain=ethereum toChain=avalanche fromToken=USDC toToken=XAVA receiver=0xF697eC2bA012c098D48b285d5875ADb62a5eAd75"
      }
    ]
  }'
```
Perhatikan bahwa Thirdweb hanya mengeksekusi swap jika wallet treasury memiliki likuiditas.

### Testing ringkasan
- `pnpm autonomous` → memverifikasi env.
- `pnpm dev` → menjalankan worker lokal.
- Payload swap/payment/balance/buyback/strategy → sudah teruji, detail respons tersimpan di log pengujian.

⚠️ Dependencies/scripts are placeholders until we pin exact packages from the Nullshot framework. See `docs/implementation-plan.md` for the current roadmap.

