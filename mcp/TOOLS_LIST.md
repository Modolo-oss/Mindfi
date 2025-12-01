# MCP Tools List

## 📋 All Available Tools (6 Total)

### 1. `get_wallet_balance`
**Description:** Check wallet balance on a specific chain

**Parameters:**
- `address` (string): Wallet address (0x...)
- `chain` (string): Chain ID or name (e.g. 'ethereum', 'bsc')

**API:** `GET /v1/wallets/{address}/balance?chainId={chainId}`

**Example:**
```json
{
  "address": "0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047",
  "chain": "ethereum"
}
```

---

### 2. `get_token_price`
**Description:** Get current token price from CoinGecko

**Parameters:**
- `token` (string): Token symbol (e.g. 'ethereum', 'bitcoin')

**API:** CoinGecko API

**Example:**
```json
{
  "token": "ethereum"
}
```

---

### 3. `swap_tokens`
**Description:** Swap tokens on a specific chain

**Parameters:**
- `amount` (string): Amount of tokens to swap
- `fromChain` (string): Source chain ID or name
- `toChain` (string): Destination chain ID or name
- `fromToken` (string): Source token symbol or address
- `toToken` (string): Destination token symbol or address

**API:** 
- `GET /v1/bridge/routes` (find route)
- `POST /v1/bridge/swap` (execute swap)

**Example:**
```json
{
  "amount": "100",
  "fromChain": "ethereum",
  "toChain": "avalanche",
  "fromToken": "USDC",
  "toToken": "XAVA"
}
```

---

### 4. `monitor_price`
**Description:** Monitor token price and set alert

**Parameters:**
- `token` (string): Token symbol
- `targetPrice` (number): Target price to monitor
- `condition` (enum): Alert condition - "above" or "below"

**Storage:** Uses Durable Object storage for alerts

**Example:**
```json
{
  "token": "ethereum",
  "targetPrice": 3000,
  "condition": "above"
}
```

---

### 5. `get_portfolio`
**Description:** Get wallet portfolio across multiple chains

**Parameters:**
- `address` (string): Wallet address

**Chains:** Ethereum, BSC, Polygon, Avalanche

**Example:**
```json
{
  "address": "0x5a9a201007cde8b95e70c0c0cedd50f26b6ba047"
}
```

---

### 6. `transfer_tokens`
**Description:** Transfer tokens to another address

**Parameters:**
- `toAddress` (string): Recipient address
- `amount` (string): Amount to transfer
- `token` (string): Token symbol or address
- `chain` (string): Chain ID or name

**API:** `POST /v1/wallets/send`

**Example:**
```json
{
  "toAddress": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
  "amount": "10",
  "token": "USDC",
  "chain": "ethereum"
}
```

---

## 📊 Resources

### 1. `defi_stats`
**Description:** DeFi statistics and market data

**URI:** `defi://stats`

**Returns:**
- Supported chains
- Supported operations
- Timestamp

---

## ✅ Testing Checklist

- [ ] `get_wallet_balance` - Test with valid address and chain
- [ ] `get_token_price` - Test with valid token symbol
- [ ] `swap_tokens` - Test route finding (may not execute)
- [ ] `monitor_price` - Test alert storage
- [ ] `get_portfolio` - Test multi-chain balance
- [ ] `transfer_tokens` - Test validation (may not execute)
- [ ] `defi_stats` resource - Test resource access

---

## 🔧 Required Environment Variables

- `THIRDWEB_SECRET_KEY` - Required for wallet/swap/transfer tools
- `COINGECKO_API_KEY` - Required for price tool
- `THIRDWEB_CLIENT_ID` - Optional

