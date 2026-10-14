import { describe, expect, it } from "vitest";
import {
  canCastVote,
  canCreatePique,
  canJoin,
  canLeave,
  nextStatusWhenDeadlinePasses,
  nextStatusWhenLastParticipantLeaves,
} from "@/domain/access";

const now = new Date("2026-10-13T12:00:00Z");
const future = new Date("2026-10-13T18:00:00Z");

describe("acceso a un pique", () => {
  it("solo deja crear piques al admin", () => {
    expect(canCreatePique("admin")).toBe(true);
    expect(canCreatePique("member")).toBe(false);
  });

  it("permite entrar con saldo y cambiar la opción sin otro cargo", () => {
    expect(
      canJoin({
        isMember: true,
        status: "open",
        closesAt: future,
        now,
        balance: 200,
        stake: 80,
        alreadyParticipating: false,
      }),
    ).toEqual({ ok: true, mode: "join" });

    expect(
      canJoin({
        isMember: true,
        status: "open",
        closesAt: future,
        now,
        balance: 0,
        stake: 80,
        alreadyParticipating: true,
      }),
    ).toEqual({ ok: true, mode: "change" });
  });

  it("rechaza ajenos, plazo vencido y saldo insuficiente", () => {
    expect(
      canJoin({
        isMember: false,
        status: "open",
        closesAt: future,
        now,
        balance: 200,
        stake: 80,
        alreadyParticipating: false,
      }).ok,
    ).toBe(false);
    expect(
      canJoin({
        isMember: true,
        status: "locked",
        closesAt: future,
        now,
        balance: 200,
        stake: 80,
        alreadyParticipating: false,
      }),
    ).toMatchObject({ code: "PIQUE_CLOSED" });
    expect(
      canJoin({
        isMember: true,
        status: "open",
        closesAt: future,
        now,
        balance: 50,
        stake: 80,
        alreadyParticipating: false,
      }),
    ).toMatchObject({ code: "INSUFFICIENT_BALANCE" });
  });

  it("devuelve el stake solo a quien participa dentro del plazo", () => {
    expect(
      canLeave({ status: "open", closesAt: future, now, participating: true }),
    ).toEqual({ ok: true });
    expect(
      canLeave({ status: "open", closesAt: now, now, participating: true }),
    ).toMatchObject({ code: "PIQUE_CLOSED" });
  });

  it("permite volver a entrar después de salir si hay saldo", () => {
    expect(canLeave({ status: "open", closesAt: future, now, participating: true })).toEqual({
      ok: true,
    });
    expect(
      canJoin({
        isMember: true,
        status: "open",
        closesAt: future,
        now,
        balance: 200,
        stake: 80,
        alreadyParticipating: false,
      }),
    ).toEqual({ ok: true, mode: "join" });
  });

  it("deja votar una sola vez a un participante que no propuso", () => {
    const votingEndsAt = new Date("2026-10-15T12:00:00Z");
    expect(
      canCastVote({
        status: "pending_result",
        isParticipant: true,
        isProposer: false,
        alreadyVoted: false,
        votingEndsAt,
        now,
      }),
    ).toEqual({ ok: true });
    expect(
      canCastVote({
        status: "pending_result",
        isParticipant: true,
        isProposer: false,
        alreadyVoted: true,
        votingEndsAt,
        now,
      }),
    ).toMatchObject({ code: "ALREADY_VOTED" });
    expect(
      canCastVote({
        status: "pending_result",
        isParticipant: true,
        isProposer: true,
        alreadyVoted: false,
        votingEndsAt,
        now,
      }),
    ).toMatchObject({ code: "INVALID_INPUT" });
  });

  it("cierra al vencer y cancela cuando no queda nadie", () => {
    expect(nextStatusWhenDeadlinePasses("open", 0)).toBe("cancelled");
    expect(nextStatusWhenDeadlinePasses("open", 2)).toBe("locked");
    expect(nextStatusWhenLastParticipantLeaves(0)).toBe("cancelled");
    expect(nextStatusWhenLastParticipantLeaves(1)).toBe("open");
  });
});
