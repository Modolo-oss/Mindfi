import { config } from "dotenv";

config({ path: ".dev.vars" });

const requiredEnvs = [
  "THIRDWEB_SECRET_KEY",
  "THIRDWEB_CLIENT_ID",
  "ANTHROPIC_API_KEY",
  // "COINGECKO_API_KEY" // Optional but recommended
] as const;

const missing = requiredEnvs.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.log("⚠️  Autonomous check: beberapa environment variable belum di-set:");
  missing.forEach((key) => console.log(`   - ${key}`));
  console.log("\nSet dengan menjalankan:");
  console.log("   cp .dev.vars.example .dev.vars");
  console.log("   # kemudian isi variable yang hilang\n");
  process.exit(1);
}

console.log("✅ Environment siap! MindFi Agent siap beroperasi.");
console.log("\nContoh perintah yang dapat kamu kirim:");
console.log("  > Swap 100 USDC on Ethereum to XAVA on Avalanche");
console.log("  > Check my balance on Base");
console.log("  > What is the price of Bitcoin?");
console.log("  > Alert me if ETH is above $3000");
console.log("  > Transfer 5 USDC on Base to 0x123...");
console.log("  > Show my portfolio");

console.log("\nJalankan `pnpm dev` dan kirim request ke /agent/chat untuk memulai.");

