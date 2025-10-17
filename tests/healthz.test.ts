import { unstable_dev } from "wrangler";
import type { Unstable_DevWorker } from "wrangler";

let worker: Unstable_DevWorker;

beforeAll(async () => {
  worker = await unstable_dev("src/worker.ts", { experimental: { disableExperimentalWarning: true }});
});
afterAll(async () => { await worker.stop(); });

test("GET /healthz is public and returns JSON", async () => {
  const res = await worker.fetch("/healthz");
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("application/json");
  const body = await res.json();
  expect(body).toEqual({ status: "ok" });
});

test("GET / without key is 401", async () => {
  const res = await worker.fetch("/");
  expect(res.status).toBe(401);
});