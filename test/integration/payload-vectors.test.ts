import { beforeEach, describe, expect, it } from "vitest";
import { Client } from "../../src/client.js";
import { MOCK_URL, mockCaptured, mockReset, readVectors } from "../helpers.js";

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ISO_MS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

interface PayloadVector {
  name: string;
  call: {
    method: "track" | "identify" | "alias";
    args: {
      distinct_id?: string;
      previous_id?: string;
      event?: string;
      properties?: Record<string, unknown>;
      traits?: Record<string, unknown>;
      opts?: { timestamp?: string; uuid?: string };
    };
  };
  expect_event?: Record<string, unknown>;
  expect?: "discarded";
}

function buildClient(): Client {
  return new Client("sk_test_secret", { host: MOCK_URL, flushAt: 10_000, flushInterval: 3600 });
}

function replay(client: Client, vector: PayloadVector): void {
  const { method, args } = vector.call;
  const opts = args.opts ?? {};
  switch (method) {
    case "track":
      client.track(args.distinct_id as string, args.event as string, args.properties ?? {}, opts);
      break;
    case "identify":
      client.identify(args.distinct_id as string, args.traits ?? {}, opts);
      break;
    case "alias":
      client.alias(args.previous_id as string, args.distinct_id as string);
      break;
  }
}

describe("payload vectors against the live mock", () => {
  const doc = readVectors<{ vectors: PayloadVector[] }>("payload.json");

  beforeEach(async () => {
    await mockReset();
  });

  for (const vector of doc.vectors) {
    it(vector.name, async () => {
      const client = buildClient();
      replay(client, vector);
      await client.flush();
      await client.close();

      const captured = await mockCaptured();
      if (vector.expect === "discarded") {
        expect(captured.events).toHaveLength(0);
        return;
      }

      expect(captured.events).toHaveLength(1);
      const event = captured.events[0] as NonNullable<(typeof captured.events)[0]>;
      const expected = vector.expect_event as Record<string, unknown>;

      expect(event.event).toBe(expected["event"]);
      expect(event.distinct_id).toBe(expected["distinct_id"]);
      expect(event.properties).toEqual(expected["properties"]);

      if (expected["uuid"] === "<uuid_v7>") expect(event.uuid).toMatch(UUID_V7);
      else expect(event.uuid).toBe(expected["uuid"]);

      if (expected["timestamp"] === "<iso8601_utc_ms>") expect(event.timestamp).toMatch(ISO_MS);
      else expect(event.timestamp).toBe(expected["timestamp"]);
    });
  }
});
