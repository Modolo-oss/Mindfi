import { Hono } from "hono";
import { cors } from "hono/cors";

import { Env } from "./index.js";

const DEFAULT_SESSION_PATH = "/agent/chat/:sessionId?";

export function buildAgentRouter(app: Hono<{ Bindings: Env }>) {
  // Enable CORS for frontend
  app.use("/*", cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
  }));

  // Root endpoint
  app.get("/", (c) => c.json({
    name: "MindFi Backend",
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

    const body = await c.req.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return await (stub as any).processMessage(sessionId, body);
  });

  app.get("/health", (c) => c.json({ status: "ok", timestamp: Date.now() }));
}

