import worker from "../src/worker";
import { createExecutionContext, createTestEnv } from "./helpers";

describe("healthz", () => {
  test("GET /healthz is public and returns JSON", async () => {
    const env = createTestEnv();
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request("https://defrag.example/healthz", {
        headers: { "cf-connecting-ip": "198.51.100.1" },
      }),
      env,
      ctx as unknown as ExecutionContext
    );
    await ctx.waitForAll();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body).toEqual({ status: "ok" });
  });

  test("GET / without key is 401", async () => {
    const env = createTestEnv();
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request("https://defrag.example/", {
        headers: { "cf-connecting-ip": "198.51.100.2" },
      }),
      env,
      ctx as unknown as ExecutionContext
    );
    await ctx.waitForAll();
    expect(res.status).toBe(401);
  });
});
