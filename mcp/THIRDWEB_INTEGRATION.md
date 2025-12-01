# Thirdweb API Integration - MCP Server

## 📋 Overview

MCP Server menggunakan **Thirdweb REST API** untuk semua operasi DeFi. Sistem ini menggunakan **Service Layer Pattern** untuk abstraksi API calls.

## 🏗️ Arsitektur

```
MCP Tool (tools.ts)
    ↓
ThirdwebToolboxService (services/ThirdwebToolboxService.ts)
    ↓
Thirdweb REST API (https://api.thirdweb.com)
```

## 🔧 Service Layer: ThirdwebToolboxService

### Lokasi
`mcp/src/services/ThirdwebToolboxService.ts`

### Fungsi
- **Abstraksi** HTTP requests ke Thirdweb API
- **Authentication** menggunakan Secret Key
- **Error handling** dan response normalization
- **Timeout management** (15 detik)

### Konfigurasi

**Environment Variables:**
```typescript
THIRDWEB_SECRET_KEY  // Required - API secret key
THIRDWEB_CLIENT_ID   // Optional - Client ID
XAVA_TREASURY_ADDRESS // Optional - Treasury wallet
```

**Base URL:**
```
https://api.thirdweb.com
```

**Authentication:**
```typescript
Headers: {
  "Content-Type": "application/json",
  "x-secret-key": THIRDWEB_SECRET_KEY,
  "x-client-id": THIRDWEB_CLIENT_ID  // optional
}
```

## 🛠️ Tools yang Menggunakan Thirdweb

### 1. `get_wallet_balance`
**API Endpoint:**
```
GET /v1/wallets/{address}/balance?chainId={chainId}
```

**Usage:**
```typescript
// Di tools.ts
const result = await context.toolbox.getWalletBalance(address, chain);
```

**Flow:**
1. User calls MCP tool `get_wallet_balance`
2. Tool calls `toolbox.getWalletBalance()`
3. Service makes HTTP GET to Thirdweb API
4. Response returned to MCP tool
5. Tool returns result to AI agent

### 2. `swap_tokens`
**API Endpoints:**
```
GET /v1/bridge/routes          // Find best route
POST /v1/bridge/swap           // Execute swap
```

**Usage:**
```typescript
// Di SwapExecutionAgent
const routes = await this.thirdweb.getBridgeRoutes(query);
const execution = await this.thirdweb.executeBridgeSwap(payload);
```

**Flow:**
1. User requests swap via MCP tool
2. `SwapExecutionAgent` finds best route
3. Service calls Thirdweb bridge API
4. Route returned, swap executed
5. Result returned to user

### 3. `create_payment`
**API Endpoint:**
```
POST /v1/payments
```

**Usage:**
```typescript
// Di tools.ts
const result = await context.toolbox.createX402Payment({
  amount, token, chainId, description
});
```

**Flow:**
1. User creates payment via MCP tool
2. Tool calls `toolbox.createX402Payment()`
3. Service makes HTTP POST to Thirdweb payments API
4. Payment created, response returned

### 4. `transfer_tokens`
**API Endpoint:**
```
POST /v1/wallets/send
```

**Usage:**
```typescript
// Di tools.ts
const result = await context.toolbox.transferTokens({
  to, amount, token, chain
});
```

## 📊 API Methods Available

### Wallet Operations
- `getWalletBalance(address, chainId)` - Get wallet balance
- `listServerWallets()` - List server wallets
- `transferTokens(payload)` - Transfer tokens

### Bridge/Swap Operations
- `getBridgeRoutes(params)` - Find bridge routes
- `getBridgeChains()` - Get supported chains
- `executeBridgeSwap(payload)` - Execute swap
- `convertFiatToCrypto(params)` - Convert fiat to crypto

### Payment Operations (X402)
- `createX402Payment(payload)` - Create payment
- `verifyX402Payment(payload)` - Verify payment
- `settleX402Payment(payload)` - Settle payment
- `fetchPayableServices()` - Get payable services

## 🔐 Authentication Flow

```typescript
// 1. Service initialized with env
const toolbox = new ThirdwebToolboxService(env);

// 2. On request, service checks secret key
await this.ensureReady(); // Throws if no secret key

// 3. Headers built with secret key
const headers = {
  "x-secret-key": this.secretKey,
  "x-client-id": this.clientId, // optional
  "Content-Type": "application/json"
};

// 4. Request sent to Thirdweb API
const response = await fetch(url, {
  method,
  headers,
  body: JSON.stringify(body)
});
```

## 📝 Request/Response Pattern

### Request Method
```typescript
private async request<T>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  path: string,
  body?: Record<string, unknown>,
  query?: Record<string, string>
): Promise<{ ok: boolean; data?: T; error?: string }>
```

### Response Format
```typescript
// Success
{ ok: true, data: {...} }

// Error
{ ok: false, error: "Error message" }
```

### Error Handling
- **Timeout:** 15 seconds max
- **Network errors:** Caught and returned as error
- **API errors:** Status code and message returned
- **Validation:** Secret key checked before request

## 🔄 Complete Flow Example

### Example: Get Wallet Balance

```
1. AI Agent calls MCP tool
   ↓
2. MCP Tool: get_wallet_balance({ address: "0x...", chain: "ethereum" })
   ↓
3. tools.ts: context.toolbox.getWalletBalance(address, chain)
   ↓
4. ThirdwebToolboxService.getWalletBalance()
   - Builds URL: https://api.thirdweb.com/v1/wallets/0x.../balance?chainId=ethereum
   - Adds headers: x-secret-key, Content-Type
   - Makes GET request
   ↓
5. Thirdweb API responds
   ↓
6. Service normalizes response: { ok: true, data: {...} }
   ↓
7. Tool returns to MCP: { content: [{ type: "text", text: "..." }] }
   ↓
8. AI Agent receives result
```

## ⚙️ Configuration

### Local Development
```bash
# .dev.vars
THIRDWEB_SECRET_KEY=sk_...
THIRDWEB_CLIENT_ID=...
XAVA_TREASURY_ADDRESS=0x...
```

### Production
```bash
# Set via Cloudflare
wrangler secret put THIRDWEB_SECRET_KEY
wrangler secret put THIRDWEB_CLIENT_ID
```

## 🎯 Key Points

1. **Service Layer Pattern** - Semua Thirdweb calls melalui `ThirdwebToolboxService`
2. **No Direct API Calls** - Tools tidak langsung call Thirdweb API
3. **Centralized Auth** - Authentication di satu tempat (service)
4. **Error Normalization** - Semua errors di-normalize ke format yang sama
5. **Type Safety** - TypeScript types untuk semua requests/responses

## 📚 Thirdweb API Documentation

- **Base URL:** https://api.thirdweb.com
- **Documentation:** https://portal.thirdweb.com/references
- **Authentication:** Secret Key via `x-secret-key` header

## ✅ Summary

**MCP Server → ThirdwebToolboxService → Thirdweb REST API**

- ✅ Service layer untuk abstraksi
- ✅ Authentication via secret key
- ✅ Error handling terpusat
- ✅ Type-safe dengan TypeScript
- ✅ Timeout management
- ✅ Response normalization

