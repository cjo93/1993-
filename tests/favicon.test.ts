import worker from "../src/worker";
import { createExecutionContext, createTestEnv } from "./helpers";

describe("favicon bypass", () => {
  test("GET /favicon.ico returns 204 and no auth required", async () => {
    const env = createTestEnv();
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request("https://defrag.example/favicon.ico", {
        headers: { "cf-connecting-ip": "198.51.100.3" },
      }),
      env,
      ctx as unknown as ExecutionContext
    );
    await ctx.waitForAll();
    expect(res.status).toBe(204);
  });
});
