import { settlePayout } from "@piquify/contracts";
import type { BetParticipant, BetPayout } from "../../entities/bet.js";

export function payoutFor(
  status: string,
  stake: number,
  winningOptionId: string | null,
  participants: BetParticipant[],
): BetPayout | null {
  if (status !== "resolved" || !winningOptionId) {
    return null;
  }

  const winnerCount = participants.filter(
    (participant) => participant.optionId === winningOptionId,
  ).length;

  return {
    winnerCount,
    ...settlePayout({
      stake,
      participantCount: participants.length,
      winnerCount,
    }),
  };
}
