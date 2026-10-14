import { createHash } from "node:crypto";

export function participantKey(ids: readonly string[]): string {
  const joined = [...ids].map((id) => id.toLowerCase()).sort().join(",");
  return createHash("sha256").update(joined).digest("hex");
}
