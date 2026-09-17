import express, { type Router } from "express";
import { playgroundController } from "../../../../config/services.js";
import { ValidationError } from "../../../../errors/http-error.js";
import { authenticateRequest } from "../middleware/authenticate-request.js";

const router: Router = express.Router();

router.get("/:token", async (request, response, next) => {
  try {
    const { userId, token: accessToken } = await authenticateRequest(request);
    const token = request.params.token;
    if (!token) {
      throw new ValidationError("Falta la invitación");
    }
    response.json(await playgroundController.getInvite(userId, accessToken, token));
  } catch (error) {
    next(error);
  }
});

router.post("/:token/accept", async (request, response, next) => {
  try {
    const { userId, token: accessToken } = await authenticateRequest(request);
    const token = request.params.token;
    if (!token) {
      throw new ValidationError("Falta la invitación");
    }
    response.json(
      await playgroundController.joinPlayground(userId, accessToken, token),
    );
  } catch (error) {
    next(error);
  }
});

export default router;
