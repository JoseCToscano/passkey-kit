import { NodeTracerProvider, BatchSpanProcessor, ConsoleSpanExporter, TraceIdRatioBasedSampler } from "@opentelemetry/sdk-trace-node"
import { trace } from "@opentelemetry/api"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import type { TelemetryConfig } from "./types"

let isInitialized = false

export class TelemetryService {
    static init(config: TelemetryConfig) {
        if (!config.enabled || isInitialized)
            return

        const { type, endpoint, headers, exporterInstance } = config.exporter

        let exporter: any

        if (type === "otlp") {
            exporter = new OTLPTraceExporter({ url: endpoint, headers })
        } else if (type === "console") {
            exporter = new ConsoleSpanExporter()
        } else if (type === "custom" && exporterInstance) {
            exporter = exporterInstance
        } else {
            console.warn("Telemetry exporter misconfigured")
            return
        }

        const provider = new NodeTracerProvider({
            sampler: new TraceIdRatioBasedSampler(config.samplingRate ?? 1.0),
            spanProcessors: [new BatchSpanProcessor(exporter)]
        })
        
        provider.register()

        isInitialized = true
    }

    static getTracer(serviceName: string) {
        return trace.getTracer(serviceName)
    }
}
