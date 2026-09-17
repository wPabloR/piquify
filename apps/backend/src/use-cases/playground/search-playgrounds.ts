import type { PlaygroundSearchHit } from "../../entities/playground.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

export default class SearchPlaygroundsUseCase {
  constructor(
    private readonly playgroundDao: PlaygroundDao,
    private readonly joinRequestDao: JoinRequestDao,
  ) {}

  async call(input: {
    actorId: string;
    query: string;
  }): Promise<PlaygroundSearchHit[]> {
    const query = input.query.trim();
    if (query.replace(/^#/, "").length < 3) {
      return [];
    }

    const [playgrounds, mine, pendingIds] = await Promise.all([
      this.playgroundDao.search(query),
      this.playgroundDao.listForUser(input.actorId),
      this.joinRequestDao.listPendingPlaygroundIds(input.actorId),
    ]);

    const memberIds = new Set(mine.map((playground) => playground.id));
    const pending = new Set(pendingIds);

    return playgrounds.map((playground) => ({
      id: playground.id,
      name: playground.name,
      publicCode: playground.publicCode,
      alreadyMember: memberIds.has(playground.id),
      requestPending: pending.has(playground.id),
    }));
  }
}
