import type { Env } from "./types.js";

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    console.log(`[TEST Worker] Request: ${request.method} ${path}`);

    if (path === "/health") {
      return new Response(
        JSON.stringify({ status: "ok", timestamp: Date.now(), test: true }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response("Test Worker OK", { status: 200 });
  },
};
