import { effectiveBetStatus } from "@piquify/contracts";
import type { PlaygroundDetail } from "../../entities/playground.js";
import { NotFoundError } from "../../errors/http-error.js";
import type BetDao from "../../interfaces/bet/bet-dao.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

export default class GetPlaygroundUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly joinRequestDao: JoinRequestDao,
    private readonly betDao: BetDao,
  ) {}

  async call(
    userId: string,
    playgroundId: string,
    now = new Date(),
  ): Promise<PlaygroundDetail> {
    const playground = await this.playgroundDao.findById(playgroundId);
    if (!playground) {
      throw new NotFoundError("Playground not found");
    }

    const role = await this.playgroundDao.findMembership(playgroundId, userId);
    if (!role) {
      throw new NotFoundError("Playground not found");
    }

    const members = await this.playgroundDao.listMembers(playgroundId);
    const joinRequests =
      role === "admin"
        ? await this.joinRequestDao.listPendingForPlayground(playgroundId)
        : [];

    await this.betDao.lockExpired(now, { playgroundId });
    const bets = (await this.betDao.listForPlayground(playgroundId)).map(
      (bet) => ({
        ...bet,
        status: effectiveBetStatus(bet.status, bet.deadline, now),
      }),
    );

    return { ...playground, role, members, joinRequests, bets };
  }
}
