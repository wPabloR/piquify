import { describe, expect, it } from "vitest";
import {
  BET_MAX_OPTIONS,
  BET_MIN_OPTIONS,
  BET_MIN_STAKE,
  BET_OPTION_LABEL_MAX_LENGTH,
  BET_TITLE_MAX_LENGTH,
  INITIAL_ACCOUNT_BALANCE,
  RESULT_VOTE_HOURS,
  effectiveBetStatus,
  resolveProposedResult,
  resultVoteClosesAt,
  settlePayout,
} from "./index.js";

describe("@piquify/contracts", () => {
  it("locks an open bet after the deadline", () => {
    expect(
      effectiveBetStatus(
        "open",
        new Date("2026-01-01T12:00:00.000Z"),
        new Date("2026-01-01T12:00:01.000Z"),
      ),
    ).toBe("locked");
  });

  it("keeps resolved bets resolved after the deadline", () => {
    expect(
      effectiveBetStatus(
        "resolved",
        new Date("2026-01-01T12:00:00.000Z"),
        new Date("2026-01-02T12:00:00.000Z"),
      ),
    ).toBe("resolved");
  });

  it("exports pique and points limits", () => {
    expect(INITIAL_ACCOUNT_BALANCE).toBe(200);
    expect(BET_TITLE_MAX_LENGTH).toBe(80);
    expect(BET_OPTION_LABEL_MAX_LENGTH).toBe(80);
    expect(BET_MIN_OPTIONS).toBe(2);
    expect(BET_MAX_OPTIONS).toBe(10);
    expect(BET_MIN_STAKE).toBe(1);
  });

  it("gives the whole pot to a single winner", () => {
    expect(
      settlePayout({ stake: 10, participantCount: 3, winnerCount: 1 }),
    ).toEqual({ pot: 30, share: 30, residual: 0, refund: 0 });
  });

  it("splits the pot between winners and keeps the remainder", () => {
    expect(
      settlePayout({ stake: 5, participantCount: 3, winnerCount: 2 }),
    ).toEqual({ pot: 15, share: 7, residual: 1, refund: 0 });
  });

  it("refunds the stake to everyone when nobody hits", () => {
    expect(
      settlePayout({ stake: 10, participantCount: 4, winnerCount: 0 }),
    ).toEqual({ pot: 40, share: 0, residual: 0, refund: 10 });
  });

  it("gives participants 48 hours to validate a proposed result", () => {
    expect(RESULT_VOTE_HOURS).toBe(48);
    expect(
      resultVoteClosesAt(new Date("2026-09-18T12:00:00.000Z")).toISOString(),
    ).toBe("2026-09-20T12:00:00.000Z");
  });

  it("waits for missing votes before the validation window closes", () => {
    expect(
      resolveProposedResult({
        proposedOptionId: "opt-1",
        participantIds: ["user-2", "user-3"],
        votes: [
          { userId: "user-2", choice: "confirm", suggestedOptionId: null },
        ],
        now: new Date("2026-09-19T12:00:00.000Z"),
        voteClosesAt: new Date("2026-09-20T12:00:00.000Z"),
      }),
    ).toBeNull();
  });

  it("treats silence as a confirm after 48 hours", () => {
    expect(
      resolveProposedResult({
        proposedOptionId: "opt-1",
        participantIds: ["user-2", "user-3"],
        votes: [
          { userId: "user-2", choice: "confirm", suggestedOptionId: null },
        ],
        now: new Date("2026-09-20T12:00:00.000Z"),
        voteClosesAt: new Date("2026-09-20T12:00:00.000Z"),
      }),
    ).toEqual({ winningOptionId: "opt-1" });
  });

  it("uses the option suggested by a majority against", () => {
    expect(
      resolveProposedResult({
        proposedOptionId: "opt-1",
        participantIds: ["user-2", "user-3", "user-4"],
        votes: [
          { userId: "user-2", choice: "reject", suggestedOptionId: "opt-2" },
          { userId: "user-3", choice: "reject", suggestedOptionId: "opt-2" },
          { userId: "user-4", choice: "confirm", suggestedOptionId: null },
        ],
        now: new Date("2026-09-19T12:00:00.000Z"),
        voteClosesAt: new Date("2026-09-20T12:00:00.000Z"),
      }),
    ).toEqual({ winningOptionId: "opt-2" });
  });
});
