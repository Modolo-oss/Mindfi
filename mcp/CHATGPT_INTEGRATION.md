# Integrasi MCP dengan ChatGPT/OpenAI

## 📋 Status Kompatibilitas

### ✅ **Claude Desktop** (Native Support)
- **Status**: ✅ **Fully Supported**
- **Cara**: Langsung konfigurasi di `claude_desktop_config.json`
- **Endpoint**: SSE (`/sse?sessionId=...`)

### ⚠️ **ChatGPT Web/App** (Tidak Native)
- **Status**: ❌ **Tidak langsung support MCP**
- **Alasan**: ChatGPT menggunakan sistem plugin/function calling sendiri
- **Solusi**: Perlu adapter/middleware

### 🔄 **OpenAI API** (Bisa dengan Adapter)
- **Status**: ⚠️ **Bisa, tapi perlu adapter**
- **Cara**: Convert MCP tools ke OpenAI Function Calling format
- **Endpoint**: HTTP REST API (bukan SSE)

---

## 🎯 Cara Kerja MCP dengan LLM

### MCP Protocol
- **Transport**: SSE (Server-Sent Events) atau WebSocket
- **Format**: JSON-RPC 2.0
- **Primitives**: Tools, Resources, Prompts

### OpenAI Function Calling
- **Transport**: HTTP REST API
- **Format**: JSON dengan `functions` parameter
- **Primitives**: Functions (mirip Tools)

---

## 🔧 Solusi untuk ChatGPT/OpenAI

### Opsi 1: Buat Adapter Layer (Recommended)

Buat adapter yang convert MCP tools ke OpenAI Function Calling:

```typescript
// adapter/openai-mcp-adapter.ts
export async function convertMcpToolsToOpenAI(mcpServerUrl: string) {
  // 1. Fetch MCP tools dari server
  const tools = await fetchMcpTools(mcpServerUrl);
  
  // 2. Convert ke OpenAI format
  return tools.map(tool => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema // Zod schema → JSON Schema
    }
  }));
}

// 3. Saat OpenAI call function, forward ke MCP server
export async function executeMcpToolViaOpenAI(
  toolName: string,
  args: any,
  mcpServerUrl: string
) {
  // Call MCP server dengan format JSON-RPC
  const response = await fetch(`${mcpServerUrl}/mcp/default/call`, {
    method: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: toolName,
        arguments: args
      }
    })
  });
  
  return response.json();
}
```

### Opsi 2: Gunakan Agent sebagai Proxy

Gunakan **Agent** (yang sudah support MCP) sebagai proxy ke ChatGPT:

```
ChatGPT → Agent (Cloudflare Workers) → MCP Server
```

**Flow:**
1. User chat dengan ChatGPT
2. ChatGPT call Agent API (via function calling)
3. Agent forward ke MCP server
4. Agent return hasil ke ChatGPT

**Keuntungan:**
- ✅ ChatGPT bisa pakai tools via Agent
- ✅ Agent handle MCP protocol
- ✅ Tidak perlu ubah MCP server

### Opsi 3: Expose REST API dari MCP Tools

Buat REST API wrapper di MCP server:

```typescript
// mcp/src/router.ts
app.post('/api/tools/:toolName', async (c) => {
  const toolName = c.req.param('toolName');
  const args = await c.req.json();
  
  // Call MCP tool
  const result = await mcpServer.callTool(toolName, args);
  
  return c.json(result);
});
```

Lalu ChatGPT bisa call langsung via HTTP:

```javascript
// ChatGPT function calling
{
  "name": "get_wallet_balance",
  "arguments": {
    "address": "0x...",
    "chainId": 1
  }
}

// → POST https://mindfi-mcp.workers.dev/api/tools/get_wallet_balance
```

---

## 📝 Implementasi Praktis

### Step 1: Expose REST API dari MCP

Tambahkan route di `mcp/src/index.ts`:

```typescript
// Handle REST API untuk OpenAI function calling
if (path.startsWith('/api/tools/')) {
  const toolName = path.split('/api/tools/')[1];
  const args = await request.json();
  
  // Forward ke MCP server
  const id = env.DEFI_MCP_SERVER.idFromName('default');
  const stub = env.DEFI_MCP_SERVER.get(id);
  
  // Call tool via MCP protocol
  const result = await stub.callTool(toolName, args);
  
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### Step 2: Buat OpenAI Function Definitions

```typescript
// agent/src/openai-functions.ts
export const openaiFunctions = [
  {
    type: "function",
    function: {
      name: "get_wallet_balance",
      description: "Get wallet balance for a given address and chain",
      parameters: {
        type: "object",
        properties: {
          address: { type: "string", description: "Wallet address" },
          chainId: { type: "number", description: "Chain ID" }
        },
        required: ["address", "chainId"]
      }
    }
  },
  // ... other tools
];
```

### Step 3: Integrate dengan ChatGPT

```typescript
// agent/src/chatgpt-handler.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handleChatGPTRequest(message: string) {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: message }],
    tools: openaiFunctions,
    tool_choice: "auto"
  });
  
  // Handle function calls
  for (const toolCall of response.choices[0].message.tool_calls || []) {
    const result = await fetch(
      `${MCP_SERVER_URL}/api/tools/${toolCall.function.name}`,
      {
        method: 'POST',
        body: JSON.stringify(JSON.parse(toolCall.function.arguments))
      }
    ).then(r => r.json());
    
    // Continue conversation dengan result
    // ...
  }
}
```

---

## 🎯 Rekomendasi

### Untuk Production:
1. **Gunakan Agent sebagai Proxy** (Opsi 2)
   - ✅ Paling mudah
   - ✅ Agent sudah support MCP
   - ✅ ChatGPT call Agent via function calling

2. **Expose REST API** (Opsi 3)
   - ✅ Langsung dari MCP server
   - ✅ Bisa dipakai ChatGPT atau LLM lain
   - ⚠️ Perlu tambah route di MCP server

### Untuk Development:
- **MCP Inspector**: Test MCP tools langsung
- **Claude Desktop**: Native MCP support
- **Agent**: Test full flow

---

## 📚 Referensi

- [MCP Specification](https://modelcontextprotocol.io)
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling)
- [Nullshot MCP Framework](https://nullshot.ai/docs/mcp)

---

## ✅ Checklist

- [ ] Expose REST API dari MCP tools (opsional)
- [ ] Buat OpenAI function definitions
- [ ] Test dengan OpenAI API
- [ ] Integrate dengan ChatGPT (via Agent atau langsung)

---

**Note**: Saat ini, **Claude Desktop** adalah cara termudah untuk test MCP secara native. Untuk ChatGPT, perlu adapter atau proxy via Agent.

