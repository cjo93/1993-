import type { Env } from '../worker';

export function sanitizeForLog(obj: any): any {
  if (obj == null) return obj;
  if (typeof obj === "string") return "[masked]";
  if (Array.isArray(obj)) return obj.map(sanitizeForLog);
  if (typeof obj === "object") {
    const out: any = {};
    for (const k of Object.keys(obj)) {
      if (["dob","birth_ts","lat","lon","location","email","name","text"].includes(k)) {
        out[k] = "[masked]";
      } else out[k] = sanitizeForLog(obj[k]);
    }
    return out;
  }
  return obj;
}

export async function logRequest(env: Env, entry: { route: string; body?: any; ip?: string }) {
  try {
    const id = crypto.randomUUID();
    const route = entry.route || "";
    const ip = entry.ip || "";
    const body = entry.body ? JSON.stringify(sanitizeForLog(entry.body)) : "{}";
    await env.DB.prepare(
      "INSERT INTO request_logs(id, route, body_json, ip) VALUES(?,?,?,?)"
    ).bind(id, route, body, ip).run();
  } catch {}
}