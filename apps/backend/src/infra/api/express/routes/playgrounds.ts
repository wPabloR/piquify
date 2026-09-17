import express, { type Router } from "express";
import { playgroundController } from "../../../../config/services.js";
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

export default router;
