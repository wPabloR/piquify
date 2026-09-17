import HealthController from "../controllers/health/health-controller.js";
import InvitationController from "../controllers/invitation/invitation-controller.js";
import PlaygroundController from "../controllers/playground/playground-controller.js";
import MeController from "../controllers/user/me-controller.js";
import { createAuthClient, createUserClient } from "../infra/supabase/client.js";
import SupabaseAuthTokenVerifier from "../infra/supabase/supabase-auth-token-verifier.js";
import SupabaseInvitationDao from "../infra/supabase/supabase-invitation-dao.js";
import SupabasePlaygroundDao from "../infra/supabase/supabase-playground-dao.js";
import SupabaseProfileDao from "../infra/supabase/supabase-profile-dao.js";
import GetHealthUseCase from "../use-cases/health/get-health.js";
import AuthenticateUserUseCase from "../use-cases/user/authenticate.js";
import GetMeUseCase from "../use-cases/user/get-me.js";

const getHealthUseCase = new GetHealthUseCase();

export const healthController = new HealthController(getHealthUseCase);

const supabaseAuthTokenVerifier = new SupabaseAuthTokenVerifier(
  createAuthClient(),
);

export const authenticateUserUseCase = new AuthenticateUserUseCase(
  supabaseAuthTokenVerifier,
);

export const meController = new MeController((accessToken) => {
  const supabase = createUserClient(accessToken);
  return new GetMeUseCase(new SupabaseProfileDao(supabase));
});

export const playgroundController = new PlaygroundController((accessToken) => {
  return new SupabasePlaygroundDao(createUserClient(accessToken));
});

export const invitationController = new InvitationController((accessToken) => {
  const supabase = createUserClient(accessToken);
  return {
    playgrounds: new SupabasePlaygroundDao(supabase),
    profiles: new SupabaseProfileDao(supabase),
    invitations: new SupabaseInvitationDao(supabase),
  };
});
