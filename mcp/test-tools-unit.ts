/**
 * Unit Test untuk Tools - Test sebelum deploy!
 * Test langsung dengan mock context
 */

import { CoinGeckoService } from "./src/services/CoinGeckoService.js";

async function testCoinGeckoService() {
  console.log("\n🧪 Testing CoinGeckoService...\n");

  const coinGecko = new CoinGeckoService(process.env.COINGECKO_API_KEY);

  try {
    console.log("Test 1: getTokenPrice('ethereum')");
    const result = await coinGecko.getTokenPrice("ethereum");
    console.log("✅ SUCCESS:", JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    console.error(error);
  }

  try {
    console.log("\nTest 2: getTokenPrice('bitcoin')");
    const result = await coinGecko.getTokenPrice("bitcoin");
    console.log("✅ SUCCESS:", JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.log("❌ FAILED:", error.message);
    console.error(error);
  }
}

async function testToolsContext() {
  console.log("\n🧪 Testing Tools Context Setup...\n");

  // Simulate context creation
  const mockEnv = {
    THIRDWEB_SECRET_KEY: process.env.THIRDWEB_SECRET_KEY || "test",
    COINGECKO_API_KEY: process.env.COINGECKO_API_KEY,
  };

  try {
    const coinGecko = new CoinGeckoService(mockEnv.COINGECKO_API_KEY);
    console.log("✅ CoinGeckoService created:", !!coinGecko);
    console.log("   Has getTokenPrice method:", typeof coinGecko.getTokenPrice === "function");

    // Test method exists
    if (coinGecko && typeof coinGecko.getTokenPrice === "function") {
      console.log("✅ getTokenPrice method exists");
    } else {
      console.log("❌ getTokenPrice method NOT FOUND");
    }
  } catch (error: any) {
    console.log("❌ FAILED to create CoinGeckoService:", error.message);
    console.error(error);
  }
}

async function runTests() {
  console.log("=".repeat(60));
  console.log("🧪 UNIT TEST - Tools Before Deploy");
  console.log("=".repeat(60));

  await testToolsContext();
  await testCoinGeckoService();

  console.log("\n" + "=".repeat(60));
  console.log("✅ Unit tests completed!");
  console.log("=".repeat(60));
}

runTests().catch((error) => {
  console.error("\n❌ Fatal error:", error);
  process.exit(1);
});


