import { describe, expect, it } from "vitest";
import { joinPique } from "@/application/join-pique";
import { leavePique } from "@/application/leave-pique";
import type { UnitOfWork } from "@/application/ports";
import type { PiqueRecord } from "@/application/ports";

function memory(pique: PiqueRecord, extras?: { member?: boolean; balance?: number }): UnitOfWork {
  const participations = new Map<string, string>();
  const ledger: { userId: string; amount: number }[] = [];
  const events: string[] = [];
  let status = pique.status;
  const uow = {
    async lockUser() {},
    async lockPique() {
      return { ...pique, status };
    },
    async isMember() {
      return extras?.member ?? true;
    },
    async optionExists() {
      return true;
    },
    async getParticipation(_piqueId: string, userId: string) {
      const optionId = participations.get(userId);
      return optionId ? { optionId } : null;
    },
    async lockLedger() {},
    async balance() {
      const spent = ledger.filter((item) => item.userId === pique.createdBy);
      return (extras?.balance ?? 200) + spent.reduce((total, item) => total + item.amount, 0);
    },
    async setParticipation(_piqueId: string, userId: string, optionId: string) {
      participations.set(userId, optionId);
    },
    async insertParticipation(_piqueId: string, userId: string, optionId: string) {
      participations.set(userId, optionId);
    },
    async deleteParticipation(_piqueId: string, userId: string) {
      participations.delete(userId);
    },
    async insertLedger(input: { userId: string; amount: number }) {
      ledger.push({ userId: input.userId, amount: input.amount });
    },
    async insertEvent(input: { kind: string }) {
      events.push(input.kind);
    },
    async notifyMembers() {},
    async touchPlayground() {},
    async countParticipations() {
      return participations.size;
    },
    async updatePiqueStatus(_id: string, next: typeof status) {
      status = next;
    },
  };
  return uow as unknown as UnitOfWork;
}

const openPique: PiqueRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  playgroundId: "22222222-2222-4222-8222-222222222222",
  question: "¿Quién llega?",
  detail: null,
  kind: "options",
  status: "open",
  stake: 80,
  closesAt: new Date("2099-01-01T00:00:00Z"),
  createdBy: "33333333-3333-4333-8333-333333333333",
};

describe("joinPique", () => {
  it("cobra el stake al entrar", async () => {
    const uow = memory(openPique);
    const result = await joinPique(uow, {
      actorId: openPique.createdBy,
      piqueId: openPique.id,
      optionId: "44444444-4444-4444-8444-444444444444",
    });
    expect(result).toEqual({ ok: true, value: undefined });
  });

  it("rechaza sin saldo", async () => {
    const uow = memory(openPique, { balance: 10 });
    const result = await joinPique(uow, {
      actorId: openPique.createdBy,
      piqueId: openPique.id,
      optionId: "44444444-4444-4444-8444-444444444444",
    });
    expect(result).toEqual({ ok: false, code: "INSUFFICIENT_BALANCE" });
  });
});

describe("leavePique", () => {
  it("cancela si no queda nadie", async () => {
    const uow = memory(openPique);
    await joinPique(uow, {
      actorId: openPique.createdBy,
      piqueId: openPique.id,
      optionId: "44444444-4444-4444-8444-444444444444",
    });
    const result = await leavePique(uow, {
      actorId: openPique.createdBy,
      piqueId: openPique.id,
    });
    expect(result.ok).toBe(true);
  });
});
