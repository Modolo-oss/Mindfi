import { Hono } from "hono";

import { Env } from "./index";

const DEFAULT_SESSION_PATH = "/agent/chat/:sessionId?";

export function buildAgentRouter(app: Hono<{ Bindings: Env }>) {
  app.post(DEFAULT_SESSION_PATH, async (c) => {
    const { DEFI_PORTFOLIO_AGENT } = c.env;
    const sessionId = c.req.param("sessionId") || crypto.randomUUID();
    const durableId = DEFI_PORTFOLIO_AGENT.idFromName(sessionId);
    const stub = DEFI_PORTFOLIO_AGENT.get(durableId);

    const forwardRequest = new Request(c.req.url, {
      method: c.req.method,
      headers: c.req.header(),
      body: c.req.raw.body,
    });

    return stub.fetch(forwardRequest);
  });

  app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));
}

