import express, { type Router } from "express";
import { invitationController } from "../../../../config/services.js";
import { ValidationError } from "../../../../errors/http-error.js";
import { authenticateRequest } from "../middleware/authenticate-request.js";

const router: Router = express.Router();

router.get("/", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    response.json(await invitationController.listMine(userId, token));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/accept", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const invitationId = request.params.id;
    if (!invitationId) {
      throw new ValidationError("Falta la invitación");
    }
    response.json(
      await invitationController.accept(userId, token, invitationId),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/:id/decline", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const invitationId = request.params.id;
    if (!invitationId) {
      throw new ValidationError("Falta la invitación");
    }
    await invitationController.decline(userId, token, invitationId);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
