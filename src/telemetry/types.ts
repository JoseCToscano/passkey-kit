export type ExporterType = "otlp" | "console" | "custom"

export interface TelemetryConfig {
  enabled: boolean
  serviceName: string
  samplingRate?: number
  exporter: {
    type: ExporterType
    endpoint?: string
    headers?: Record<string, string>
    exporterInstance?: any
  }
}
