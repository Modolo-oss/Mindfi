#!/usr/bin/env node
/**
 * Stdio Bridge for Claude Desktop MCP Connection
 * 
 * This script bridges stdio (JSON-RPC) from Claude Desktop to SSE endpoint
 * 
 * Usage: node claude-stdio-bridge.cjs
 * Environment variable MCP_URL should be set to the SSE endpoint
 */

const MCP_URL = process.env.MCP_URL || 'https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default';
const SESSION_ID = process.env.SESSION_ID || 'default';

// For stdio transport, we need to:
// 1. Read JSON-RPC messages from stdin
// 2. Convert to HTTP POST requests to the MCP server
// 3. Convert responses back to JSON-RPC on stdout

// However, SSE is a streaming protocol, not request-response
// So we need to use HTTP POST for tool calls instead

// Use the REST API endpoints we created
// Parse URL properly to extract base URL
let API_BASE;
try {
  const url = new URL(MCP_URL);
  // Remove /sse and query params to get base URL
  API_BASE = `${url.protocol}//${url.host}`;
} catch (error) {
  // Fallback: simple string replacement
  API_BASE = MCP_URL.replace('/sse?sessionId=', '').replace('/sse', '').split('?')[0];
}

const API_URL = `${API_BASE}/api/tools`;

// Log for debugging
console.error('[Bridge] MCP_URL:', MCP_URL);
console.error('[Bridge] API_BASE:', API_BASE);
console.error('[Bridge] API_URL:', API_URL);
console.error('[Bridge] SESSION_ID:', SESSION_ID);

let stdinBuffer = '';

// Read from stdin (JSON-RPC messages from Claude Desktop)
process.stdin.setEncoding('utf8');

process.stdin.on('data', async (chunk) => {
  stdinBuffer += chunk;
  const lines = stdinBuffer.split('\n');
  stdinBuffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  for (const line of lines) {
    if (line.trim()) {
      try {
        const message = JSON.parse(line);
        // Log incoming message for debugging (to stderr, not stdout)
        console.error('[Bridge] Received:', JSON.stringify({ method: message.method, id: message.id }));
        await handleMcpMessage(message);
      } catch (error) {
        // Log to stderr only
        console.error('[Bridge] Error parsing message:', error.message);
        // Try to extract id from raw line if possible
        let messageId = null;
        try {
          const parsed = JSON.parse(line);
          messageId = parsed.id !== undefined && parsed.id !== null ? parsed.id : null;
        } catch {
          // Ignore, use null
        }
        // Only send error if we have a valid id
        if (messageId !== null && messageId !== undefined) {
          sendError(messageId, -32700, 'Parse error', error.message || 'Failed to parse JSON');
        }
      }
    }
  }
});

