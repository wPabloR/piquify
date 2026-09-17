import type { Application } from "express";
import health from "./health.js";
import invitations from "./invitations.js";
import invites from "./invites.js";
import me from "./me.js";
import playgrounds from "./playgrounds.js";

export default {
  attach(app: Application): void {
    app.use("/health", health);
    app.use("/me", me);
    app.use("/invitations", invitations);
    app.use("/invites", invites);
    app.use("/playgrounds", playgrounds);
  },
};
