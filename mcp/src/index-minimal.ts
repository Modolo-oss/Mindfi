export default {
  async fetch(request: Request): Promise<Response> {
    return new Response(JSON.stringify({ status: "minimal worker ok" }), {
      headers: { "Content-Type": "application/json" }
    });
  }
};
