import { sha256Hex } from "./hash";

type PaymentsEnv = {
  DB: D1Database;
};

type PaymentRecord = {
  id: string;
  ts: number;
  amount: number;
  email?: string | null;
};

export async function recordPayment(env: PaymentsEnv, data: PaymentRecord): Promise<void> {
  if (!env?.DB) {
    return;
  }

  const ts = Math.trunc(data.ts);
  const emailHash = data.email ? await sha256Hex(data.email.toLowerCase()) : null;

  await env.DB.prepare(
    `INSERT OR IGNORE INTO payments (id, ts, amount, email_hash) VALUES (?, ?, ?, ?)`
  )
    .bind(data.id, ts, data.amount, emailHash)
    .run();
}
