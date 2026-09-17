import express, { type Application } from "express";
import cors from "cors";
import { errorHandler } from "./middleware/error-handler.js";
import routes from "./routes/index.js";

const app: Application = express();
const allowedOrigins = [process.env.WEB_ORIGIN ?? "http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
  }),
);

app.use(express.json());

routes.attach(app);

app.use(errorHandler);

export default app;
