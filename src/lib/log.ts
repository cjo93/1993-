export type LogEntry = {
  id: string; ts: number; route: string; status: number; ms: number;
  ip?: string; ua?: string; apiKeyId?: string; err?: string;
};

// TODO: bind env.DB_LOGS (D1) later
export async function logRequest(/* env: Env, */) {
  // no-op stub; wire to D1 after migration lands
}