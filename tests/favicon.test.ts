import { unstable_dev } from "wrangler";
import type { Unstable_DevWorker } from "wrangler";
import { describe, test, expect, beforeAll, afterAll } from 'vitest';

let worker: Unstable_DevWorker;

beforeAll(async () => {
  worker = await unstable_dev("src/worker.ts", { experimental: { disableExperimentalWarning: true }});
});

afterAll(async () => {
  await worker.stop();
});

describe("favicon bypass", () => {
  test("GET /favicon.ico returns 204 and no auth required", async () => {
    const res = await worker.fetch("/favicon.ico");
    expect(res.status).toBe(204);
  });
});