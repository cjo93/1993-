export interface Env {
  API_KEY: string;
  // DB_LOGS: D1Database;             // bind later
  // MANDALA_BUCKET: R2Bucket;        // bind later
  // STRIPE_WEBHOOK_SECRET: string;   // env later
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1) Public health
    if (url.pathname === "/healthz" && request.method === "GET") {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // 2) Favicon bypass (unauth)
    if (url.pathname === "/favicon.ico") {
        return new Response(null, { status: 204, headers: { 'cache-control': 'public, max-age=86400' }});
    }

    // 3) Auth gate for everything else
    const key = request.headers.get("x-api-key");
    if (!key || key !== env.API_KEY) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 4) TODO Issue 2: POST /classify (stub)
    if (url.pathname === "/classify" && request.method === "POST") {
      return new Response(
        JSON.stringify({ ok: true, label: "neutral", score: 0.5 }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    // 5) TODO Issue 4: R2 /mandalas endpoints
    // - POST /mandalas (auth)
    // - GET  /mandalas/:key (public)

    // default
    return new Response("Not found", { status: 404 });
  },
};