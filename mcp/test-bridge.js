// Test script untuk verify bridge script bekerja dengan benar
// Simulasi JSON-RPC messages dari Claude Desktop

const { spawn } = require('child_process');
const path = require('path');

const bridgePath = path.join(__dirname, 'claude-stdio-bridge.cjs');

console.log('🧪 Testing bridge script...\n');

// Set environment variables
process.env.MCP_URL = 'http://localhost:8787/sse?sessionId=default';
process.env.SESSION_ID = 'default';

// Spawn bridge process
const bridge = spawn('node', [bridgePath], {
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errorOutput = '';

bridge.stdout.on('data', (data) => {
  const text = data.toString();
  output += text;
  console.log('📤 Response:', text.trim());
});

bridge.stderr.on('data', (data) => {
  const text = data.toString();
  errorOutput += text;
  console.error('❌ Error:', text.trim());
});

bridge.on('close', (code) => {
  console.log(`\n✅ Bridge process exited with code ${code}`);
  if (output) {
    console.log('\n📋 Full output:');
    console.log(output);
  }
  if (errorOutput) {
    console.log('\n❌ Full error output:');
    console.log(errorOutput);
  }
});

// Test 1: Initialize message
console.log('📤 Sending initialize message...');
const initMessage = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'claude-ai',
      version: '0.1.0'
    }
  }
};

bridge.stdin.write(JSON.stringify(initMessage) + '\n');

// Wait a bit, then send tools/list
setTimeout(() => {
  console.log('\n📤 Sending tools/list message...');
  const toolsListMessage = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {}
  };
  bridge.stdin.write(JSON.stringify(toolsListMessage) + '\n');
  
  // Close after a bit
  setTimeout(() => {
    bridge.stdin.end();
  }, 2000);
}, 1000);

