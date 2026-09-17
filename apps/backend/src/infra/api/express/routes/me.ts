import express, { type Router } from "express";
import { meController } from "../../../../config/services.js";
import { authenticateRequest } from "../middleware/authenticate-request.js";

const router: Router = express.Router();

router.get("/", async (request, response, next) => {
  try {
    const { userId, token } = await authenticateRequest(request);
    response.json(await meController.getMe(userId, token));
  } catch (error) {
    next(error);
  }
});

export default router;
