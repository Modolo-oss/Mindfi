import { McpHonoServerDO } from "@nullshot/mcp";
import type { McpServer, Implementation } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { Env } from "./types.js";
import { SwapExecutionAgent } from "./agents/swap/SwapExecutionAgent.js";
import { ThirdwebToolboxService } from "./services/ThirdwebToolboxService.js";
import { CoinGeckoService } from "./services/CoinGeckoService.js";
import { setupServerTools } from "./tools.js";
import { setupServerResources } from "./resources.js";

export class DefiMcpServer extends McpHonoServerDO<Env> {
    private toolbox: ThirdwebToolboxService;
    private swapAgent: SwapExecutionAgent;
    private coinGecko: CoinGeckoService;

    constructor(state: DurableObjectState, env: Env) {
        super(state, env);
        this.toolbox = new ThirdwebToolboxService(env);
        this.swapAgent = new SwapExecutionAgent(this.toolbox);
        this.coinGecko = new CoinGeckoService(env.COINGECKO_API_KEY);
    }

    // Required: Define server metadata
    getImplementation(): Implementation {
        return {
            name: 'DefiMcpServer',
            version: '1.0.0',
        };
    }

    // Required: Configure all server capabilities
    configureServer(server: McpServer): void {
        // Add tools (functions agents can call)
        setupServerTools(server, {
            toolbox: this.toolbox,
            coinGecko: this.coinGecko,
            swapAgent: this.swapAgent,
            state: this.state,
        });
        
        // Add resources (data agents can read)
        setupServerResources(server);
    }
}

