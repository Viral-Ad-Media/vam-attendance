type TelemetryEvent = Record<string, any>;

export function logEvent(name: string, payload: TelemetryEvent = {}) {
  try {
    console.log(`[telemetry] ${name}`, payload);
  } catch {
    // no-op
  }
}

export function logError(context: string, error: unknown, payload: TelemetryEvent = {}) {
  try {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[telemetry] ${context}`, message, payload);
  } catch {
    // no-op
  }
}
