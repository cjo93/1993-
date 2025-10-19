import { describe, it, expect, vi } from "vitest";
import { classify } from "../src/routes/classify";
import { makeEnv, FakeD1 } from "./fakes";

const goodVerify = vi.fn(async () => ({ sub: "user-1" }));
const badVerify  = vi.fn(async () => null);

function makeReq(body: any, headers?: Record<string,string>) {
  return new Request("http://x/classify", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": "test-api-key", Authorization: "Bearer GOOD", ...(headers||{}) },
    body: JSON.stringify(body),
  });
}

describe("/classify", () => {
  it("401 without API key", async () => {
    const env = makeEnv();
    const req = new Request("http://x/classify", { method: "POST" });
    const res = await classify(req, env, { verify: goodVerify });
    expect(res.status).toBe(401);
  });

  it("401 with bad JWT", async () => {
    const env = makeEnv();
    const req = makeReq({ text: "hello" }, { Authorization: "Bearer BAD" });
    const res = await classify(req, env, { verify: badVerify });
    expect(res.status).toBe(401);
  });

  it("400 on invalid payload", async () => {
    const env = makeEnv({ DB: new FakeD1({ request_logs: [] }) as any });
    const req = makeReq({ nope: true });
    const res = await classify(req, env, { verify: goodVerify });
    expect(res.status).toBe(400);
  });

  it("200 on valid payload and logs masked body", async () => {
    const db = new FakeD1({ request_logs: [] });
    const env = makeEnv({ DB: db as any });
    const req = makeReq({ text: "Decided to confront my boss" });
    const res = await classify(req, env, { verify: goodVerify });
    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; category: string };
    expect(json.ok).toBe(true);
    expect(["work","general"]).toContain(json.category);

    const rows = db.tables.get("request_logs")!;
    expect(rows.length).toBe(1);
    const stored = JSON.parse(rows[0].body_json);
    expect(stored.text).toBe("[masked]");
  });
});