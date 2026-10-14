export function combinePot(
  stake: number,
  participantCount: number,
  residualAmount: number,
): number {
  assertInteger(stake, "INVALID_STAKE");
  assertInteger(participantCount, "INVALID_PARTICIPANTS");
  assertInteger(residualAmount, "INVALID_RESIDUAL");
  if (stake < 0 || participantCount < 0 || residualAmount < 0) {
    throw new Error("INVALID_POT");
  }
  return stake * participantCount + residualAmount;
}

export function splitIntegerPot(
  pot: number,
  winnerCount: number,
): { share: number; residual: number } {
  assertInteger(pot, "INVALID_POT");
  assertInteger(winnerCount, "INVALID_WINNERS");
  if (pot < 0 || winnerCount < 1) throw new Error("INVALID_POT");
  const share = Math.floor(pot / winnerCount);
  return { share, residual: pot - share * winnerCount };
}

export function sameParticipants(
  left: readonly string[],
  right: readonly string[],
): boolean {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

export function applicableResidual(
  residuals: readonly { amount: number; participantIds: readonly string[] }[],
  participantIds: readonly string[],
): number {
  return residuals.reduce((total, residual) => {
    if (!sameParticipants(residual.participantIds, participantIds)) return total;
    assertInteger(residual.amount, "INVALID_RESIDUAL");
    return total + residual.amount;
  }, 0);
}

function assertInteger(value: number, code: string) {
  if (!Number.isInteger(value)) throw new Error(code);
}
