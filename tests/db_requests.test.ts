import { sha256Hex } from "../src/lib/hash";
import { logRequest } from "../src/lib/log";
import { createTestEnv, D1DatabaseStub } from "./helpers";

describe("D1 requests logging", () => {
  test("writes and reads a row", async () => {
    const db = new D1DatabaseStub();
    const env = createTestEnv({ DB: db });
    const entry = {
      id: "req-1",
      ts: 1700000000000,
      route: "POST /classify",
      status: 200,
      ms: 42,
      ip: "1.2.3.4",
      ua: "jest",
      apiKeyId: "12345678",
    } as const;

    await logRequest(env, entry);

    expect(db.tables.requests).toHaveLength(1);
    const row = db.tables.requests[0];
    expect(row).toMatchObject({
      id: entry.id,
      route: entry.route,
      status: entry.status,
      ms: entry.ms,
      api_key_id: entry.apiKeyId,
    });
    expect(row.ip_sha256).toBe(await sha256Hex(entry.ip));
    expect(row.ua_sha256).toBe(await sha256Hex(entry.ua));
  });
});
