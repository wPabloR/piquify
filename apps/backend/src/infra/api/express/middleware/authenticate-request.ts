import type { Request } from "express";
import { authenticateUserUseCase } from "../../../../config/services.js";
import { UnauthorizedError } from "../../../../errors/http-error.js";

export async function authenticateRequest(request: Request): Promise<{
  userId: string;
  token: string;
}> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) {
    throw new UnauthorizedError();
  }

  const token = authorization.slice("Bearer ".length).trim();
  if (!token) {
    throw new UnauthorizedError();
  }

  const { userId } = await authenticateUserUseCase.call(token);
  return { userId, token };
}
