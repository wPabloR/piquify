import { describe, expect, it } from "vitest";
import {
  applicableResidual,
  combinePot,
  sameParticipants,
  splitIntegerPot,
} from "@/domain/money";

describe("dinero del pique", () => {
  it("suma el stake de cada participante y el residual exacto", () => {
    expect(combinePot(80, 3, 2)).toBe(242);
    expect(sameParticipants(["b", "a"], ["a", "b"])).toBe(true);
    expect(
      applicableResidual(
        [
          { amount: 2, participantIds: ["a", "b"] },
          { amount: 5, participantIds: ["a", "c"] },
        ],
        ["b", "a"],
      ),
    ).toBe(2);
  });

  it("reparte en enteros y conserva el total", () => {
    const result = splitIntegerPot(100, 3);
    expect(result).toEqual({ share: 33, residual: 1 });
    expect(result.share * 3 + result.residual).toBe(100);
  });

  it("rechaza importes que no son enteros", () => {
    expect(() => splitIntegerPot(10.5, 2)).toThrow("INVALID_POT");
  });
});
