import { verifyAccessJWT } from "./util/access";

export interface Env {
  API_KEY: string;
  ACCESS_JWKS_URL: string;
  JWT_AUD: string;
  DB: D1Database;
  KV_DATA: KVNamespace;
  KV_BLOBS: KVNamespace;
  // MANDALA_BUCKET: R2Bucket;        // bind later
  // STRIPE_WEBHOOK_SECRET: string;   // env later
}

function authOK(req: Request, env: Env) {
  // x-api-key gate
  const k = req.headers.get("x-api-key");
  if (!k || k !== env.API_KEY) return false;
  return true;
}

export default {
  async fetch(req: Request, env: Env) {
    // Require BOTH x-api-key and Access JWT for protected routes
    const url = new URL(req.url);
    const protectedPath = !["/healthz", "/favicon.ico"].includes(url.pathname);
    if (protectedPath) {
      if (!authOK(req, env)) {
        return new Response("Unauthorized", { status: 401 });
      }
      const claims = await verifyAccessJWT(req.headers.get("Authorization"), env);
      if (!claims) {
        return new Response("Unauthorized", { status: 401 });
      }
      // you can use claims.sub as user id mapping if desired
    }

    // 1) Public health
    if (url.pathname === "/healthz" && req.method === "GET") {
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    // 2) Favicon bypass (unauth)
    if (url.pathname === "/favicon.ico") {
        return new Response(null, { status: 204, headers: { 'cache-control': 'public, max-age=86400' }});
    }

    // 4) POST /classify
    if (url.pathname === "/classify" && req.method === "POST") {
      const { classify } = await import("./routes/classify");
      return classify(req, env);
    }

    // 5) TODO Issue 4: R2 /mandalas endpoints
    // - POST /mandalas (auth)
    // - GET  /mandalas/:key (public)

    // default
    return new Response("Not found", { status: 404 });
  },
};