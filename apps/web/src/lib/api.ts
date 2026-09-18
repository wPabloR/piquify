export type MeResponse = {
  id: string;
  displayName: string;
  publicCode: number;
  balance: number;
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
  bets: BetSummary[];
};

export type BetStatus =
  | "open"
  | "locked"
  | "pending_result"
  | "resolved"
  | "cancelled";

export type BetOption = {
  id: string;
  label: string;
  position: number;
};

export type BetSummary = {
  id: string;
  playgroundId: string;
  title: string;
  stake: number;
  deadline: string;
  status: BetStatus;
  winningOptionId: string | null;
  voteClosesAt: string | null;
  createdBy: string;
  createdAt: string;
};

export type ResultVoteChoice = "confirm" | "reject";

export type BetDetail = BetSummary & {
  options: BetOption[];
  myOptionId: string | null;
  participantCount: number;
  payout: BetPayout | null;
  myVote: ResultVoteChoice | null;
  confirmedCount: number;
  rejectedCount: number;
  pendingVoteCount: number;
};

export type BetPayout = {
  pot: number;
  winnerCount: number;
  share: number;
  residual: number;
  refund: number;
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

export type ResultDueNotification = {
  betId: string;
  playgroundId: string;
  playgroundName: string;
  title: string;
  deadline: string;
};

export type ResultVoteNotification = {
  betId: string;
  playgroundId: string;
  playgroundName: string;
  title: string;
  voteClosesAt: string;
  proposedOptionLabel: string;
};

export type NotificationInbox = {
  invitations: ReceivedInvitation[];
  joinRequests: AdminJoinRequest[];
  resultDue: ResultDueNotification[];
  resultVotes: ResultVoteNotification[];
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

export function fetchBet(accessToken: string, playgroundId: string, betId: string) {
  return apiRequest<BetDetail>(
    `/playgrounds/${playgroundId}/bets/${betId}`,
    accessToken,
  );
}

export function createBetRequest(
  accessToken: string,
  playgroundId: string,
  input: {
    title: string;
    stake: number;
    deadline: string;
    options: string[];
  },
) {
  return apiRequest<BetDetail>(`/playgrounds/${playgroundId}/bets`, accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function setBetResultRequest(
  accessToken: string,
  playgroundId: string,
  betId: string,
  optionId: string,
) {
  return apiRequest<BetDetail>(
    `/playgrounds/${playgroundId}/bets/${betId}/result`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ optionId }),
    },
  );
}

export function voteBetResultRequest(
  accessToken: string,
  playgroundId: string,
  betId: string,
  choice: ResultVoteChoice,
  suggestedOptionId?: string,
) {
  return apiRequest<BetDetail>(
    `/playgrounds/${playgroundId}/bets/${betId}/vote`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ choice, suggestedOptionId }),
    },
  );
}

export function joinBetRequest(
  accessToken: string,
  playgroundId: string,
  betId: string,
  optionId: string,
) {
  return apiRequest<BetDetail>(
    `/playgrounds/${playgroundId}/bets/${betId}/join`,
    accessToken,
    {
      method: "POST",
      body: JSON.stringify({ optionId }),
    },
  );
}

export function leaveBetRequest(
  accessToken: string,
  playgroundId: string,
  betId: string,
) {
  return apiRequest<BetDetail>(
    `/playgrounds/${playgroundId}/bets/${betId}/leave`,
    accessToken,
    { method: "POST" },
  );
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
