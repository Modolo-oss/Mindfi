# PowerShell script to setup Claude Desktop for LOCAL development
# This script will generate the correct config with localhost URL

$projectRoot = Split-Path -Parent $PSScriptRoot
$bridgePath = Join-Path $projectRoot "mcp\claude-stdio-bridge.cjs"
$bridgePath = $bridgePath -replace '\\', '\\'  # Escape backslashes for JSON

$claudeConfigDir = "$env:APPDATA\Claude"
$claudeConfigPath = Join-Path $claudeConfigDir "claude_desktop_config.json"

# Create Claude config directory if it doesn't exist
if (-not (Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
    Write-Host "✅ Created Claude config directory: $claudeConfigDir" -ForegroundColor Green
}

# Generate config JSON for LOCAL
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

# Write config file
$config | Out-File -FilePath $claudeConfigPath -Encoding UTF8 -Force

Write-Host "✅ Claude Desktop config untuk LOCAL sudah dibuat!" -ForegroundColor Green
Write-Host "`n📋 Config location: $claudeConfigPath" -ForegroundColor Cyan
Write-Host "`n📝 Config content:" -ForegroundColor Yellow
Write-Host $config -ForegroundColor Gray
Write-Host "`n⚠️  NEXT STEPS:" -ForegroundColor Yellow
Write-Host "   1. Buka Terminal baru, jalankan: cd mcp && pnpm dev" -ForegroundColor White
Write-Host "   2. Pastikan server jalan di http://localhost:8787" -ForegroundColor White
Write-Host "   3. Restart Claude Desktop" -ForegroundColor White
Write-Host "   4. Test dengan Claude Desktop!" -ForegroundColor White
Write-Host "`n💡 Tips:" -ForegroundColor Cyan
Write-Host "   - Server harus jalan sebelum Claude Desktop connect" -ForegroundColor White
Write-Host "   - Check http://localhost:8787/health untuk verify server jalan" -ForegroundColor White


