import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function setupServerResources(server: McpServer): void {
    server.resource(
        "defi_stats",
        "defi://stats",
        async (uri: URL) => {
            return {
                contents: [
                    {
                        uri: uri.href,
                        mimeType: "application/json",
                        text: JSON.stringify({
                            supportedChains: ["ethereum", "bsc", "polygon", "avalanche"],
                            supportedOperations: ["swap", "balance", "payment", "transfer"],
                            timestamp: Date.now(),
                        }, null, 2),
                    },
                ],
            };
        }
    );
}

