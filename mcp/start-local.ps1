# PowerShell script to start local MCP server and setup Claude Desktop
# This will:
# 1. Update Claude Desktop config to use localhost
# 2. Start the local dev server

$projectRoot = Split-Path -Parent $PSScriptRoot
$bridgePath = Join-Path $projectRoot "mcp\claude-stdio-bridge.cjs"
$bridgePath = $bridgePath -replace '\\', '\\'  # Escape backslashes for JSON

$claudeConfigDir = "$env:APPDATA\Claude"
$claudeConfigPath = Join-Path $claudeConfigDir "claude_desktop_config.json"

Write-Host "🚀 Setting up LOCAL MCP Server for Claude Desktop" -ForegroundColor Cyan
Write-Host ""

# Step 1: Update Claude Desktop config
Write-Host "📝 Step 1: Updating Claude Desktop config..." -ForegroundColor Yellow

if (-not (Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
}

$config = @{
    mcpServers = @{
        "mindfi-defi" = @{
            command = "node"
            args = @($bridgePath)
            env = @{
                MCP_URL = "http://localhost:8787/sse?sessionId=default"
                SESSION_ID = "default"
            }
        }
    }
} | ConvertTo-Json -Depth 10

$config | Out-File -FilePath $claudeConfigPath -Encoding UTF8 -Force
Write-Host "✅ Config updated: $claudeConfigPath" -ForegroundColor Green
Write-Host ""

# Step 2: Check if server is already running
Write-Host "🔍 Step 2: Checking if server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8787/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "⚠️  Server sudah jalan di port 8787!" -ForegroundColor Yellow
    Write-Host "   Jika ingin restart, tutup terminal ini dan jalankan lagi" -ForegroundColor Gray
    Write-Host ""
    Write-Host "✅ Setup selesai! Restart Claude Desktop untuk connect." -ForegroundColor Green
    exit 0
} catch {
    Write-Host "✅ Port 8787 kosong, siap untuk start server" -ForegroundColor Green
    Write-Host ""
}

# Step 3: Start the server
Write-Host "🚀 Step 3: Starting local MCP server..." -ForegroundColor Yellow
Write-Host "   Server akan jalan di: http://localhost:8787" -ForegroundColor Gray
Write-Host "   Tekan Ctrl+C untuk stop server" -ForegroundColor Gray
Write-Host ""
Write-Host "⏳ Starting..." -ForegroundColor Cyan
Write-Host ""

# Change to mcp directory and start dev server
Set-Location $projectRoot\mcp
pnpm dev

