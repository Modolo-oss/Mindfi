# 🚀 Setup ChatGPT dengan MindFi MCP

ChatGPT support MCP via **Developer Mode** dan **Custom Connector**!

## ✅ Solusi: Custom Connector di Developer Mode

MCP server kita sudah expose REST API endpoints yang bisa digunakan sebagai Custom Connector di ChatGPT Developer Mode.

## 📋 Endpoints

### 1. List Tools (Get Function Definitions)
```
GET /api/tools?sessionId=default
```

Returns OpenAI function format:
```json
[
  {
    "type": "function",
    "function": {
      "name": "get_wallet_balance",
      "description": "Check wallet balance on a specific chain",
      "parameters": {
        "type": "object",
        "properties": {
          "address": { "type": "string" },
          "chain": { "type": "string" }
        }
      }
    }
  }
]
```

### 2. Call Tool
```
POST /api/tools/:toolName?sessionId=default
Body: { "address": "0x...", "chain": "ethereum" }
```

## 🎯 Cara Setup dengan ChatGPT

### ✅ Opsi 1: Developer Mode + Custom Connector (CARA YANG BENAR!)

1. **Enable Developer Mode di ChatGPT**
   - Buka ChatGPT settings
   - Aktifkan Developer Mode

2. **Tambah Custom Connector:**
   - Buka **Settings** → **Developer** → **Custom Connectors**
   - Klik **Add Custom Connector**

3. **Configure Custom Connector:**
   - **Name**: `MindFi MCP`
   - **Type**: `MCP Server` atau `REST API`
   - **Base URL**: `https://mindfi-mcp.akusiapasij252.workers.dev`
   - **Endpoints**:
     - **List Tools**: `/api/tools?sessionId=default`
     - **Call Tool**: `/api/tools/{toolName}?sessionId=default`

4. **Save** dan test!

**Note**: Format exact configuration mungkin berbeda tergantung versi ChatGPT. Pastikan menggunakan Developer Mode dan Custom Connector section.

### Opsi 2: OpenAI API dengan Function Calling

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MCP_SERVER = 'https://mindfi-mcp.akusiapasij252.workers.dev';

// 1. Get function definitions
const functionsResponse = await fetch(`${MCP_SERVER}/api/tools?sessionId=default`);
const functions = await functionsResponse.json();

// 2. Call ChatGPT with functions
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Check my wallet balance on Ethereum" }],
  tools: functions,
  tool_choice: "auto"
});

// 3. Execute function calls
for (const toolCall of response.choices[0].message.tool_calls || []) {
  const toolResult = await fetch(
    `${MCP_SERVER}/api/tools/${toolCall.function.name}?sessionId=default`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: toolCall.function.arguments
    }
  );
  
  const result = await toolResult.json();
  // Continue conversation with result...
}
```

### Opsi 3: Web Interface

Buat simple web interface yang:
1. Connect ke ChatGPT API
2. Auto-fetch functions dari `/api/tools`
3. Handle function calls ke MCP server
4. Display results

## 🧪 Test Endpoints

### Test List Tools
```bash
curl "https://mindfi-mcp.akusiapasij252.workers.dev/api/tools?sessionId=test"
```

### Test Call Tool
```bash
curl -X POST "https://mindfi-mcp.akusiapasij252.workers.dev/api/tools/get_token_price?sessionId=test" \
  -H "Content-Type: application/json" \
  -d '{"token": "ethereum"}'
```

## 📝 Available Tools

1. `get_wallet_balance` - Check wallet balance
2. `get_token_price` - Get token price
3. `swap_tokens` - Swap tokens
4. `get_portfolio` - Get portfolio
5. `transfer_tokens` - Transfer tokens
6. `create_wallet` - Create new wallet
7. `connect_wallet` - Connect wallet
8. `get_my_wallet` - Get connected wallet
9. `disconnect_wallet` - Disconnect wallet
10. `monitor_price` - Set price alert
11. `interpret_query` - Natural language routing

## ✅ Keuntungan

- ✅ **Mudah setup** - Cukup add functions ke Custom GPT
- ✅ **Tidak perlu stdio transport** - Pakai HTTP REST API
- ✅ **Bisa dipakai ChatGPT Web/App** - Via Custom GPT
- ✅ **Bisa dipakai OpenAI API** - Via function calling
- ✅ **Bisa dipakai LLM lain** - Standard REST API

## 🎯 Next Steps

1. ✅ REST API sudah ready
2. ⏳ Test dengan Custom GPT
3. ⏳ Buat web interface (optional)

---

**Note**: Ini lebih mudah daripada setup Claude Desktop dengan stdio transport! 🎉

