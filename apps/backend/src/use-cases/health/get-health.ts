import type { HealthStatus } from "../../entities/health-status.js";

export default class GetHealthUseCase {
  call(): HealthStatus {
    return {
      ok: true,
      service: "piquify-backend",
    };
  }
}
