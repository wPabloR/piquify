import type { Application } from "express";
import health from "./health.js";
import me from "./me.js";

export default {
  attach(app: Application): void {
    app.use("/health", health);
    app.use("/me", me);
  },
};
