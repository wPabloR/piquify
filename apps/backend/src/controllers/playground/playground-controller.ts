import type {
  Playground,
  PlaygroundDetail,
  PlaygroundSummary,
} from "../../entities/playground.js";
import CreatePlaygroundUseCase from "../../use-cases/playground/create-playground.js";
import GetPlaygroundUseCase from "../../use-cases/playground/get-playground.js";
import ListPlaygroundsUseCase from "../../use-cases/playground/list-playgrounds.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

function serializePlayground(playground: Playground) {
  return {
    id: playground.id,
    name: playground.name,
    createdBy: playground.createdBy,
    createdAt: playground.createdAt.toISOString(),
  };
}

function serializeSummary(playground: PlaygroundSummary) {
  return {
    ...serializePlayground(playground),
    role: playground.role,
  };
}

function serializeDetail(playground: PlaygroundDetail) {
  return {
    ...serializePlayground(playground),
    role: playground.role,
    members: playground.members.map((member) => ({
      userId: member.userId,
      displayName: member.displayName,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    })),
  };
}

export default class PlaygroundController {
  constructor(private readonly createDao: (accessToken: string) => PlaygroundDao) {}

  async listPlaygrounds(userId: string, accessToken: string) {
    const playgrounds = await new ListPlaygroundsUseCase(
      this.createDao(accessToken),
    ).call(userId);
    return playgrounds.map(serializeSummary);
  }

  async createPlayground(userId: string, accessToken: string, name: string) {
    const playground = await new CreatePlaygroundUseCase(
      this.createDao(accessToken),
    ).call(userId, name);
    return serializePlayground(playground);
  }

  async getPlayground(userId: string, accessToken: string, playgroundId: string) {
    const playground = await new GetPlaygroundUseCase(
      this.createDao(accessToken),
    ).call(userId, playgroundId);
    return serializeDetail(playground);
  }
}
