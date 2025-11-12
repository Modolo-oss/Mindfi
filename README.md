# MindFi

Where minds meet DeFi. MindFi is a multi-agent DeFi platform built for Nullshot Hacks Season 0. The project currently focuses on cross-chain swaps, bridging, X402 payments, portfolio strategy suggestions, and XAVA buybacks—powered by Thirdweb’s MCP/HTTP APIs.

## Project Structure

- `docs/` – architecture vision, key points, implementation roadmap.
- `src/` – application source (agents, services, workflows) wired to Thirdweb.
- `mcp.json` – MCP toolbox configuration that exposes Thirdweb tools to the agent.
- `scripts/` – helper scripts (e.g., autonomous smoke test).
- `.dev.vars.example` – environment variable template (copy to `.dev.vars` on your machine).

## Getting Started

1. **Install dependencies**
   ```bash
   pnpm install
   ```
2. **Configure environment**
   ```bash
   cp .dev.vars.example .dev.vars
   # fill THIRDWEB_SECRET_KEY, optional: THIRDWEB_CLIENT_ID, XAVA_TREASURY_ADDRESS
   ```
3. **Run locally**
   ```bash
   pnpm dev
   ```

### Quick smoke test
```bash
pnpm autonomous
```
This ensures the environment is ready and prints example commands for the `/agent/chat` endpoint.

### Agent capabilities (tested)
| Command | Description | Notes |
|---------|-------------|-------|
| `swap amount=100 fromChain=ethereum toChain=avalanche fromToken=USDC toToken=XAVA receiver=<wallet>` | MindFi calls Thirdweb `bridgeSwap` after fetching routes. | Thirdweb returns a top-up link if the treasury wallet lacks USDC. |
| `bridge amount=100 fromChain=ethereum toChain=avalanche token=USDC receiver=<wallet>` | Calls `getBridgeChains`, `bridge/routes`, `bridge/convert`, `bridge/swap`. | Requires balance/authentication; MindFi surfaces the error message and diagnostic data. |
| `payment amount=150 tier=strategy user=0x1234` | Creates an X402 payment link via Thirdweb. | Returns payment `id` + checkout URL. |
| `balance address=0x... chain=1` | Fetches wallet balance from `/v1/wallets/{address}/balance`. | `chain` can be numeric or alias (`ethereum`). |
| `buyback amount=500 from=0xTreasury to=0xBuyback cycle=2025Q1` | Schedules an XAVA buyback via `wallets/send`. | Thirdweb responds with transaction IDs. |
| `strategy ...` | Returns placeholder strategy recommendations. | Ready to plug in AI reasoning or modeling. |

Example curl:
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
Thirdweb will only complete swaps/bridges when the treasury wallet is authenticated and funded.

### Testing summary
- `pnpm autonomous` → environment check plus sample commands.
- `pnpm dev` → runs the worker (Miniflare in local mode).
- Swap/bridge/payment/balance/buyback/strategy payloads → executed; responses logged during manual testing.

### Notes / Limitations
- Full swap/bridge execution requires Thirdweb wallet authentication & funding. MindFi reports the error back to the user.
- Strategy module currently returns a placeholder response—hook your own AI/logic.
- The repo is initialized at [Modolo-oss/Mindfi](https://github.com/Modolo-oss/Mindfi) (private secrets excluded).
- For detailed architecture and future milestones, see `docs/project-vision.md` and `docs/implementation-plan.md`.

