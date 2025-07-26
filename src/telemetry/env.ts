import type { TelemetryConfig, ExporterType } from "./types"

export function getTelemetryConfigFromEnv(): TelemetryConfig {
    return {
        enabled: process.env.TELEMETRY_ENABLED === "true",
        serviceName: process.env.TELEMETRY_SERVICE_NAME || "passkey-kit",
        samplingRate: parseFloat(process.env.TELEMETRY_SAMPLING || "1.0"),
        exporter: {
            type: process.env.TELEMETRY_EXPORTER_TYPE as ExporterType || "console",
            endpoint: process.env.TELEMETRY_OTLP_ENDPOINT,
            headers: process.env.TELEMETRY_OTLP_HEADERS
                ? JSON.parse(process.env.TELEMETRY_OTLP_HEADERS)
                : undefined,
        }
    }
}
