type LogValue = string | number | boolean | null;

export function logEvent(
  level: "info" | "error",
  event: string,
  fields: Record<string, LogValue> = {},
) {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      ...fields,
    }),
  );
}
