import { describe, expect, it } from "vitest";
import { decideWinners } from "@/domain/settlement";

describe("decideWinners", () => {
  it("cuenta el silencio como voto favorable cuando venció el plazo", () => {
    expect(
      decideWinners({
        participantIds: ["a", "b", "c"],
        proposerId: "admin",
        proposedOptionId: "propuesta",
        votes: [],
        votingClosed: true,
      }),
    ).toEqual({ state: "resolved", winnerOptionIds: ["propuesta"] });
  });

  it("cuenta la propuesta del admin participante como voto favorable", () => {
    expect(
      decideWinners({
        participantIds: ["admin", "b", "c"],
        proposerId: "admin",
        proposedOptionId: "propuesta",
        votes: [{ userId: "b", decision: "reject", suggestedOptionId: "otra" }],
        votingClosed: true,
      }),
    ).toEqual({ state: "resolved", winnerOptionIds: ["propuesta"] });
  });

  it("mantiene la propuesta si rechazos y favorables empatan", () => {
    expect(
      decideWinners({
        participantIds: ["a", "b"],
        proposerId: "admin",
        proposedOptionId: "propuesta",
        votes: [
          { userId: "a", decision: "approve" },
          { userId: "b", decision: "reject", suggestedOptionId: "otra" },
        ],
        votingClosed: true,
      }),
    ).toEqual({ state: "resolved", winnerOptionIds: ["propuesta"] });
  });

  it("elige la opción más sugerida por quienes rechazan", () => {
    expect(
      decideWinners({
        participantIds: ["a", "b", "c"],
        proposerId: "admin",
        proposedOptionId: "propuesta",
        votes: [
          { userId: "a", decision: "reject", suggestedOptionId: "real" },
          { userId: "b", decision: "reject", suggestedOptionId: "real" },
          { userId: "c", decision: "approve" },
        ],
        votingClosed: true,
      }),
    ).toEqual({ state: "resolved", winnerOptionIds: ["real"] });
  });

  it("trata el empate de sugerencias como co-ganadoras", () => {
    expect(
      decideWinners({
        participantIds: ["a", "b", "c", "d"],
        proposerId: "admin",
        proposedOptionId: "propuesta",
        votes: [
          { userId: "a", decision: "reject", suggestedOptionId: "x" },
          { userId: "b", decision: "reject", suggestedOptionId: "x" },
          { userId: "c", decision: "reject", suggestedOptionId: "y" },
          { userId: "d", decision: "reject", suggestedOptionId: "y" },
        ],
        votingClosed: true,
      }),
    ).toEqual({ state: "resolved", winnerOptionIds: ["x", "y"] });
  });

  it("conserva la propuesta si la mayoría rechaza sin sugerir", () => {
    expect(
      decideWinners({
        participantIds: ["a", "b"],
        proposerId: "admin",
        proposedOptionId: "propuesta",
        votes: [
          { userId: "a", decision: "reject" },
          { userId: "b", decision: "reject" },
        ],
        votingClosed: true,
      }),
    ).toEqual({ state: "resolved", winnerOptionIds: ["propuesta"] });
  });

  it("resuelve en cuanto están todos los votos exigidos", () => {
    expect(
      decideWinners({
        participantIds: ["admin"],
        proposerId: "admin",
        proposedOptionId: "propuesta",
        votes: [],
        votingClosed: false,
      }),
    ).toEqual({ state: "resolved", winnerOptionIds: ["propuesta"] });
    expect(
      decideWinners({
        participantIds: ["a", "b"],
        proposerId: "admin",
        proposedOptionId: "propuesta",
        votes: [
          { userId: "a", decision: "approve" },
          { userId: "b", decision: "reject" },
        ],
        votingClosed: false,
      }),
    ).toEqual({ state: "resolved", winnerOptionIds: ["propuesta"] });
  });

  it("espera si falta algún voto y el plazo sigue abierto", () => {
    expect(
      decideWinners({
        participantIds: ["a", "b"],
        proposerId: "admin",
        proposedOptionId: "propuesta",
        votes: [{ userId: "a", decision: "approve" }],
        votingClosed: false,
      }),
    ).toEqual({ state: "pending" });
  });
});
