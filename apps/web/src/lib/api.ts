export type MeResponse = {
  id: string;
  displayName: string;
  createdAt: string;
};

export async function fetchMe(
  accessToken: string,
): Promise<MeResponse | { error: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return { error: "Falta NEXT_PUBLIC_API_URL" };
  }

  const response = await fetch(`${apiUrl}/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) {
    return { error: `La API respondió ${response.status}` };
  }

  return (await response.json()) as MeResponse;
}
