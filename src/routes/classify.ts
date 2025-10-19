import { verifyAccessJWT as realVerify } from "../util/access";
import { logRequest } from "../util/logs";
import { jsonResponse } from "../util/json";
import type { Env } from '../worker';

export async function classify(req: Request, env: Env, opts?: { verify?: typeof realVerify }) {
  const verify = opts?.verify ?? realVerify;

  // x-api-key
  if (req.headers.get("x-api-key") !== env.API_KEY) return new Response("Unauthorized", { status: 401 });

  // JWT
  const claims = await verify(req.headers.get("Authorization"), env);
  if (!claims) return new Response("Unauthorized", { status: 401 });

  const body = (await req.json().catch(() => null)) as { text?: unknown };
  if (!body?.text || typeof body.text !== "string") {
    return jsonResponse({ error: "Invalid payload" }, 400);
  }

  // categorize (stub)
  const category = body.text.toLowerCase().includes("boss") ? "work" : "general";

  await logRequest(env, { route: "/classify", body });

  return jsonResponse({ ok: true, category, confidence: 0.5 });
}