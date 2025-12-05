import { NextResponse } from "next/server";

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || "https://mindfi-mcp.akusiapasij252.workers.dev";

export async function GET() {
  try {
    const healthResponse = await fetch(`${MCP_SERVER_URL}/health`, {
      cache: "no-store",
    });

    const connected = healthResponse.ok;
    let tools = 0;

    if (connected) {
      try {
        const toolsResponse = await fetch(`${MCP_SERVER_URL}/api/tools?sessionId=status`);
        if (toolsResponse.ok) {
          const data = await toolsResponse.json();
          tools = (data.tools || data || []).length;
        }
      } catch {
        tools = 35;
      }
    }

    return NextResponse.json({
      connected,
      url: MCP_SERVER_URL,
      tools,
      lastPing: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({
      connected: false,
      url: MCP_SERVER_URL,
      tools: 0,
      error: "Failed to check server status",
    });
  }
}
