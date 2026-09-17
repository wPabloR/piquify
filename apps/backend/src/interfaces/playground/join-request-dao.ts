import type {
  AdminJoinRequest,
  JoinRequest,
  JoinRequestStatus,
} from "../../entities/join-request.js";
import type { PlaygroundJoinRequest } from "../../entities/playground.js";

export default interface JoinRequestDao {
  findById(id: string): Promise<JoinRequest | null>;
  findForPlaygroundUser(
    playgroundId: string,
    userId: string,
  ): Promise<JoinRequest | null>;
  listPendingPlaygroundIds(userId: string): Promise<string[]>;
  listPendingForPlayground(
    playgroundId: string,
  ): Promise<PlaygroundJoinRequest[]>;
  listPendingForPlaygrounds(
    playgroundIds: string[],
  ): Promise<AdminJoinRequest[]>;
  create(input: {
    playgroundId: string;
    userId: string;
  }): Promise<JoinRequest>;
  updateStatus(id: string, status: JoinRequestStatus): Promise<void>;
}
