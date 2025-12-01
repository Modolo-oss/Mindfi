/**
 * Direct Tool Testing - Test semua tools sekarang!
 */

// Load environment variables from .dev.vars
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  const devVarsPath = join(__dirname, '.dev.vars');
  const env = {};
  try {
    const content = readFileSync(devVarsPath, 'utf-8');
    content.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
  } catch (error) {
    console.error('❌ Error loading .dev.vars:', error.message);
    process.exit(1);
  }
  return env;
}

const env = loadEnv();

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, status, message = '', data = null) {
  const icon = status === 'pass' ? '✅' : '❌';
  const color = status === 'pass' ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon} ${name}\x1b[0m ${message}`);
  if (data) {
    console.log(`   Data: ${JSON.stringify(data).substring(0, 100)}...`);
  }
  results.tests.push({ name, status, message, data });
  if (status === 'pass') {
    results.passed++;
  } else {
    results.failed++;
  }
}

async function testCoinGeckoService() {
  console.log('\n📊 Testing CoinGecko Service...');
  
  try {
    // Dynamic import karena ES modules
    const { CoinGeckoService } = await import('./src/services/CoinGeckoService.js');
    const service = new CoinGeckoService(env.COINGECKO_API_KEY);
    
    // Test getTokenPrice
    const price = await service.getTokenPrice('ethereum');
    if (price && price.priceUsd) {
      logTest('CoinGecko: getTokenPrice', 'pass', `ETH: $${price.priceUsd}`, price);
    } else {
      logTest('CoinGecko: getTokenPrice', 'fail', 'No price data');
    }
    
    // Test multiple tokens
    const btcPrice = await service.getTokenPrice('bitcoin');
    if (btcPrice && btcPrice.priceUsd) {
      logTest('CoinGecko: getTokenPrice (BTC)', 'pass', `BTC: $${btcPrice.priceUsd}`, btcPrice);
    }
    
  } catch (error) {
    logTest('CoinGecko Service', 'fail', error.message);
  }
}

async function testThirdwebService() {
  console.log('\n🔗 Testing Thirdweb Service...');
  
  try {
    const { ThirdwebToolboxService } = await import('./src/services/ThirdwebToolboxService.js');
    const service = new ThirdwebToolboxService({
      THIRDWEB_SECRET_KEY: env.THIRDWEB_SECRET_KEY,
      THIRDWEB_CLIENT_ID: env.THIRDWEB_CLIENT_ID,
    });
    
    // Test getWalletBalance
    const testAddress = '0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047';
    const balance = await service.getWalletBalance(testAddress, 'ethereum');
    
    if (balance && typeof balance.balance === 'string') {
      logTest('Thirdweb: getWalletBalance', 'pass', `Balance: ${balance.balance} ETH`, balance);
    } else {
      logTest('Thirdweb: getWalletBalance', 'fail', 'No balance data', balance);
    }
    
  } catch (error) {
    logTest('Thirdweb Service', 'fail', error.message);
  }
}

async function testServerEndpoints() {
  console.log('\n🌐 Testing Server Endpoints...');
  
  try {
    // Test health endpoint
    const healthRes = await fetch('http://localhost:8787/health');
    if (healthRes.ok) {
      const healthData = await healthRes.json();
      logTest('Server: /health', 'pass', 'Health check OK', healthData);
    } else {
      logTest('Server: /health', 'fail', `Status: ${healthRes.status}`);
    }
    
    // Test root endpoint
    const rootRes = await fetch('http://localhost:8787/');
    if (rootRes.ok) {
      const rootData = await rootRes.json();
      logTest('Server: /', 'pass', 'Root endpoint OK', rootData);
    } else {
      logTest('Server: /', 'fail', `Status: ${rootRes.status}`);
    }
    
  } catch (error) {
    logTest('Server Endpoints', 'fail', `Server mungkin belum running: ${error.message}`);
    console.log('   💡 Jalankan: pnpm dev (di terminal lain)');
  }
}

async function testMCPTools() {
  console.log('\n🛠️  Testing MCP Tools (via HTTP simulation)...');
  
  try {
    // Test SSE endpoint exists
    const sseRes = await fetch('http://localhost:8787/sse?sessionId=test', {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      },
    });
    
    if (sseRes.ok || sseRes.status === 200) {
      logTest('MCP: SSE Endpoint', 'pass', 'SSE endpoint accessible');
    } else {
      logTest('MCP: SSE Endpoint', 'fail', `Status: ${sseRes.status}`);
    }
    
  } catch (error) {
    logTest('MCP Tools', 'fail', `Error: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('\n🧪 TESTING ALL MCP TOOLS NOW!\n');
  console.log('='.repeat(60));
  
  // Check required env vars
  const required = ['THIRDWEB_SECRET_KEY', 'THIRDWEB_CLIENT_ID', 'COINGECKO_API_KEY'];
  const missing = required.filter(v => !env[v]);
  
  if (missing.length > 0) {
    console.error(`\n❌ Missing env vars: ${missing.join(', ')}`);
    console.error('   Check .dev.vars file!\n');
    process.exit(1);
  }
  
  console.log('\n✅ Environment variables loaded');
  console.log(`   THIRDWEB_SECRET_KEY: ${env.THIRDWEB_SECRET_KEY.substring(0, 10)}...`);
  console.log(`   THIRDWEB_CLIENT_ID: ${env.THIRDWEB_CLIENT_ID.substring(0, 10)}...`);
  console.log(`   COINGECKO_API_KEY: ${env.COINGECKO_API_KEY.substring(0, 10)}...`);
  
  // Run tests
  await testServerEndpoints();
  await testCoinGeckoService();
  await testThirdwebService();
  await testMCPTools();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST RESULTS SUMMARY:\n');
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(`   📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  
  if (results.failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.tests.filter(t => t.status === 'fail').forEach(test => {
      console.log(`   - ${test.name}: ${test.message}`);
    });
  }
  
  console.log('\n💡 Note: Untuk test MCP protocol penuh (SSE/WebSocket),');
  console.log('   gunakan MCP Inspector: mcp-inspector\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  console.error(error.stack);
  process.exit(1);
});

