import { Hono } from "hono";
import { cors } from "hono/cors";

import type { Env } from "./types.js";

const DEFAULT_SESSION_PATH = "/agent/chat/:sessionId?";

export function buildAgentRouter(app: Hono<{ Bindings: Env }>) {
  app.use("/*", cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }));

  app.get("/", (c) => c.json({
    name: "MindFi Agent",
    version: "1.0.0",
    status: "online",
    endpoints: {
      chat: "/agent/chat/:sessionId",
      health: "/health"
    }
  }));

  app.post(DEFAULT_SESSION_PATH, async (c) => {
    const { DEFI_PORTFOLIO_AGENT } = c.env;
    const sessionId = c.req.param("sessionId") || crypto.randomUUID();
    const durableId = DEFI_PORTFOLIO_AGENT.idFromName(sessionId);
    const stub = DEFI_PORTFOLIO_AGENT.get(durableId);

    const body = await c.req.json<{ id?: string; messages: Array<{ role: string; content: string }> }>();
    
    return await stub.processMessage(sessionId, {
      id: body.id || sessionId,
      messages: body.messages,
    });
  });

  app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));
}

