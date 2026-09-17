import express, { type Router } from "express";
import {
  authenticateUserUseCase,
  meController,
} from "../../../../config/services.js";
import { UnauthorizedError } from "../../../../errors/http-error.js";

const router: Router = express.Router();

router.get("/", async (request, response, next) => {
  try {
    const authorization = request.headers.authorization;
    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedError();
    }

    const token = authorization.slice("Bearer ".length).trim();
    if (!token) {
      throw new UnauthorizedError();
    }

    const { userId } = await authenticateUserUseCase.call(token);
    response.json(await meController.getMe(userId, token));
  } catch (error) {
    next(error);
  }
});

export default router;
