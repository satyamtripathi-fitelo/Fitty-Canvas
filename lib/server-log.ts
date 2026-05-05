type LogFields = Record<string, unknown>;

function scrub(fields: LogFields) {
  return Object.fromEntries(
    Object.entries(fields).map(([key, value]) => {
      if (/key|secret|token|authorization/i.test(key)) return [key, "[redacted]"];
      return [key, value];
    })
  );
}

export function createRequestLogger(scope: string) {
  const requestId = crypto.randomUUID().slice(0, 8);

  return {
    id: requestId,
    info(message: string, fields: LogFields = {}) {
      console.info(`[${scope}:${requestId}] ${message}`, scrub(fields));
    },
    error(message: string, error: unknown, fields: LogFields = {}) {
      const err =
        error instanceof Error
          ? { name: error.name, message: error.message, stack: error.stack }
          : { message: String(error) };
      console.error(`[${scope}:${requestId}] ${message}`, scrub({ ...fields, error: err }));
    }
  };
}
