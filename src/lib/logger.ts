type Level = "info" | "warn" | "error";
type Fields = Record<string, string | number | boolean | null | undefined>;

/**
 * Minimal structured logger. Callers pass only non-sensitive fields — never
 * passwords, tokens, connection strings, names or addresses.
 */
function write(level: Level, event: string, fields: Fields = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

export const logger = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, err?: unknown, fields?: Fields) =>
    write("error", event, {
      ...fields,
      error: err instanceof Error ? `${err.name}: ${err.message.slice(0, 200)}` : undefined,
    }),
};
