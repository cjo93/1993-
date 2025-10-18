import type { Env } from "../src/worker";

export class D1PreparedStatementStub {
  private params: unknown[] = [];

  constructor(private readonly db: D1DatabaseStub, private readonly sql: string) {}

  bind(...params: unknown[]): D1PreparedStatementStub {
    this.params = params;
    return this;
  }

  async run(): Promise<void> {
    this.db.execute(this.sql, this.params);
  }

  async first<T>(): Promise<T | null> {
    const all = await this.all<T>();
    return all.results[0] ?? null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.db.query<T>(this.sql, this.params) };
  }
}

export class D1DatabaseStub {
  tables: Record<string, any[]> = {
    requests: [],
    mandalas: [],
    payments: [],
  };

  prepare(sql: string): D1PreparedStatementStub {
    return new D1PreparedStatementStub(this, sql);
  }

  execute(sql: string, params: unknown[]): void {
    const normalized = sql.trim().toLowerCase();
    if (normalized.startsWith("insert into requests")) {
      const [id, ts, route, status, ms, ipSha, uaSha, apiKeyId, err] = params;
      this.tables.requests.push({
        id,
        ts,
        route,
        status,
        ms,
        ip_sha256: ipSha,
        ua_sha256: uaSha,
        api_key_id: apiKeyId,
        err,
      });
      return;
    }

    if (normalized.startsWith("insert into mandalas")) {
      const [id, ts, key, meta] = params;
      this.tables.mandalas.push({ id, ts, r2_key: key, meta_json: meta });
      return;
    }

    if (normalized.startsWith("insert or ignore into payments")) {
      const [id, ts, amount, emailHash] = params;
      const exists = this.tables.payments.some((row) => row.id === id);
      if (!exists) {
        this.tables.payments.push({ id, ts, amount, email_hash: emailHash });
      }
      return;
    }

    throw new Error(`Unsupported SQL: ${sql}`);
  }

  query<T>(sql: string, params: unknown[]): T[] {
    const normalized = sql.trim().toLowerCase();
    if (normalized.startsWith("select * from requests")) {
      if (params.length === 0) {
        return this.tables.requests as T[];
      }
      const [id] = params;
      return this.tables.requests.filter((row) => row.id === id) as T[];
    }

    throw new Error(`Unsupported query: ${sql}`);
  }
}

type StoredObject = {
  value: Uint8Array;
  httpMetadata?: { contentType?: string };
};

export class R2BucketStub {
  private readonly store = new Map<string, StoredObject>();

  async put(
    key: string,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string,
    options?: { httpMetadata?: { contentType?: string } }
  ): Promise<void> {
    const body = await readBody(value);
    this.store.set(key, { value: body, httpMetadata: options?.httpMetadata });
  }

  async get(key: string): Promise<R2Object | null> {
    const stored = this.store.get(key);
    if (!stored) {
      return null;
    }

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(stored.value);
        controller.close();
      },
    });

    return {
      body: stream,
      size: stored.value.byteLength,
      httpMetadata: stored.httpMetadata,
    } as R2Object;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }
}

async function readBody(
  value: ReadableStream | ArrayBuffer | ArrayBufferView | string
): Promise<Uint8Array> {
  if (typeof value === "string") {
    return new TextEncoder().encode(value);
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength));
  }

  if (value instanceof ReadableStream) {
    const reader = value.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      chunks.push(chunk);
    }
    const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
    const result = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return result;
  }

  throw new Error("Unsupported body type");
}

export function createTestEnv(overrides: Partial<Env & { DB: D1DatabaseStub; MANDALA_BUCKET: R2BucketStub }> = {}) {
  const db = overrides.DB ?? new D1DatabaseStub();
  const bucket = overrides.MANDALA_BUCKET ?? new R2BucketStub();
  return {
    API_KEY: "test-key",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    DB: db,
    MANDALA_BUCKET: bucket,
    ...overrides,
  } satisfies Env & { DB: D1DatabaseStub; MANDALA_BUCKET: R2BucketStub };
}

export function createExecutionContext() {
  const promises: Promise<unknown>[] = [];
  return {
    waitUntil(promise: Promise<unknown>) {
      promises.push(promise);
    },
    passThroughOnException() {
      // no-op for tests
    },
    async waitForAll() {
      await Promise.all(promises);
    },
  };
}
