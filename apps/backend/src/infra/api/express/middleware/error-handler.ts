import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../../../../errors/http-error.js";

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      error: error.message,
      details: error.details,
    });
    return;
  }

  console.error(error);
  response.status(500).json({ error: "Internal server error" });
}
