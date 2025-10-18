import worker from "../src/worker";
import { createExecutionContext, createTestEnv } from "./helpers";

describe("POST /classify", () => {
  test("401 without key", async () => {
    const env = createTestEnv();
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request("https://defrag.example/classify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "cf-connecting-ip": "203.0.113.1",
        },
        body: JSON.stringify({ text: "calm and focused" }),
      }),
      env,
      ctx as unknown as ExecutionContext
    );
    await ctx.waitForAll();
    expect(res.status).toBe(401);
  });

  test("400 on invalid body", async () => {
    const env = createTestEnv();
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request("https://defrag.example/classify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.API_KEY,
          "cf-connecting-ip": "203.0.113.2",
        },
        body: JSON.stringify({ text: "" }),
      }),
      env,
      ctx as unknown as ExecutionContext
    );
    await ctx.waitForAll();
    expect(res.status).toBe(400);
  });

  test("200 on valid request returns classification", async () => {
    const env = createTestEnv();
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request("https://defrag.example/classify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.API_KEY,
          "cf-connecting-ip": "203.0.113.3",
        },
        body: JSON.stringify({ text: "I feel calm and serene today" }),
      }),
      env,
      ctx as unknown as ExecutionContext
    );
    await ctx.waitForAll();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.label).toBe("positive");
    expect(body.score).toBeGreaterThan(0);
  });
});
