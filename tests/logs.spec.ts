import { describe, it, expect } from "vitest";
import { sanitizeForLog, logRequest } from "../src/util/logs";
import { FakeD1, makeEnv } from "./fakes";

describe("sanitizeForLog", () => {
  it("masks known PII fields", () => {
    const out = sanitizeForLog({
      text: "hello",
      email: "a@b.com",
      nested: { lon: -122.3, keep: 1 },
    });
    expect(out.text).toBe("[masked]");
    expect(out.email).toBe("[masked]");
    expect(out.nested.lon).toBe("[masked]");
    expect(out.nested.keep).toBe(1);
  });
});

describe("logRequest", () => {
  it("inserts masked body into request_logs", async () => {
    const db = new FakeD1({ request_logs: [] });
    const env = makeEnv({ DB: db as any });
    await logRequest(env, { route: "/classify", body: { text: "PII" } });
    const rows = db.tables.get("request_logs")!;
    expect(rows.length).toBe(1);
    const stored = JSON.parse(rows[0].body_json);
    expect(stored.text).toBe("[masked]");
  });
});