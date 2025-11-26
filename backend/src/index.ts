import { Hono } from "hono";

import { MindFiAgent } from "./agents/MindFiAgent.js";
import { buildAgentRouter } from "./router.js";

export interface Env {
  DEFI_PORTFOLIO_AGENT: DurableObjectNamespace<MindFiAgent>;
  THIRDWEB_SECRET_KEY?: string;
  THIRDWEB_CLIENT_ID?: string;
  XAVA_TREASURY_ADDRESS?: string;
  ANTHROPIC_API_KEY?: string;
  COINGECKO_API_KEY?: string;
  AI_PROVIDER?: string;
  MODEL_ID?: string;
  [key: string]: unknown;
}

const app = new Hono<{ Bindings: Env }>();

buildAgentRouter(app);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};

export { MindFiAgent };

