import worker from "../src/worker";
import { createExecutionContext, createTestEnv } from "./helpers";
import { hmacSha256Hex } from "../src/lib/hash";

describe("Stripe webhook", () => {
  test("valid signature -> 200 and row written", async () => {
    const env = createTestEnv();
    const ctx = createExecutionContext();

    const payload = {
      id: "evt_1",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test",
          created: 1700000000,
          amount_total: 4200,
          customer_details: { email: "user@example.com" },
        },
      },
    };
    const rawBody = JSON.stringify(payload);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = await hmacSha256Hex(env.STRIPE_WEBHOOK_SECRET, `${timestamp}.${rawBody}`);
    const res = await worker.fetch(
      new Request("https://defrag.example/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": `t=${timestamp},v1=${signature}`,
          "cf-connecting-ip": "192.0.2.10",
        },
        body: rawBody,
      }),
      env,
      ctx as unknown as ExecutionContext
    );
    await ctx.waitForAll();

    expect(res.status).toBe(200);
    expect(env.DB.tables.payments).toHaveLength(1);
    const payment = env.DB.tables.payments[0];
    expect(payment.id).toBe("cs_test");
    expect(payment.amount).toBe(4200);
    expect(typeof payment.email_hash).toBe("string");
  });

  test("invalid signature -> 400", async () => {
    const env = createTestEnv();
    const ctx = createExecutionContext();
    const res = await worker.fetch(
      new Request("https://defrag.example/webhooks/stripe", {
        method: "POST",
        headers: {
          "stripe-signature": "t=1,v1=badsig",
          "cf-connecting-ip": "192.0.2.11",
        },
        body: JSON.stringify({}),
      }),
      env,
      ctx as unknown as ExecutionContext
    );
    await ctx.waitForAll();
    expect(res.status).toBe(400);
    expect(env.DB.tables.payments).toHaveLength(0);
  });
});
