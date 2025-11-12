import { Hono } from "hono";

import { DefiPortfolioAgentDO } from "./agents/DefiPortfolioAgent";
import { buildAgentRouter } from "./router";

export interface Env {
  DEFI_PORTFOLIO_AGENT: DurableObjectNamespace<DefiPortfolioAgentDO>;
  THIRDWEB_SECRET_KEY?: string;
  THIRDWEB_CLIENT_ID?: string;
  [key: string]: unknown;
}

const app = new Hono<{ Bindings: Env }>();

buildAgentRouter(app);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};

export { DefiPortfolioAgentDO };

