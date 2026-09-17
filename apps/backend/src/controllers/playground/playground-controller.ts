import type {
  PlaygroundDetail,
  PlaygroundSearchHit,
  PlaygroundSummary,
} from "../../entities/playground.js";
import AcceptJoinRequestUseCase from "../../use-cases/playground/accept-join-request.js";
import CreatePlaygroundUseCase from "../../use-cases/playground/create-playground.js";
import DeclineJoinRequestUseCase from "../../use-cases/playground/decline-join-request.js";
import GetPlaygroundInviteUseCase from "../../use-cases/playground/get-playground-invite.js";
import GetPlaygroundUseCase from "../../use-cases/playground/get-playground.js";
import JoinPlaygroundUseCase from "../../use-cases/playground/join-playground.js";
import ListPlaygroundsUseCase from "../../use-cases/playground/list-playgrounds.js";
import RequestAccessUseCase from "../../use-cases/playground/request-access.js";
import SearchPlaygroundsUseCase from "../../use-cases/playground/search-playgrounds.js";
import type JoinRequestDao from "../../interfaces/playground/join-request-dao.js";
import type PlaygroundDao from "../../interfaces/playground/playground-dao.js";

type Daos = {
  playgrounds: PlaygroundDao;
  joinRequests: JoinRequestDao;
};

function serializePlayground(playground: {
  id: string;
  name: string;
  publicCode: number;
  createdBy: string;
  createdAt: Date;
}) {
  return {
    id: playground.id,
    name: playground.name,
    publicCode: playground.publicCode,
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

function serializeSearchHit(hit: PlaygroundSearchHit) {
  return {
    id: hit.id,
    name: hit.name,
    publicCode: hit.publicCode,
    alreadyMember: hit.alreadyMember,
    requestPending: hit.requestPending,
  };
}

function serializeDetail(playground: PlaygroundDetail) {
  return {
    ...serializePlayground(playground),
    role: playground.role,
    inviteToken:
      playground.role === "admin" ? playground.inviteToken : undefined,
    members: playground.members.map((member) => ({
      userId: member.userId,
      displayName: member.displayName,
      role: member.role,
      joinedAt: member.joinedAt.toISOString(),
    })),
    joinRequests:
      playground.role === "admin"
        ? playground.joinRequests.map((request) => ({
            id: request.id,
            userId: request.userId,
            displayName: request.displayName,
            publicCode: request.publicCode,
            createdAt: request.createdAt.toISOString(),
          }))
        : [],
  };
}

export default class PlaygroundController {
  constructor(private readonly createDaos: (accessToken: string) => Daos) {}

  async listPlaygrounds(userId: string, accessToken: string) {
    const daos = this.createDaos(accessToken);
    const playgrounds = await new ListPlaygroundsUseCase(daos.playgrounds).call(
      userId,
    );
    return playgrounds.map(serializeSummary);
  }

  async createPlayground(userId: string, accessToken: string, name: string) {
    const daos = this.createDaos(accessToken);
    const playground = await new CreatePlaygroundUseCase(daos.playgrounds).call(
      userId,
      name,
    );
    return serializePlayground(playground);
  }

  async getPlayground(userId: string, accessToken: string, playgroundId: string) {
    const daos = this.createDaos(accessToken);
    const playground = await new GetPlaygroundUseCase(
      daos.playgrounds,
      daos.joinRequests,
    ).call(userId, playgroundId);
    return serializeDetail(playground);
  }

  async searchPlaygrounds(userId: string, accessToken: string, query: string) {
    const daos = this.createDaos(accessToken);
    const hits = await new SearchPlaygroundsUseCase(
      daos.playgrounds,
      daos.joinRequests,
    ).call({ actorId: userId, query });
    return hits.map(serializeSearchHit);
  }

  async requestAccess(userId: string, accessToken: string, playgroundId: string) {
    const daos = this.createDaos(accessToken);
    await new RequestAccessUseCase(daos.playgrounds, daos.joinRequests).call(
      userId,
      playgroundId,
    );
  }

  async acceptJoinRequest(
    userId: string,
    accessToken: string,
    requestId: string,
  ) {
    const daos = this.createDaos(accessToken);
    await new AcceptJoinRequestUseCase(daos.playgrounds, daos.joinRequests).call(
      userId,
      requestId,
    );
  }

  async declineJoinRequest(
    userId: string,
    accessToken: string,
    requestId: string,
  ) {
    const daos = this.createDaos(accessToken);
    await new DeclineJoinRequestUseCase(daos.playgrounds, daos.joinRequests).call(
      userId,
      requestId,
    );
  }

  async getInvite(userId: string, accessToken: string, token: string) {
    const daos = this.createDaos(accessToken);
    return new GetPlaygroundInviteUseCase(daos.playgrounds).call(userId, token);
  }

  async joinPlayground(userId: string, accessToken: string, token: string) {
    const daos = this.createDaos(accessToken);
    return new JoinPlaygroundUseCase(daos.playgrounds).call(userId, token);
  }
}
