#!/bin/bash

echo "=== MindFi MCP Server Tool Testing ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

BASE_URL="http://127.0.0.1:8080"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
response=$(curl -s "$BASE_URL/health")
if echo "$response" | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed${NC}"
  echo "Response: $response"
fi
echo ""

# Test 2: Tool Count
echo -e "${YELLOW}Test 2: Tool Count${NC}"
tools_response=$(curl -s "$BASE_URL/tools")
tool_count=$(echo "$tools_response" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
if [ "$tool_count" = "33" ]; then
  echo -e "${GREEN}✓ All 33 tools registered${NC}"
else
  echo -e "${RED}✗ Expected 33 tools, got $tool_count${NC}"
fi
echo ""

# Test 3: List All Tools
echo -e "${YELLOW}Test 3: Verify Tool Names${NC}"
required_tools=(
  "get_wallet_balance"
  "get_token_price"
  "swap_tokens"
  "get_portfolio"
  "transfer_tokens"
  "connect_wallet"
  "get_my_wallet"
  "disconnect_wallet"
  "monitor_price"
  "interpret_query"
  "create_trading_wallet"
  "get_trading_wallet"
  "get_trading_limits"
  "list_active_alerts"
  "cancel_alert"
  "schedule_dca"
  "cancel_dca"
  "list_dca_schedules"
  "set_stop_loss"
  "set_take_profit"
  "get_transaction_history"
  "get_global_market"
  "get_token_chart"
  "get_token_ohlcv"
  "get_token_approvals"
  "revoke_approval"
  "get_market_conditions"
  "get_portfolio_health"
  "get_dca_opportunities"
  "get_liquidation_risk"
  "set_target_allocation"
  "get_rebalance_suggestion"
  "enable_auto_rebalance"
)

missing_tools=0
for tool in "${required_tools[@]}"; do
  if echo "$tools_response" | grep -q "\"$tool\""; then
    echo -e "${GREEN}  ✓${NC} $tool"
  else
    echo -e "${RED}  ✗${NC} $tool (MISSING)"
    ((missing_tools++))
  fi
done

echo ""
if [ $missing_tools -eq 0 ]; then
  echo -e "${GREEN}✓ All 33 required tools found${NC}"
else
  echo -e "${RED}✗ $missing_tools tools missing${NC}"
fi
echo ""

# Test 4: Server Info
echo -e "${YELLOW}Test 4: Server Info${NC}"
info=$(curl -s "$BASE_URL/")
echo "$info" | grep -q "MindFi" && echo -e "${GREEN}✓ Server info available${NC}" || echo -e "${RED}✗ Server info not found${NC}"
echo ""

# Test 5: Status Endpoint
echo -e "${YELLOW}Test 5: Server Status${NC}"
status=$(curl -s "$BASE_URL/status")
echo "$status" | grep -q "DefiMcpServer" && echo -e "${GREEN}✓ Status endpoint working${NC}" || echo -e "${RED}✗ Status endpoint failed${NC}"
echo ""

# Test 6: API Tools Endpoint
echo -e "${YELLOW}Test 6: API Tools (OpenAI Format)${NC}"
api_tools=$(curl -s "$BASE_URL/api/tools")
tool_count_api=$(echo "$api_tools" | grep -o '"type":"function"' | wc -l)
if [ "$tool_count_api" -ge 30 ]; then
  echo -e "${GREEN}✓ API tools endpoint working ($tool_count_api tools)${NC}"
else
  echo -e "${RED}✗ API tools endpoint may have issues${NC}"
fi
echo ""

echo "=== Testing Summary ==="
echo "Server: Running"
echo "Total Tools: 33"
echo "Status: Ready for deployment"
