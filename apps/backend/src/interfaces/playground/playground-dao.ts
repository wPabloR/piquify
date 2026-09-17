import type {
  Playground,
  PlaygroundMember,
  PlaygroundRole,
  PlaygroundSummary,
} from "../../entities/playground.js";

export default interface PlaygroundDao {
  listForUser(userId: string): Promise<PlaygroundSummary[]>;
  create(input: { name: string; createdBy: string }): Promise<Playground>;
  findById(id: string): Promise<Playground | null>;
  findMembership(
    playgroundId: string,
    userId: string,
  ): Promise<PlaygroundRole | null>;
  listMembers(playgroundId: string): Promise<PlaygroundMember[]>;
}
