import { beforeEach, describe, expect, it } from "vitest";
import { Client } from "../../src/client.js";
import { MOCK_URL, mockCaptured, mockControl, mockReset } from "../helpers.js";

function buildClient(): Client {
  return new Client("sk_test_secret", { host: MOCK_URL, flushAt: 10_000, flushInterval: 3600, timeout: 2 });
}

describe("delivery against the live mock", () => {
  beforeEach(async () => {
    await mockReset();
  });

  it("retries a 429 with Retry-After and delivers", async () => {
    await mockControl("/__mock/fail", { times: 1, status: 429, retry_after: 1 });
    const client = buildClient();
    const started = Date.now();
    client.track("u1", "retried_delivery");
    await client.flush();
    await client.close();

    expect(Date.now() - started).toBeGreaterThanOrEqual(950); // timer precision
    const captured = await mockCaptured();
    expect(captured.events.map((event) => event.event)).toEqual(["retried_delivery"]);
    expect(client.dropped).toBe(0);
  });

  it("does not retry a 401 and counts the drop", async () => {
    const client = new Client("sk_wrong_key", { host: MOCK_URL, flushAt: 10_000, flushInterval: 3600 });
    client.track("u1", "rejected");
    await client.flush();
    await client.close();

    expect((await mockCaptured()).events).toHaveLength(0);
    expect(client.dropped).toBe(1);
  });

  it("survives a corrupt response by retrying", async () => {
    // corrupt mode answers 200 with garbage — for /capture delivery the 200
    // means accepted-but-unparseable... the SDK only needs the status, so
    // this delivers on the first response. Use "cut" for a real mid-flight
    // failure instead.
    await mockControl("/__mock/fail", { times: 1, mode: "cut" });
    const client = buildClient();
    client.track("u1", "after_cut");
    await client.flush();
    await client.close();

    const captured = await mockCaptured();
    expect(captured.events.map((event) => event.event)).toEqual(["after_cut"]);
  });

  it("gzips large batches end-to-end", async () => {
    const client = buildClient();
    client.track("u1", "fat_event", { blob: "x".repeat(5000) });
    await client.flush();
    await client.close();

    const captured = await mockCaptured();
    expect(captured.batches[0]?.gzip).toBe(true);
    expect(captured.events[0]?.event).toBe("fat_event");
  });

  it("evaluates flags configured on the mock", async () => {
    await mockControl("/__mock/flags", {
      flags: [
        { key: "on_flag", active: true, rollout_percentage: 100 },
        { key: "off_flag", active: false, rollout_percentage: 100 },
        {
          key: "variant_flag_1",
          active: true,
          rollout_percentage: 100,
          variants: [
            { key: "control", rollout_percentage: 50 },
            { key: "test", rollout_percentage: 50 },
          ],
        },
      ],
    });
    const client = buildClient();

    expect(await client.isEnabled("on_flag", "user_42")).toBe(true);
    expect(await client.isEnabled("off_flag", "user_42")).toBe(false);
    expect(await client.getFeatureFlag("off_flag", "user_42")).toBe(false);
    expect(await client.getFeatureFlag("missing_flag", "user_42", { default: "fallback" })).toBe("fallback");

    // The frozen vectors pin variant_flag_1/user_42 → "test".
    expect(await client.getFeatureFlag("variant_flag_1", "user_42")).toBe("test");
    await client.close();
  });

  it("returns the default when decide times out", async () => {
    await mockControl("/__mock/fail", { times: 1, mode: "timeout", delay_ms: 3000 });
    const client = buildClient();
    expect(await client.isEnabled("anything", "u1", { default: true })).toBe(true);
    await client.close();
  });
});
