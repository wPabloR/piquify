import type GetHealthUseCase from "../../use-cases/health/get-health.js";

export default class HealthController {
  constructor(private readonly getHealthUseCase: GetHealthUseCase) {}

  getHealth() {
    return this.getHealthUseCase.call();
  }
}
