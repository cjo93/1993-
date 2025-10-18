import worker from "../src/worker";
import { createExecutionContext, createTestEnv } from "./helpers";

describe("rate limit", () => {
  test("exceed threshold -> 429", async () => {
    const env = createTestEnv();
    const ctx = createExecutionContext();

    const requestFactory = () =>
      new Request("https://defrag.example/classify", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": env.API_KEY,
          "cf-connecting-ip": "203.0.113.99",
        },
        body: JSON.stringify({ text: "neutral" }),
      });

    let lastResponse: Response | null = null;
    for (let i = 0; i < 61; i += 1) {
      lastResponse = await worker.fetch(requestFactory(), env, ctx as unknown as ExecutionContext);
    }
    await ctx.waitForAll();

    expect(lastResponse).not.toBeNull();
    expect(lastResponse!.status).toBe(429);
  });
});
