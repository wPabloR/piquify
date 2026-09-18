import express, { type Router } from "express";
import {
  betController,
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

router.post("/:id/bets", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const playgroundId = request.params.id;
    if (!playgroundId) {
      throw new ValidationError("Falta el playground");
    }
    const title = typeof request.body?.title === "string" ? request.body.title : "";
    const stake = request.body?.stake;
    const deadline =
      typeof request.body?.deadline === "string" ? request.body.deadline : "";
    const options = Array.isArray(request.body?.options)
      ? request.body.options.filter((option: unknown) => typeof option === "string")
      : [];
    if (typeof stake !== "number") {
      throw new ValidationError("La apuesta debe ser un número");
    }
    if (!deadline) {
      throw new ValidationError("La fecha límite es obligatoria");
    }
    response.status(201).json(
      await betController.createBet(userId, token, playgroundId, {
        title,
        stake,
        deadline,
        options,
      }),
    );
  } catch (error) {
    next(error);
  }
});

router.get("/:id/bets/:betId", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const playgroundId = request.params.id;
    const betId = request.params.betId;
    if (!playgroundId || !betId) {
      throw new ValidationError("Falta el pique");
    }
    response.json(await betController.getBet(userId, token, playgroundId, betId));
  } catch (error) {
    next(error);
  }
});

router.post("/:id/bets/:betId/result", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const playgroundId = request.params.id;
    const betId = request.params.betId;
    const optionId =
      typeof request.body?.optionId === "string" ? request.body.optionId : "";
    if (!playgroundId || !betId) {
      throw new ValidationError("Falta el pique");
    }
    if (!optionId) {
      throw new ValidationError("Falta la opción ganadora");
    }
    response.json(
      await betController.setResult(userId, token, playgroundId, betId, optionId),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/:id/bets/:betId/vote", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const playgroundId = request.params.id;
    const betId = request.params.betId;
    const choice =
      request.body?.choice === "confirm" || request.body?.choice === "reject"
        ? request.body.choice
        : "";
    const suggestedOptionId =
      typeof request.body?.suggestedOptionId === "string"
        ? request.body.suggestedOptionId
        : null;
    if (!playgroundId || !betId) {
      throw new ValidationError("Falta el pique");
    }
    if (!choice) {
      throw new ValidationError("Falta el voto");
    }
    response.json(
      await betController.voteResult(
        userId,
        token,
        playgroundId,
        betId,
        choice,
        suggestedOptionId,
      ),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/:id/bets/:betId/join", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const playgroundId = request.params.id;
    const betId = request.params.betId;
    const optionId =
      typeof request.body?.optionId === "string" ? request.body.optionId : "";
    if (!playgroundId || !betId) {
      throw new ValidationError("Falta el pique");
    }
    if (!optionId) {
      throw new ValidationError("Falta la opción");
    }
    response.json(
      await betController.joinBet(userId, token, playgroundId, betId, optionId),
    );
  } catch (error) {
    next(error);
  }
});

router.post("/:id/bets/:betId/leave", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    const playgroundId = request.params.id;
    const betId = request.params.betId;
    if (!playgroundId || !betId) {
      throw new ValidationError("Falta el pique");
    }
    response.json(await betController.leaveBet(userId, token, playgroundId, betId));
  } catch (error) {
    next(error);
  }
});

export default router;
