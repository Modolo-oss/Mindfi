import { Hono } from "hono";

import { MindFiAgent } from "./agents/MindFiAgent.js";
import { buildAgentRouter } from "./router.js";
import type { Env } from "./types.js";

export type { Env };
export { MindFiAgent };

const app = new Hono<{ Bindings: Env }>();

buildAgentRouter(app);

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
