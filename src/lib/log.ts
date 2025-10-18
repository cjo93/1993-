import { sha256Hex } from "./hash";

type LogEnv = {
  DB: D1Database;
};

export type LogEntry = {
  id: string;
  ts: number;
  route: string;
  status: number;
  ms: number;
  ip?: string;
  ua?: string;
  apiKeyId?: string;
  err?: string;
};

export async function logRequest(env: LogEnv, entry: LogEntry): Promise<void> {
  if (!env?.DB) {
    return;
  }

  const [ipSha, uaSha] = await Promise.all([
    entry.ip ? sha256Hex(entry.ip) : Promise.resolve(undefined),
    entry.ua ? sha256Hex(entry.ua) : Promise.resolve(undefined),
  ]);

  await env.DB.prepare(
    `INSERT INTO requests (id, ts, route, status, ms, ip_sha256, ua_sha256, api_key_id, err)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      entry.id,
      entry.ts,
      entry.route,
      entry.status,
      entry.ms,
      ipSha ?? null,
      uaSha ?? null,
      entry.apiKeyId ?? null,
      entry.err ?? null
    )
    .run();
}
