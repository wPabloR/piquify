const likeEscape = "!";

export function likeContains(value: string): string {
  const escaped = value
    .replaceAll(likeEscape, `${likeEscape}${likeEscape}`)
    .replaceAll("%", `${likeEscape}%`)
    .replaceAll("_", `${likeEscape}_`);
  return `%${escaped}%`;
}

export const LIKE_ESCAPE = likeEscape;
