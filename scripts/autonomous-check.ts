import { config } from "dotenv";

config({ path: ".dev.vars" });

const requiredEnvs = ["THIRDWEB_SECRET_KEY"] as const;

const missing = requiredEnvs.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.log("⚠️  Autonomous check: beberapa environment variable belum di-set:");
  missing.forEach((key) => console.log(`   - ${key}`));
  console.log("\nSet dengan menjalankan:");
  console.log("   cp .dev.vars.example .dev.vars");
  console.log("   # kemudian isi THIRDWEB_SECRET_KEY dan THIRDWEB_CLIENT_ID\n");
  process.exit(1);
}

console.log("✅ Environment siap. Contoh perintah yang dapat kamu kirim ke MindFi:");
console.log(
  "  swap amount=100 fromChain=ethereum toChain=avalanche fromToken=USDC toToken=XAVA slippage=75",
);
console.log("  payment amount=150 tier=strategy user=0x1234...");
console.log("  balance address=0x1234...");
console.log("  buyback amount=500XAVA from=0xTreasury to=0xBuyback cycle=2024Q4");
console.log("\nJalankan `pnpm dev` dan kirim JSON payload ke /agent/chat untuk menguji alur.");

