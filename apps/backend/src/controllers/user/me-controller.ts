import type GetMeUseCase from "../../use-cases/user/get-me.js";

export default class MeController {
  constructor(
    private readonly createGetMeUseCase: (accessToken: string) => GetMeUseCase,
  ) {}

  async getMe(userId: string, accessToken: string) {
    const profile = await this.createGetMeUseCase(accessToken).call(userId);
    return {
      id: profile.id,
      displayName: profile.displayName,
      createdAt: profile.createdAt.toISOString(),
    };
  }
}
