import { describe, expect, it } from "vitest";
import { participantKey } from "@/domain/participants";

describe("participantKey", () => {
  it("no depende del orden", () => {
    const a = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const b = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    expect(participantKey([a, b])).toBe(participantKey([b, a]));
    expect(participantKey([a, b])).toMatch(/^[a-f0-9]{64}$/);
  });
});
