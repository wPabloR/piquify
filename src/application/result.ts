export type AppResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; code: string };

export function ok(): AppResult<void>;
export function ok<T>(value: T): AppResult<T>;
export function ok<T>(value?: T): AppResult<T | void> {
  return { ok: true, value };
}

export function fail(code: string): AppResult<never> {
  return { ok: false, code };
}