async function handleMcpMessage(message) {
  // Validate message structure
  if (!message || typeof message !== 'object') {
    // Can't send error without id
    console.error('[Bridge] Invalid message format: missing id');
    return;
  }
  
  const { jsonrpc, id, method, params } = message;
  
  // Claude Desktop requires id to be string or number, not null
  // If id is missing or null, this is a notification and we can't respond
  if (id === undefined || id === null) {
    // This is a notification, skip it
    return;
  }
  
  const messageId = id; // Guaranteed to be string or number
  
  // Validate required fields
  if (jsonrpc !== '2.0') {
    sendError(messageId, -32600, 'Invalid Request', 'jsonrpc must be "2.0"');
    return;
  }
  
  if (!method) {
    sendError(messageId, -32600, 'Invalid Request', 'method is required');
    return;
  }
  
  try {
    switch (method) {
      case 'initialize':
        // MCP initialization
        // Claude Desktop expects protocolVersion to match what it sent
        const clientProtocolVersion = params?.protocolVersion || '2024-11-05';
        sendResponse(messageId, {
          protocolVersion: clientProtocolVersion,
          capabilities: {
            tools: {},
            resources: {},
          },
          serverInfo: {
            name: 'mindfi-defi',
            version: '1.0.0',
          },
        });
        break;
        
      case 'tools/list':
        // List available tools
        try {
          const toolsResponse = await fetch(`${API_URL}?sessionId=${SESSION_ID}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          });
          
          if (!toolsResponse.ok) {
            throw new Error(`HTTP ${toolsResponse.status}: ${toolsResponse.statusText}`);
          }
          
          const tools = await toolsResponse.json();
          
          // Convert OpenAI function format to MCP tools format
          const mcpTools = Array.isArray(tools) ? tools.map(tool => ({
            name: tool.function?.name || tool.name,
            description: tool.function?.description || tool.description || '',
            inputSchema: tool.function?.parameters || tool.inputSchema || {},
          })) : [];
          
          sendResponse(messageId, { tools: mcpTools });
        } catch (fetchError) {
          console.error('[Bridge] Error fetching tools:', fetchError);
          sendError(messageId, -32603, 'Internal error', `Failed to fetch tools: ${fetchError.message}`);
        }
        break;
        
      case 'tools/call':
        // Call a tool
        if (!params || !params.name) {
          sendError(messageId, -32602, 'Invalid params', 'params.name is required');
          return;
        }
        
        try {
          const { name, arguments: args } = params;
          
          const callResponse = await fetch(`${API_URL}/${name}?sessionId=${SESSION_ID}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(args || {}),
          });
          
          if (!callResponse.ok) {
            const errorText = await callResponse.text();
            throw new Error(`HTTP ${callResponse.status}: ${errorText}`);
          }
          
          const result = await callResponse.json();
          
          // Convert result to MCP format
          sendResponse(messageId, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result),
              },
            ],
          });
        } catch (fetchError) {
          console.error('[Bridge] Error calling tool:', fetchError);
          sendError(messageId, -32603, 'Internal error', `Failed to call tool: ${fetchError.message}`);
        }
        break;
        
      case 'ping':
        sendResponse(messageId, {});
        break;
        
      default:
        sendError(messageId, -32601, 'Method not found', `Unknown method: ${method}`);
    }
  } catch (error) {
    console.error('[Bridge] Error handling message:', error);
    sendError(messageId, -32603, 'Internal error', error.message || 'Unknown error');
  }
}

function sendResponse(id, result) {
  // id must be string or number, never null
  if (id === undefined || id === null) {
    console.error('[Bridge] Cannot send response: id is required');
    return;
  }
  
  // Ensure result is always an object
  if (result === undefined) {
    result = {};
  }
  
  const response = {
    jsonrpc: '2.0',
    id: id, // id is guaranteed to be string or number
    result: result || {},
  };
  
  try {
    const output = JSON.stringify(response) + '\n';
    // Log to stderr for debugging
    console.error('[Bridge] Sending response:', JSON.stringify({ id: response.id, hasResult: !!response.result }));
    process.stdout.write(output);
    // Force flush
    if (process.stdout.flush) {
      process.stdout.flush();
    }
  } catch (error) {
    // Write error to stderr, not stdout
    console.error('[Bridge] Error writing response:', error);
  }
}

function sendError(id, code, message, data) {
  // id must be string or number, never null
  if (id === undefined || id === null) {
    console.error('[Bridge] Cannot send error: id is required');
    return;
  }
  
  const response = {
    jsonrpc: '2.0',
    id: id, // id is guaranteed to be string or number
    error: {
      code: code || -32603,
      message: message || 'Internal error',
      ...(data !== undefined && { data }),
    },
  };
  
  try {
    const output = JSON.stringify(response) + '\n';
    // Log to stderr for debugging
    console.error('[Bridge] Sending error:', JSON.stringify({ id: response.id, code: response.error.code, message: response.error.message }));
    process.stdout.write(output);
    // Force flush
    if (process.stdout.flush) {
      process.stdout.flush();
    }
  } catch (error) {
    // Write error to stderr, not stdout
    console.error('[Bridge] Error writing error response:', error);
  }
}

// Flush stdout on exit
process.on('SIGINT', () => {
  process.stdout.end();
  process.exit(0);
});

process.on('exit', () => {
  process.stdout.end();
});

// Keep process alive
process.stdin.resume();

// Ensure stdout is not buffered
if (process.stdout.isTTY) {
  process.stdout.setDefaultEncoding('utf8');
}
