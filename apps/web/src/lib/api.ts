export type MeResponse = {
  id: string;
  displayName: string;
  publicCode: number;
  createdAt: string;
};

export type PlaygroundRole = "admin" | "member";

export type Playground = {
  id: string;
  name: string;
  publicCode: number;
  createdBy: string;
  createdAt: string;
};

export type PlaygroundSummary = Playground & {
  role: PlaygroundRole;
};

export type PlaygroundMember = {
  userId: string;
  displayName: string;
  role: PlaygroundRole;
  joinedAt: string;
};

export type PlaygroundDetail = PlaygroundSummary & {
  inviteToken?: string;
  members: PlaygroundMember[];
  joinRequests: PlaygroundJoinRequest[];
};

export type PlaygroundJoinRequest = {
  id: string;
  userId: string;
  displayName: string;
  publicCode: number;
  createdAt: string;
};

export type PlaygroundSearchHit = {
  id: string;
  name: string;
  publicCode: number;
  alreadyMember: boolean;
  requestPending: boolean;
};

export type PlaygroundInvite = {
  playgroundId: string;
  name: string;
  alreadyMember: boolean;
};

export type ProfileSearchHit = {
  id: string;
  displayName: string;
  publicCode: number;
  alreadyMember: boolean;
  invitePending: boolean;
};

export type ReceivedInvitation = {
  id: string;
  playgroundId: string;
  playgroundName: string;
  invitedByName: string;
  invitedByPublicCode: number;
  createdAt: string;
};

export type NotificationInbox = {
  invitations: ReceivedInvitation[];
  joinRequests: AdminJoinRequest[];
};

export type AdminJoinRequest = {
  id: string;
  playgroundId: string;
  playgroundName: string;
  userId: string;
  displayName: string;
  publicCode: number;
  createdAt: string;
};

type ApiError = { error: string };

function apiBaseUrl(): string | { error: string } {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) {
    return { error: "Falta NEXT_PUBLIC_API_URL" };
  }
  return apiUrl;
}

async function apiRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T | ApiError> {
  const apiUrl = apiBaseUrl();
  if (typeof apiUrl !== "string") {
    return apiUrl;
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    return { error: body?.error ?? `La API respondió ${response.status}` };
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function fetchMe(accessToken: string) {
  return apiRequest<MeResponse>("/me", accessToken);
}

export function fetchPlaygrounds(accessToken: string) {
  return apiRequest<PlaygroundSummary[]>("/playgrounds", accessToken);
}

export function fetchPlayground(accessToken: string, id: string) {
  return apiRequest<PlaygroundDetail>(`/playgrounds/${id}`, accessToken);
}

export function fetchInvite(accessToken: string, token: string) {
  return apiRequest<PlaygroundInvite>(`/invites/${token}`, accessToken);
}

export function acceptInviteRequest(accessToken: string, token: string) {
  return apiRequest<{ playgroundId: string }>(`/invites/${token}/accept`, accessToken, {
    method: "POST",
  });
}

export function createPlaygroundRequest(accessToken: string, name: string) {
  return apiRequest<Playground>("/playgrounds", accessToken, {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function searchPeople(
  accessToken: string,
  playgroundId: string,
  query: string,
) {
  return apiRequest<ProfileSearchHit[]>(
    `/playgrounds/${playgroundId}/people?q=${encodeURIComponent(query)}`,
    accessToken,
  );
}

export function searchPlaygrounds(accessToken: string, query: string) {
  return apiRequest<PlaygroundSearchHit[]>(
    `/playgrounds/search?q=${encodeURIComponent(query)}`,
    accessToken,
  );
}

export function requestAccessRequest(accessToken: string, playgroundId: string) {
  return apiRequest<{ ok: true }>(
    `/playgrounds/${playgroundId}/join-requests`,
    accessToken,
    { method: "POST" },
  );
}

export function acceptJoinRequest(
  accessToken: string,
  playgroundId: string,
  requestId: string,
) {
  return apiRequest<void>(
    `/playgrounds/${playgroundId}/join-requests/${requestId}/accept`,
    accessToken,
    { method: "POST" },
  );
}

export function declineJoinRequest(
  accessToken: string,
  playgroundId: string,
  requestId: string,
) {
  return apiRequest<void>(
    `/playgrounds/${playgroundId}/join-requests/${requestId}/decline`,
    accessToken,
    { method: "POST" },
  );
}

export function inviteUserRequest(
  accessToken: string,
  playgroundId: string,
  userId: string,
) {
  return apiRequest<{ ok: true }>(
    `/playgrounds/${playgroundId}/invitations`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ userId }),
    },
  );
}

export function fetchNotifications(accessToken: string) {
  return apiRequest<NotificationInbox>("/invitations", accessToken);
}

export function acceptInvitationRequest(accessToken: string, id: string) {
  return apiRequest<{ playgroundId: string }>(
    `/invitations/${id}/accept`,
    accessToken,
    { method: "POST" },
  );
}

export function declineInvitationRequest(accessToken: string, id: string) {
  return apiRequest<void>(`/invitations/${id}/decline`, accessToken, {
    method: "POST",
  });
}
