import express, { type Router } from "express";
import { healthController } from "../../../../config/services.js";

const router: Router = express.Router();

router.get("/", (_request, response) => {
  response.json(healthController.getHealth());
});

export default router;
