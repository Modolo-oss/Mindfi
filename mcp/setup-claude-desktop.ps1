# PowerShell script to setup Claude Desktop config
# This script will generate the correct config with absolute paths

$projectRoot = Split-Path -Parent $PSScriptRoot
$sseClientPath = Join-Path $projectRoot "mcp\claude-sse-client.cjs"
$sseClientPath = $sseClientPath -replace '\\', '\\'  # Escape backslashes for JSON

$claudeConfigDir = "$env:APPDATA\Claude"
$claudeConfigPath = Join-Path $claudeConfigDir "claude_desktop_config.json"

# Create Claude config directory if it doesn't exist
if (-not (Test-Path $claudeConfigDir)) {
    New-Item -ItemType Directory -Path $claudeConfigDir -Force | Out-Null
    Write-Host "✅ Created Claude config directory: $claudeConfigDir" -ForegroundColor Green
}

# Generate config JSON
$bridgePath = Join-Path $projectRoot "mcp\claude-stdio-bridge.cjs"
$bridgePath = $bridgePath -replace '\\', '\\'  # Escape backslashes for JSON

$config = @{
    mcpServers = @{
        "mindfi-defi" = @{
            command = "node"
            args = @($bridgePath)
            env = @{
                MCP_URL = "https://mindfi-mcp.akusiapasij252.workers.dev/sse?sessionId=default"
                SESSION_ID = "default"
            }
        }
    }
} | ConvertTo-Json -Depth 10

# Write config file
$config | Out-File -FilePath $claudeConfigPath -Encoding UTF8 -Force

Write-Host "✅ Claude Desktop config created/updated!" -ForegroundColor Green
Write-Host "`n📋 Config location: $claudeConfigPath" -ForegroundColor Cyan
Write-Host "`n📝 Config content:" -ForegroundColor Yellow
Write-Host $config -ForegroundColor Gray
Write-Host "`n⚠️  Next steps:" -ForegroundColor Yellow
Write-Host "   1. Make sure Node.js is installed and in PATH" -ForegroundColor White
Write-Host "   2. Make sure @modelcontextprotocol/sdk is installed:" -ForegroundColor White
Write-Host "      cd mcp && pnpm install" -ForegroundColor Gray
Write-Host "   3. Restart Claude Desktop" -ForegroundColor White
Write-Host "   4. Check Claude Desktop logs if there are issues:" -ForegroundColor White
Write-Host "      $env:APPDATA\Claude\logs\mcp.log" -ForegroundColor Gray

