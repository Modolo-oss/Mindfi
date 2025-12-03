// Direct test of bridge script to see what's happening
const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing bridge script directly...\n');

const bridgePath = path.join(__dirname, 'claude-stdio-bridge.cjs');

// Set environment
process.env.MCP_URL = 'http://localhost:8787/sse?sessionId=default';
process.env.SESSION_ID = 'default';

const bridge = spawn('node', [bridgePath], {
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';

bridge.stdout.on('data', (data) => {
  stdout += data.toString();
  console.log('📤 STDOUT:', data.toString().trim());
});

bridge.stderr.on('data', (data) => {
  stderr += data.toString();
  console.error('📋 STDERR:', data.toString().trim());
});

bridge.on('close', (code) => {
  console.log(`\n✅ Process exited with code ${code}`);
  console.log('\n📋 Full STDOUT:');
  console.log(stdout);
  console.log('\n📋 Full STDERR:');
  console.log(stderr);
});

// Send initialize
setTimeout(() => {
  console.log('\n📤 Sending initialize...');
  const init = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test', version: '1.0.0' }
    }
  };
  bridge.stdin.write(JSON.stringify(init) + '\n');
}, 500);

// Send tools/list
setTimeout(() => {
  console.log('\n📤 Sending tools/list...');
  const list = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  bridge.stdin.write(JSON.stringify(list) + '\n');
}, 1500);

// Close after 3 seconds
setTimeout(() => {
  bridge.stdin.end();
}, 3000);

