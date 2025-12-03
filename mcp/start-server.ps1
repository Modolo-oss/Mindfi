# PowerShell script to start MCP server and verify it's running
# This will start the server and keep it running

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting MindFi MCP Server..." -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found!" -ForegroundColor Red
    Write-Host "   Please run this script from the mcp/ directory" -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
        exit 1
    }
}

Write-Host "✅ Dependencies OK" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Starting server on http://localhost:8787..." -ForegroundColor Cyan
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANT: Keep this terminal open!" -ForegroundColor Yellow
Write-Host "   Server must be running for Claude Desktop to connect" -ForegroundColor Yellow
Write-Host ""

# Start the server
pnpm dev

