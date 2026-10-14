import { describe, expect, it } from "vitest";
import { settlePique } from "@/application/settle-pique";
import type { PiqueRecord, UnitOfWork, VoteRecord } from "@/application/ports";

function settleMemory(input: {
  pique: PiqueRecord;
  proposal: { optionId: string; proposedBy: string; votingEndsAt: Date };
  participants: { userId: string; optionId: string }[];
  votes: VoteRecord[];
}) {
  let status = input.pique.status;
  const winners: string[] = [];
  const payouts: { userId: string; amount: number }[] = [];
  const uow = {
    async lockPique() {
      return { ...input.pique, status };
    },
    async getProposal() {
      return { piqueId: input.pique.id, ...input.proposal };
    },
    async listParticipations() {
      return input.participants;
    },
    async listVotes() {
      return input.votes;
    },
    async lockResiduals() {},
    async openResiduals() {
      return [];
    },
    async consumeResiduals() {},
    async insertResidual() {},
    async insertWinners(_id: string, optionIds: string[]) {
      winners.push(...optionIds);
    },
    async insertLedger(entry: { userId: string; amount: number }) {
      payouts.push({ userId: entry.userId, amount: entry.amount });
    },
    async insertEvent() {},
    async notifyMembers() {},
    async updatePiqueStatus(_id: string, next: typeof status) {
      status = next;
    },
    async touchPlayground() {},
  };
  return { uow: uow as unknown as UnitOfWork, winners, payouts, status: () => status };
}

describe("settlePique", () => {
  it("reparte en enteros cuando la votación está cerrada", async () => {
    const optionA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const optionB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const admin = "11111111-1111-4111-8111-111111111111";
    const guest = "22222222-2222-4222-8222-222222222222";
    const ctx = settleMemory({
      pique: {
        id: "33333333-3333-4333-8333-333333333333",
        playgroundId: "44444444-4444-4444-8444-444444444444",
        question: "¿Quién gana?",
        detail: null,
        kind: "options",
        status: "pending_result",
        stake: 80,
        closesAt: new Date("2020-01-01T00:00:00Z"),
        createdBy: admin,
      },
      proposal: {
        optionId: optionA,
        proposedBy: admin,
        votingEndsAt: new Date("2020-01-02T00:00:00Z"),
      },
      participants: [
        { userId: admin, optionId: optionA },
        { userId: guest, optionId: optionB },
      ],
      votes: [],
    });
    const result = await settlePique(ctx.uow, { piqueId: "33333333-3333-4333-8333-333333333333", now: new Date("2020-01-03T00:00:00Z") });
    expect(result.ok).toBe(true);
    expect(ctx.winners).toEqual([optionA]);
    expect(ctx.payouts).toEqual([{ userId: admin, amount: 160 }]);
    expect(ctx.status()).toBe("resolved");
  });
});
