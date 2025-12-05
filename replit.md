# MindFi MCP Server

## Overview

MindFi is an AI-native DeFi platform built on the Nullshot MCP Framework, enabling AI assistants to perform blockchain and cryptocurrency operations. Deployed on Cloudflare Workers, it offers services like checking wallet balances, token swapping, price monitoring, and portfolio management. The platform aims to combine fast cross-chain swaps with smart AI strategies, featuring a tiered subscription model with X402 payments and an XAVA token buyback mechanism.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Technology Stack

-   **Runtime Environment:** Cloudflare Workers and Durable Objects for serverless edge computing and persistent state.
-   **Language:** TypeScript with Node.js module resolution.
-   **MCP Framework:** Nullshot MCP Framework (`@nullshot/mcp`) for building MCP servers, utilizing Hono for routing.
-   **Package Management:** pnpm.

### Architectural Patterns

-   **Service Layer Pattern:** Separates MCP tools from external API integrations into dedicated service classes:
    -   `ThirdwebToolboxService`: Handles blockchain operations, wallet management, token transfers.
    -   `ThirdwebEngineService`: Manages backend trading wallets and autonomous swap execution.
    -   `CoinGeckoService`: Retrieves real-time token price data.
    -   `SwapExecutionAgent`: Orchestrates cross-chain token swaps.
-   **Session-Based State Management:** Uses Cloudflare Durable Objects for connected wallet addresses, price monitoring alerts, and user session context.
-   **Tool-First Design:** Exposes 35 tools and 1 resource via the Model Context Protocol, covering:
    -   Wallet & Session Management (e.g., `connect_wallet`, `get_my_wallet`)
    -   Portfolio & Balance (e.g., `get_wallet_balance`, `get_portfolio`)
    -   Trading & Swaps (e.g., `swap_tokens`, `monitor_price`)
    -   Autonomous Trading (e.g., `create_trading_wallet`, `list_active_alerts`)
    -   DCA, Stop Loss & Take Profit scheduling.
    -   Transaction History (`get_transaction_history`).
    -   Market Data (`get_global_market`, `get_token_chart`).
    -   Token Approvals (`get_token_approvals`, `revoke_approval`).
    -   AI Strategy Tools (e.g., `get_market_conditions`, `get_portfolio_health`, `enable_auto_rebalance`) that return structured data for LLM analysis.
    -   ChatGPT-Compatible Tools: `search` and `fetch` for token/market discovery and detailed data retrieval.
-   **Natural Language Routing:** `NaturalLanguageRouterAgent` maps user intent to appropriate tools.
-   **Dynamic Token Resolution:** Employs a three-tier system (static cache → Thirdweb Bridge API → manual contract address) for broad token support.
-   **Autonomous Trading System:** `ThirdwebEngineService` manages backend wallets and executes swaps automatically based on durable object alarms.
-   **Security Safeguards:** Includes transaction limits, strict price validation, stablecoin whitelisting, token resolution at alert creation, and a fail-fast design for robust operation.
-   **Simplified Architecture:** Removal of local crypto libraries and wallet creation, implementation of lazy service initialization, and reliance on SSE transport for tool calls.

### Deployment Architecture

-   **Deployment Model:** Single Cloudflare Worker with Durable Objects.
-   **URL Structure:** Includes `/health`, `/api/tools`, `/status`, and SSE endpoints for MCP clients.
-   **Configuration:** Environment variables managed via Cloudflare Workers secrets.

## External Dependencies

### Blockchain & DeFi APIs

-   **Thirdweb Platform:** Primary blockchain infrastructure provider for wallet balances, token metadata, cross-chain swaps, payment processing (X402), and multi-chain portfolio aggregation. Authenticated via `x-secret-key`.
-   **CoinGecko API:** Provides real-time cryptocurrency price data, market cap, volume, and token ID resolution. Optional API key for higher limits.

### AI & Protocol Standards

-   **Model Context Protocol (MCP):** Open standard for AI assistant tool integration, using Server-Sent Events (SSE) for transport and JSON-RPC 2.0 format.
-   **Claude Desktop Integration:** Native MCP client utilizing SSE transport.

### Development & Deployment Tools

-   **Wrangler CLI:** For Cloudflare Workers deployment, management, and local development.
-   **MCP Inspector:** GUI testing tool for MCP servers.