import express, { type Router } from "express";
import {
  invitationController,
  playgroundController,
} from "../../../../config/services.js";
import { ValidationError } from "../../../../errors/http-error.js";
import { authenticateRequest } from "../middleware/authenticate-request.js";

const router: Router = express.Router();

router.get("/", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    response.json(await playgroundController.listPlaygrounds(userId, token));
  } catch (error) {
    next(error);
  }
});

router.post("/", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const name = typeof request.body?.name === "string" ? request.body.name : "";
    if (!name.trim()) {
      throw new ValidationError("El nombre es obligatorio");
    }
    response
      .status(201)
      .json(await playgroundController.createPlayground(userId, token, name));
  } catch (error) {
    next(error);
  }
});

router.get("/search", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const query = typeof request.query.q === "string" ? request.query.q : "";
    response.json(
      await playgroundController.searchPlaygrounds(userId, token, query),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const playgroundId = request.params.id;
    if (!playgroundId) {
      throw new ValidationError("Falta el playground");
    }
    response.json(
      await playgroundController.getPlayground(userId, token, playgroundId),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/:id/invitations", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const playgroundId = request.params.id;
    const invitedUserId =
      typeof request.body?.userId === "string" ? request.body.userId : "";
    if (!playgroundId || !invitedUserId) {
      throw new ValidationError("Falta el usuario a invitar");
    }
    await invitationController.invite(userId, token, playgroundId, invitedUserId);
    response.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.get("/:id/people", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const playgroundId = request.params.id;
    const query = typeof request.query.q === "string" ? request.query.q : "";
    if (!playgroundId) {
      throw new ValidationError("Falta el playground");
    }
    response.json(
      await invitationController.searchProfiles(userId, token, playgroundId, query),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/:id/join-requests", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const playgroundId = request.params.id;
    if (!playgroundId) {
      throw new ValidationError("Falta el playground");
    }
    await playgroundController.requestAccess(userId, token, playgroundId);
    response.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

router.post("/:id/join-requests/:requestId/accept", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const requestId = request.params.requestId;
    if (!requestId) {
      throw new ValidationError("Falta la solicitud");
    }
    await playgroundController.acceptJoinRequest(userId, token, requestId);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

router.post("/:id/join-requests/:requestId/decline", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const requestId = request.params.requestId;
    if (!requestId) {
      throw new ValidationError("Falta la solicitud");
    }
    await playgroundController.declineJoinRequest(userId, token, requestId);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
