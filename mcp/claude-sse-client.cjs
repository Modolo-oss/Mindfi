#!/usr/bin/env node
/**
 * SSE Client wrapper for Claude Desktop MCP connection
 * Connects to MindFi MCP Server via SSE
 * Note: This uses CommonJS for compatibility with Claude Desktop
 * 
 * Usage: node claude-sse-client.cjs
 * Environment variable MCP_URL should be set to the SSE endpoint
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

const MCP_URL = process.env.MCP_URL || 'https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default';

async function main() {
  try {
    // Log to stderr so it doesn't interfere with stdout (MCP protocol)
    console.error('[MindFi MCP] Connecting to:', MCP_URL);
    
    const transport = new SSEClientTransport(new URL(MCP_URL));
    const client = new Client(
      {
        name: 'claude-desktop-mindfi',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    // Connect client to transport
    await client.connect(transport);
    console.error('[MindFi MCP] Connected successfully');

    // For SSE transport, we need to handle the bidirectional communication
    // SSE transport reads from the server via EventSource
    // We need to send messages from stdin to the server via HTTP POST
    
    // Read from stdin (JSON-RPC messages from Claude Desktop)
    let stdinBuffer = '';
    process.stdin.setEncoding('utf8');
    
    process.stdin.on('data', async (chunk) => {
      stdinBuffer += chunk;
      const lines = stdinBuffer.split('\n');
      stdinBuffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            // Send message to server via transport
            await transport.send(message);
          } catch (error) {
            console.error('[MindFi MCP] Error parsing stdin:', error);
          }
        }
      }
    });
    
    // Listen for messages from transport (server responses)
    transport.onMessage = (message) => {
      // Write to stdout (JSON-RPC messages to Claude Desktop)
      process.stdout.write(JSON.stringify(message) + '\n');
    };
    
    // Handle errors
    client.onerror = (error) => {
      console.error('[MindFi MCP] Client Error:', error);
      process.exit(1);
    };
    
    // Keep process alive
    process.stdin.resume();

    process.on('SIGINT', async () => {
      console.error('[MindFi MCP] Shutting down...');
      await client.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('[MindFi MCP] Failed to connect:', error);
    process.exit(1);
  }
}

main();

