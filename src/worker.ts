import { classifyText } from "./lib/classifier";
import { hmacSha256Hex, timingSafeEqualHex } from "./lib/hash";
import { logRequest } from "./lib/log";
import { recordPayment } from "./lib/payments";
import { hit } from "./lib/rateLimit";

export interface Env {
  API_KEY: string;
  DB: D1Database;
  MANDALA_BUCKET: R2Bucket;
  STRIPE_WEBHOOK_SECRET: string;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function getClientIp(request: Request): string | undefined {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined
  );
}

async function handleClassify(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch (err) {
    return new Response("Invalid JSON", { status: 400 });
  }

  const text = typeof (payload as { text?: unknown }).text === "string" ? (payload as { text: string }).text.trim() : "";
  if (!text) {
    return new Response("Missing text", { status: 400 });
  }

  const result = classifyText(text);
  return new Response(JSON.stringify({ ok: true, ...result }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

async function handleMandalaUpload(request: Request, env: Env): Promise<Response> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("image/png")) {
    return new Response("PNG required", { status: 415 });
  }

  const buffer = await request.arrayBuffer();
  if (buffer.byteLength === 0) {
    return new Response("Empty payload", { status: 400 });
  }
  if (buffer.byteLength > MAX_UPLOAD_BYTES) {
    return new Response("Payload too large", { status: 413 });
  }

  const id = crypto.randomUUID();
  const key = `${id}.png`;
  await env.MANDALA_BUCKET.put(key, buffer, {
    httpMetadata: { contentType: "image/png" },
  });

  const metadata = { size: buffer.byteLength };
  await env.DB.prepare(`INSERT INTO mandalas (id, ts, r2_key, meta_json) VALUES (?, ?, ?, ?)`)
    .bind(id, Date.now(), key, JSON.stringify(metadata))
    .run();

  return new Response(JSON.stringify({ ok: true, id, key, size: buffer.byteLength }), {
    status: 201,
    headers: { "content-type": "application/json" },
  });
}

async function handleMandalaDownload(key: string, env: Env): Promise<Response> {
  if (!key) {
    return new Response("Not found", { status: 404 });
  }

  const object = await env.MANDALA_BUCKET.get(key);
  if (!object || !object.body) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(object.body, {
    status: 200,
    headers: { "content-type": object.httpMetadata?.contentType ?? "image/png" },
  });
}

function parseStripeSignature(header: string | null): { timestamp: string; signature: string } | null {
  if (!header) return null;
  const parts = header.split(",");
  const map = new Map<string, string>();
  for (const part of parts) {
    const [key, value] = part.split("=");
    if (key && value) {
      map.set(key.trim(), value.trim());
    }
  }
  const timestamp = map.get("t");
  const signature = map.get("v1");
  if (!timestamp || !signature) {
    return null;
  }
  return { timestamp, signature };
}

async function handleStripeWebhook(request: Request, env: Env): Promise<Response> {
  const parsed = parseStripeSignature(request.headers.get("stripe-signature"));
  if (!parsed) {
    return new Response("Missing signature", { status: 400 });
  }

  const rawBody = await request.text();
  const payload = `${parsed.timestamp}.${rawBody}`;
  const expected = await hmacSha256Hex(env.STRIPE_WEBHOOK_SECRET, payload);
  if (!timingSafeEqualHex(parsed.signature, expected)) {
    return new Response("Invalid signature", { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return new Response("Invalid JSON", { status: 400 });
  }

  const type: string = event?.type ?? "";
  const dataObject = event?.data?.object ?? {};
  const id: string = dataObject.id ?? event?.id ?? crypto.randomUUID();
  const createdRaw: number = Number(dataObject.created ?? event?.created ?? Date.now());
  const createdMs = createdRaw > 1_000_000_000_000 ? createdRaw : createdRaw * 1000;
  const amount: number = Number(
    dataObject.amount_total ?? dataObject.amount_received ?? dataObject.amount ?? 0
  );
  const email: string | null =
    dataObject.customer_details?.email ??
    dataObject.customer_email ??
    dataObject.receipt_email ??
    dataObject.charges?.data?.[0]?.billing_details?.email ??
    null;

  if (type && amount > 0) {
    await recordPayment(env, {
      id,
      ts: createdMs,
      amount,
      email,
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const start = Date.now();
    const url = new URL(request.url);
    const method = request.method.toUpperCase();
    const route = `${method} ${url.pathname}`;
    const ip = getClientIp(request);
    const ua = request.headers.get("user-agent") ?? undefined;
    let response: Response;
    let errorMessage: string | undefined;
    let apiKeyForLog: string | undefined;

    try {
      if (method === "GET" && url.pathname === "/healthz") {
        response = new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      } else if (url.pathname === "/favicon.ico") {
        response = new Response(null, {
          status: 204,
          headers: { "cache-control": "public, max-age=86400" },
        });
      } else if (method === "GET" && url.pathname.startsWith("/mandalas/")) {
        const key = decodeURIComponent(url.pathname.replace("/mandalas/", ""));
        response = await handleMandalaDownload(key, env);
      } else if (method === "POST" && url.pathname === "/webhooks/stripe") {
        response = await handleStripeWebhook(request, env);
      } else {
        const key = request.headers.get("x-api-key");
        apiKeyForLog = key ?? undefined;
        if (!key || key !== env.API_KEY) {
          response = new Response("Unauthorized", { status: 401 });
        } else {
          const allowed = hit(ip ?? "unknown");
          if (!allowed) {
            response = new Response("Too Many Requests", {
              status: 429,
              headers: { "retry-after": "60" },
            });
          } else if (method === "POST" && url.pathname === "/classify") {
            response = await handleClassify(request);
          } else if (method === "POST" && url.pathname === "/mandalas") {
            response = await handleMandalaUpload(request, env);
          } else {
            response = new Response("Not found", { status: 404 });
          }
        }
      }
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
      response = new Response("Internal Error", { status: 500 });
    }

    const duration = Date.now() - start;
    const logId = crypto.randomUUID();
    ctx.waitUntil(
      logRequest(env, {
        id: logId,
        ts: Date.now(),
        route,
        status: response.status,
        ms: duration,
        ip,
        ua,
        apiKeyId: apiKeyForLog ? apiKeyForLog.slice(-8) : undefined,
        err: errorMessage,
      })
    );

    return response;
  },
};
