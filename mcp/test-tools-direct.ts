/**
 * Direct Tool Testing - Test semua tools sekarang!
 * Test langsung via HTTP ke server yang running
 */

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: [] as Array<{ name: string; status: 'pass' | 'fail'; message: string; data?: any }>
};

function logTest(name: string, status: 'pass' | 'fail', message = '', data?: any) {
  const icon = status === 'pass' ? '✅' : '❌';
  const color = status === 'pass' ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}${icon} ${name}\x1b[0m ${message}`);
  if (data) {
    const dataStr = JSON.stringify(data).substring(0, 150);
    console.log(`   Data: ${dataStr}${dataStr.length >= 150 ? '...' : ''}`);
  }
  results.tests.push({ name, status, message, data });
  if (status === 'pass') {
    results.passed++;
  } else {
    results.failed++;
  }
}

async function testServerEndpoints() {
  console.log('\n🌐 Testing Server Endpoints...');
  
  try {
    const healthRes = await fetch('http://localhost:8787/health');
    if (healthRes.ok) {
      const healthData = await healthRes.json();
      logTest('Server: /health', 'pass', 'Health check OK', healthData);
    } else {
      logTest('Server: /health', 'fail', `Status: ${healthRes.status}`);
    }
  } catch (error: any) {
    logTest('Server: /health', 'fail', `Error: ${error.message}`);
  }
  
  try {
    const rootRes = await fetch('http://localhost:8787/');
    if (rootRes.ok) {
      const rootData = await rootRes.json();
      logTest('Server: /', 'pass', 'Root endpoint OK', rootData);
    } else {
      logTest('Server: /', 'fail', `Status: ${rootRes.status}`);
    }
  } catch (error: any) {
    logTest('Server: /', 'fail', `Error: ${error.message}`);
  }
}

async function testCoinGeckoAPI() {
  console.log('\n📊 Testing CoinGecko API Directly...');
  
  try {
    // Test ETH price with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const url = new URL('https://api.coingecko.com/api/v3/simple/price');
    url.searchParams.set('ids', 'ethereum');
    url.searchParams.set('vs_currencies', 'usd');
    url.searchParams.set('include_24hr_change', 'true');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'x-cg-demo-api-key': 'CG-mVR34KX4vFTBsfi76Fv2oYcB'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json();
      if (data.ethereum?.usd) {
        logTest('CoinGecko: ETH Price', 'pass', `ETH: $${data.ethereum.usd}`, data.ethereum);
      } else {
        logTest('CoinGecko: ETH Price', 'fail', 'No price data');
      }
    } else {
      const errorText = await response.text();
      logTest('CoinGecko: ETH Price', 'fail', `Status: ${response.status} - ${errorText.substring(0, 100)}`);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      logTest('CoinGecko: ETH Price', 'fail', 'Request timeout (10s)');
    } else {
      logTest('CoinGecko: ETH Price', 'fail', error.message);
    }
  }
  
  try {
    // Test BTC price with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const url = new URL('https://api.coingecko.com/api/v3/simple/price');
    url.searchParams.set('ids', 'bitcoin');
    url.searchParams.set('vs_currencies', 'usd');
    url.searchParams.set('include_24hr_change', 'true');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'x-cg-demo-api-key': 'CG-mVR34KX4vFTBsfi76Fv2oYcB'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json();
      if (data.bitcoin?.usd) {
        logTest('CoinGecko: BTC Price', 'pass', `BTC: $${data.bitcoin.usd}`, data.bitcoin);
      } else {
        logTest('CoinGecko: BTC Price', 'fail', 'No price data');
      }
    } else {
      const errorText = await response.text();
      logTest('CoinGecko: BTC Price', 'fail', `Status: ${response.status} - ${errorText.substring(0, 100)}`);
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      logTest('CoinGecko: BTC Price', 'fail', 'Request timeout (10s)');
    } else {
      logTest('CoinGecko: BTC Price', 'fail', error.message);
    }
  }
}

async function testThirdwebAPI() {
  console.log('\n🔗 Testing Thirdweb API Directly...');
  
  try {
    // Test wallet balance - use chain ID number instead of string
    const address = '0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047';
    const url = new URL(`https://api.thirdweb.com/v1/wallets/${address}/balance`);
    url.searchParams.set('chainId', '1'); // Ethereum mainnet chain ID
    
    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': 'aW7R4IX0e20HyQivv9o7o5lfUP_KZT-LZcZ8isdzxy_4OZ5acLPfqnhnmCnI6_A3IVE4HVMvhGZ2D-CWXJ0-oA',
        'x-client-id': '4e633c04efd01345c53a47a56ac6d181'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('Thirdweb: getWalletBalance', 'pass', 'Balance retrieved', data);
    } else {
      const errorText = await response.text();
      logTest('Thirdweb: getWalletBalance', 'fail', `Status: ${response.status} - ${errorText.substring(0, 150)}`);
    }
  } catch (error: any) {
    logTest('Thirdweb: getWalletBalance', 'fail', error.message);
  }
  
  try {
    // Test bridge chains
    const url = new URL('https://api.thirdweb.com/v1/bridge/chains');
    
    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'x-secret-key': 'aW7R4IX0e20HyQivv9o7o5lfUP_KZT-LZcZ8isdzxy_4OZ5acLPfqnhnmCnI6_A3IVE4HVMvhGZ2D-CWXJ0-oA',
        'x-client-id': '4e633c04efd01345c53a47a56ac6d181'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      logTest('Thirdweb: getBridgeChains', 'pass', `Found ${Array.isArray(data) ? data.length : 'N/A'} chains`, data);
    } else {
      const errorText = await response.text();
      logTest('Thirdweb: getBridgeChains', 'fail', `Status: ${response.status} - ${errorText.substring(0, 100)}`);
    }
  } catch (error: any) {
    logTest('Thirdweb: getBridgeChains', 'fail', error.message);
  }
}

