import { describe, expect, it } from "vitest";
import {
  ATTENTION_LIMIT,
  type AttentionCandidate,
  buildAttentionItems,
} from "@/domain/attention";

const now = new Date("2026-10-15T12:00:00Z");

function candidate(overrides: Partial<AttentionCandidate> = {}): AttentionCandidate {
  return {
    piqueId: overrides.piqueId ?? "p1",
    playgroundId: overrides.playgroundId ?? "g1",
    question: overrides.question ?? "¿Quién gana?",
    playgroundName: overrides.playgroundName ?? "Casa",
    status: overrides.status ?? "open",
    closesAt: overrides.closesAt ?? new Date("2026-10-15T20:00:00Z"),
    votingEndsAt: overrides.votingEndsAt ?? null,
    isAdmin: overrides.isAdmin ?? false,
    isMember: overrides.isMember ?? true,
    isParticipant: overrides.isParticipant ?? false,
    isProposer: overrides.isProposer ?? false,
    alreadyVoted: overrides.alreadyVoted ?? false,
  };
}

describe("te toca", () => {
  it("incluye voto pendiente, propuesta del admin y cierre en 24 h", () => {
    const items = buildAttentionItems(
      [
        candidate({
          piqueId: "vote-1",
          status: "pending_result",
          isParticipant: true,
          votingEndsAt: new Date("2026-10-16T12:00:00Z"),
        }),
        candidate({
          piqueId: "propose-1",
          status: "locked",
          isAdmin: true,
          closesAt: new Date("2026-10-14T12:00:00Z"),
        }),
        candidate({
          piqueId: "close-1",
          status: "open",
          closesAt: new Date("2026-10-16T12:00:00Z"),
        }),
      ],
      now,
    );

    expect(items.map((item) => item.kind)).toEqual(["vote", "propose", "closing"]);
    expect(items.map((item) => item.piqueId)).toEqual(["vote-1", "propose-1", "close-1"]);
  });

  it("excluye ajenos, proposer, ya votado, no admin en locked y cierre lejano", () => {
    const items = buildAttentionItems(
      [
        candidate({ piqueId: "ajeno", isMember: false, status: "open" }),
        candidate({
          piqueId: "proposer",
          status: "pending_result",
          isParticipant: true,
          isProposer: true,
          votingEndsAt: new Date("2026-10-16T12:00:00Z"),
        }),
        candidate({
          piqueId: "voted",
          status: "pending_result",
          isParticipant: true,
          alreadyVoted: true,
          votingEndsAt: new Date("2026-10-16T12:00:00Z"),
        }),
        candidate({ piqueId: "locked-member", status: "locked", isAdmin: false }),
        candidate({
          piqueId: "late",
          status: "open",
          closesAt: new Date("2026-10-16T12:00:01Z"),
        }),
        candidate({ piqueId: "resolved", status: "resolved" }),
      ],
      now,
    );

    expect(items).toEqual([]);
  });

  it("incluye cierre aunque ya participe y prioriza votos al recortar", () => {
    const manyVotes = Array.from({ length: ATTENTION_LIMIT }, (_, index) =>
      candidate({
        piqueId: `vote-${String(index).padStart(2, "0")}`,
        status: "pending_result",
        isParticipant: true,
        votingEndsAt: new Date(now.getTime() + (index + 1) * 60_000),
      }),
    );
    const extra = candidate({
      piqueId: "close-overflow",
      status: "open",
      isParticipant: true,
      closesAt: new Date("2026-10-15T18:00:00Z"),
    });

    const items = buildAttentionItems([...manyVotes, extra], now);

    expect(items).toHaveLength(ATTENTION_LIMIT);
    expect(items.every((item) => item.kind === "vote")).toBe(true);
    expect(items[0]?.piqueId).toBe("vote-00");
  });
});
