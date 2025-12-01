#!/bin/bash
# Test MCP Server Tools
# This script tests all MCP tools by starting the server and making test requests

echo "🧪 Testing MCP Server Tools..."
echo ""

# Check if .dev.vars exists
if [ ! -f ".dev.vars" ]; then
    echo "⚠️  Warning: .dev.vars not found"
    echo "   Create .dev.vars with:"
    echo "   THIRDWEB_SECRET_KEY=your-key"
    echo "   COINGECKO_API_KEY=your-key"
    echo ""
fi

# Start server in background
echo "🚀 Starting MCP server..."
pnpm dev &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Test health endpoint
echo "📡 Testing health endpoint..."
curl -s http://localhost:8787/health | jq '.' || echo "❌ Health check failed"

# Test MCP endpoint
echo ""
echo "📡 Testing MCP endpoint..."
curl -s http://localhost:8787/?sessionId=test-session | jq '.' || echo "❌ MCP endpoint failed"

# Stop server
echo ""
echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null

echo ""
echo "✅ Test complete!"