async function testMCPSSEEndpoint() {
  console.log('\n🛠️  Testing MCP SSE Endpoint...');
  
  try {
    const sseRes = await fetch('http://localhost:8787/sse?sessionId=test', {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      },
    });
    
    if (sseRes.ok || sseRes.status === 200) {
      logTest('MCP: SSE Endpoint', 'pass', 'SSE endpoint accessible');
      
      // Try to read first chunk
      const reader = sseRes.body?.getReader();
      if (reader) {
        const { value } = await reader.read();
        if (value) {
          const text = new TextDecoder().decode(value);
          logTest('MCP: SSE Stream', 'pass', 'SSE stream working', { firstChunk: text.substring(0, 100) });
          reader.releaseLock();
        }
      }
    } else {
      logTest('MCP: SSE Endpoint', 'fail', `Status: ${sseRes.status}`);
    }
  } catch (error: any) {
    logTest('MCP: SSE Endpoint', 'fail', `Error: ${error.message}`);
  }
}

async function runAllTests() {
  console.log('\n🧪 TESTING ALL MCP TOOLS NOW!\n');
  console.log('='.repeat(60));
  console.log('\n✅ Server should be running on http://localhost:8787');
  console.log('   (If not, run: pnpm dev)\n');
  
  await testServerEndpoints();
  await testCoinGeckoAPI();
  await testThirdwebAPI();
  await testMCPSSEEndpoint();
  
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
  
  console.log('\n💡 Note: Untuk test MCP protocol penuh (tool execution),');
  console.log('   gunakan MCP Inspector: mcp-inspector');
  console.log('   Connect ke: http://localhost:8787/sse?sessionId=test\n');
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests().catch(error => {
  console.error('\n❌ Fatal error:', error);
  console.error(error.stack);
  process.exit(1);
});

