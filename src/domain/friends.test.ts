import { describe, expect, it } from "vitest";
import {
  FRIEND_CODE_LENGTH,
  friendCodeFromBytes,
  friendRelation,
  orderedPair,
  parseFriendCode,
} from "@/domain/friends";

describe("friendCodeFromBytes", () => {
  it("produce 8 caracteres del alfabeto Crockford", () => {
    const code = friendCodeFromBytes(new Uint8Array([0, 31, 32, 255, 100, 7, 18, 200]));
    expect(code).toHaveLength(FRIEND_CODE_LENGTH);
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(code).toBe("0Z0Z47J8");
  });

  it("rechaza menos bytes de los necesarios", () => {
    expect(() => friendCodeFromBytes(new Uint8Array(3))).toThrow();
  });
});

describe("parseFriendCode", () => {
  it("ignora mayúsculas, espacios y guiones", () => {
    expect(parseFriendCode(" k7m2-9qxa ")).toEqual({ ok: true, value: "K7M29QXA" });
  });

  it("rechaza longitudes o letras fuera del alfabeto", () => {
    expect(parseFriendCode("K7M29QX").ok).toBe(false);
    expect(parseFriendCode("K7M29QXU").ok).toBe(false);
    expect(parseFriendCode("K7M29QXAA").ok).toBe(false);
  });
});

describe("orderedPair", () => {
  it("ordena los ids de forma estable", () => {
    expect(orderedPair("b", "a")).toEqual(["a", "b"]);
    expect(orderedPair("a", "b")).toEqual(["a", "b"]);
  });
});

describe("friendRelation", () => {
  it("prioriza la amistad sobre solicitudes pendientes", () => {
    expect(
      friendRelation({ isFriend: true, pendingFromActor: true, pendingFromOther: true }),
    ).toBe("friend");
  });

  it("distingue solicitud saliente, entrante y ninguna", () => {
    expect(
      friendRelation({ isFriend: false, pendingFromActor: true, pendingFromOther: false }),
    ).toBe("outgoing");
    expect(
      friendRelation({ isFriend: false, pendingFromActor: false, pendingFromOther: true }),
    ).toBe("incoming");
    expect(
      friendRelation({ isFriend: false, pendingFromActor: false, pendingFromOther: false }),
    ).toBe("none");
  });
});
