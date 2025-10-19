import type { Env } from '../src/worker';

type BindArgs = unknown[];

class FakeD1Stmt {
  constructor(private sql: string, private onRun: (sql: string, args: BindArgs) => any) {}
  private args: BindArgs = [];
  bind(...args: BindArgs) { this.args = args; return this; }
  async run()  { return this.onRun(this.sql, this.args); }
  async first<T = any>() { const r = await this.onRun(this.sql, this.args); return (r && r[0]) ?? null as T; }
  async all<T = any>()   { const r = await this.onRun(this.sql, this.args); return { results: r as T[] }; }
}

export class FakeD1 {
  // super-light in-memory tables
  tables = new Map<string, any[]>();
  logs: Array<{ sql: string; args: unknown[] }> = [];

  constructor(seed: Record<string, any[]> = {}) {
    for (const [k, v] of Object.entries(seed)) this.tables.set(k, [...v]);
  }

  prepare(sql: string) {
    return new FakeD1Stmt(sql, (s, a) => this._exec(s, a));
  }

  private _exec(sql: string, args: BindArgs) {
    this.logs.push({ sql, args });

    // very naive pattern match for the request_logs insert used in /classify
    if (/INSERT\s+INTO\s+request_logs/i.test(sql)) {
      const row = { id: args[0], route: args[1], body_json: args[2], ip: args[3], created_at: new Date().toISOString() };
      const t = this.tables.get("request_logs") ?? [];
      t.push(row);
      this.tables.set("request_logs", t);
      return { success: true };
    }

    // extend patterns as needed for tests
    return { success: true };
  }
}

// KV fake (string storage only for tests)
export class FakeKV {
  store = new Map<string, string>();
  async get(key: string, _options?: any): Promise<any> {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string, _options?: any): Promise<void> {
    this.store.set(key, value);
  }
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
  async list(_options?: any): Promise<any> {
    const keys = Array.from(this.store.keys()).map((name) => ({ name }));
    return { keys, list_complete: true, cursor: "" };
  }
}

// Minimal ctx that records waitUntil calls
export function makeCtx(): ExecutionContext {
  const calls: any[] = [];
  const ctx = {
    waitUntil(p: Promise<any>) { calls.push(p); },
    passThroughOnException() {},
    calls,
  } as unknown as ExecutionContext;
  return ctx;
}

// Build a fake Env object with just what routes need
export function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    API_KEY: "test-api-key",
    ACCESS_JWKS_URL: "https://example/jwks.json",
    JWT_AUD: "aud-test",
    DB: new FakeD1() as any,
    KV_DATA: new FakeKV() as any,
    KV_BLOBS: new FakeKV() as any,
    ...overrides,
  } as unknown as Env;
}