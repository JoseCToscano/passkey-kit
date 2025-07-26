import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import { trace } from "@opentelemetry/api"
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import type { TelemetryConfig } from "./types"

let isInitialized = false

export class TelemetryService {
    static init(config: TelemetryConfig) {
        if (!config.enabled || isInitialized)
            return

        const provider = new NodeTracerProvider()
        const { type, endpoint, headers, exporterInstance } = config.exporter

        let exporter: any

        if (type === "otlp") {
            exporter = new OTLPTraceExporter({ url: endpoint, headers })
        } else if (type === "console") {
            const { ConsoleSpanExporter } = require("@opentelemetry/exporter-trace-console")
            exporter = new ConsoleSpanExporter()
        } else if (type === "custom" && exporterInstance) {
            exporter = exporterInstance
        } else {
            console.warn("Telemetry exporter misconfigured")
            return
        }

        provider.addSpanProcessor(new BatchSpanProcessor(exporter))
        provider.register()

        isInitialized = true
    }

    static getTracer(serviceName: string) {
        return trace.getTracer(serviceName)
    }
}
