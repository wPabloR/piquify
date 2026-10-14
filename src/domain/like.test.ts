import { describe, expect, it } from "vitest";
import { likeContains } from "@/domain/like";

describe("likeContains", () => {
  it("envuelve el texto y escapa comodines de LIKE", () => {
    expect(likeContains("biel")).toBe("%biel%");
    expect(likeContains("%")).toBe("%!%%");
    expect(likeContains("a_b")).toBe("%a!_b%");
    expect(likeContains("hey!")).toBe("%hey!!%");
  });
});
