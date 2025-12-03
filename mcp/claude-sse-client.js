#!/usr/bin/env node
/**
 * SSE Client wrapper for Claude Desktop MCP connection
 * Connects to MindFi MCP Server via SSE
 * Note: This uses CommonJS for compatibility with Claude Desktop
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');

const MCP_URL = process.env.MCP_URL || 'https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default';

async function main() {
  try {
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

    await client.connect(transport);

    // Pipe stdin/stdout for stdio transport
    process.stdin.pipe(client.stdin);
    client.stdout.pipe(process.stdout);

    // Handle errors
    client.onerror = (error) => {
      console.error('MCP Client Error:', error);
      process.exit(1);
    };

    process.on('SIGINT', async () => {
      await client.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to connect to MCP server:', error);
    process.exit(1);
  }
}

main();

