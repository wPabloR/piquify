import type { AccountMovementKind, Profile } from "../../entities/profile.js";

export default interface ProfileDao {
  findById(id: string): Promise<Profile | null>;
  search(input: { query: string; excludeUserId: string }): Promise<Profile[]>;
  tryDebit(userId: string, amount: number): Promise<boolean>;
  credit(userId: string, amount: number): Promise<void>;
  hasMovement(input: {
    userId: string;
    betId: string;
    kind: AccountMovementKind;
  }): Promise<boolean>;
  appendMovement(input: {
    userId: string;
    amount: number;
    kind: AccountMovementKind;
    betId?: string;
  }): Promise<void>;
}
