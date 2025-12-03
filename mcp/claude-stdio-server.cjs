#!/usr/bin/env node
/**
 * Stdio MCP Server for Claude Desktop
 * Runs MCP server locally and connects via stdio
 * 
 * This script runs the MCP server locally using wrangler dev
 * and bridges it to stdio for Claude Desktop
 * 
 * Usage: node claude-stdio-server.cjs
 */

const { spawn } = require('child_process');
const path = require('path');

const projectRoot = __dirname;
const wranglerPath = path.join(projectRoot, 'node_modules', '.bin', 'wrangler.cmd');

console.error('[MindFi MCP] Starting local MCP server...');
console.error('[MindFi MCP] Project root:', projectRoot);

// For now, we'll use a simpler approach:
// Run the MCP server locally and use stdio transport
// But this requires the MCP server to support stdio, which it currently doesn't

// Alternative: Use a bridge that connects stdio to HTTP
// But that's complex...

// Best solution: Add stdio transport support to the MCP server
// Or use a local proxy that converts stdio to SSE

console.error('[MindFi MCP] Error: SSE transport is not compatible with stdio');
console.error('[MindFi MCP] Solution: Run MCP server locally with stdio support');
console.error('[MindFi MCP] Or use a bridge service');

process.exit(1);


