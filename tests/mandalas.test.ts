import worker from "../src/worker";
import { createExecutionContext, createTestEnv } from "./helpers";

describe("R2 /mandalas", () => {
  test("POST requires auth and stores PNG", async () => {
    const env = createTestEnv();
    const ctx = createExecutionContext();

    const unauthorized = await worker.fetch(
      new Request("https://defrag.example/mandalas", {
        method: "POST",
        headers: {
          "content-type": "image/png",
          "cf-connecting-ip": "198.51.100.10",
        },
        body: new Uint8Array([137, 80, 78, 71]),
      }),
      env,
      ctx as unknown as ExecutionContext
    );
    expect(unauthorized.status).toBe(401);

    const pngBytes = new Uint8Array([137, 80, 78, 71, 0, 0, 0, 0]);
    const res = await worker.fetch(
      new Request("https://defrag.example/mandalas", {
        method: "POST",
        headers: {
          "content-type": "image/png",
          "x-api-key": env.API_KEY,
          "cf-connecting-ip": "198.51.100.11",
        },
        body: pngBytes,
      }),
      env,
      ctx as unknown as ExecutionContext
    );
    await ctx.waitForAll();

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.key).toMatch(/\.png$/);
    expect(env.DB.tables.mandalas).toHaveLength(1);
    expect(env.MANDALA_BUCKET.has(body.key)).toBe(true);
  });

  test("GET returns content with correct type", async () => {
    const env = createTestEnv();
    const ctx = createExecutionContext();

    const key = "test.png";
    await env.MANDALA_BUCKET.put(key, new Uint8Array([1, 2, 3, 4]), {
      httpMetadata: { contentType: "image/png" },
    });

    const res = await worker.fetch(
      new Request(`https://defrag.example/mandalas/${key}`, {
        headers: { "cf-connecting-ip": "198.51.100.12" },
      }),
      env,
      ctx as unknown as ExecutionContext
    );
    await ctx.waitForAll();

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(bytes)).toEqual([1, 2, 3, 4]);
  });
});
