Product Requirements Document
Feature: Custom Telemetry Integration (OpenTelemetry-Based)
Repository: passkey-kit
Owner: Jose Toscano
Assignee: AI Coding Agent
Priority: High
Status: Ready for development

🧩 Objective
Introduce a vendor-agnostic telemetry system to the passkey-kit SDK using OpenTelemetry, enabling developers to:

Monitor passkey-kit operations (e.g., wallet creation, transaction signing, key management).

Export traces to standard observability platforms like Datadog, SigNoz, Jaeger, etc.

Plug in custom exporters for non-standard backends like LangWatch, LangSmith, or internal tools.

This feature should be optional, highly configurable, and extensible.

✅ Acceptance Criteria
✅ Developers can enable/disable telemetry through a config object or environment variables.

✅ Telemetry spans are created for core SDK operations (see Trace Targets below).

✅ Telemetry can be exported to:

OpenTelemetry Collector via OTLP

Console (for local dev)

Any custom exporter (implementing the OTEL SpanExporter interface)

✅ Configuration can be provided both programmatically and via .env variables.

✅ The SDK should not fail if telemetry is disabled or misconfigured.

✅ Example usage is added to the README.

🧠 Architecture Overview
txt
Copiar
Editar
                          ┌──────────────────────┐
                          │     passkey-kit      │
                          │     SDK Methods      │
                          └──────────┬───────────┘
                                     │
                      ┌──────────────▼──────────────┐
                      │  TelemetryService (new)     │
                      │  - Initializes Tracer       │
                      │  - Handles Span Exporting   │
                      └──────────────┬──────────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
     ┌────────────▼──────────┐   ┌────▼──────┐   ┌───────▼───────┐
     │  OTLPSpanExporter     │   │ Console   │   │ CustomExporter │
     │ (OTEL SDK)            │   │Exporter   │   │ (User-provided)│
     └───────────────────────┘   └───────────┘   └────────────────┘
🏗️ Tasks for Agent
1. Add Dependency
Install OpenTelemetry core modules:

bash
Copiar
Editar
npm install @opentelemetry/api @opentelemetry/sdk-trace-node @opentelemetry/exporter-trace-otlp-http
Optional (for testing exporters):

bash
Copiar
Editar
npm install @opentelemetry/exporter-trace-console
If Datadog is to be tested directly:

bash
Copiar
Editar
npm install @opentelemetry/exporter-datadog
2. Define Telemetry Configuration Type
ts
Copiar
Editar
// src/telemetry/types.ts

export type ExporterType = "otlp" | "console" | "custom";

export interface TelemetryConfig {
  enabled: boolean;
  serviceName: string;
  samplingRate?: number; // default: 1.0 (always on)
  exporter: {
    type: ExporterType;
    endpoint?: string; // For OTLP
    headers?: Record<string, string>; // For OTLP auth (e.g., Datadog API Key)
    exporterInstance?: any; // For custom
  };
}
3. Create a TelemetryService Utility
ts
Copiar
Editar
// src/telemetry/TelemetryService.ts

import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { trace, context } from "@opentelemetry/api";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { TelemetryConfig } from "./types";

let isInitialized = false;

export class TelemetryService {
  static init(config: TelemetryConfig) {
    if (!config.enabled || isInitialized) return;

    const provider = new NodeTracerProvider();
    const { type, endpoint, headers, exporterInstance } = config.exporter;

    let exporter;

    if (type === "otlp") {
      exporter = new OTLPTraceExporter({ url: endpoint, headers });
    } else if (type === "console") {
      const { ConsoleSpanExporter } = require("@opentelemetry/exporter-trace-console");
      exporter = new ConsoleSpanExporter();
    } else if (type === "custom" && exporterInstance) {
      exporter = exporterInstance;
    } else {
      console.warn("Telemetry exporter misconfigured");
      return;
    }

    provider.addSpanProcessor(new BatchSpanProcessor(exporter));
    provider.register();

    isInitialized = true;
  }

  static getTracer(serviceName: string) {
    return trace.getTracer(serviceName);
  }
}
4. Add Environment Variable Support
ts
Copiar
Editar
// src/telemetry/env.ts

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
    },
  };
}
5. Instrument Core SDK Functions
Target functions to wrap with telemetry spans:

createWallet()

signTransaction()

validatePasskeyAuth()

storeEncryptedKey()

loadPasskey()

Example:

ts
Copiar
Editar
// src/core/wallet.ts
import { TelemetryService } from "../telemetry/TelemetryService";

export async function createWallet(...) {
  const tracer = TelemetryService.getTracer("passkey-kit");
  const span = tracer.startSpan("wallet.create");

  try {
    const result = await actualCreateWalletLogic();
    span.setStatus({ code: 1 });
    return result;
  } catch (e) {
    span.recordException(e);
    throw e;
  } finally {
    span.end();
  }
}
6. Add SDK Entry Hook to Init Telemetry
ts
Copiar
Editar
// src/index.ts

import { getTelemetryConfigFromEnv } from "./telemetry/env";
import { TelemetryService } from "./telemetry/TelemetryService";

TelemetryService.init(getTelemetryConfigFromEnv());
🧪 Example: .env File for Datadog
env
Copiar
Editar
TELEMETRY_ENABLED=true
TELEMETRY_SERVICE_NAME=passkey-kit
TELEMETRY_EXPORTER_TYPE=otlp
TELEMETRY_OTLP_ENDPOINT=https://api.datadoghq.com/api/v2/otlp
TELEMETRY_OTLP_HEADERS={"DD-API-KEY":"your_api_key"}
📘 Documentation / README Example
ts
Copiar
Editar
import { TelemetryService } from "passkey-kit/telemetry";

TelemetryService.init({
  enabled: true,
  serviceName: "my-passkey-service",
  exporter: {
    type: "otlp",
    endpoint: "http://localhost:4318",
    headers: { Authorization: "Bearer my-token" }
  }
});
🔄 Future Enhancements
Metrics support via @opentelemetry/sdk-metrics.

Integration with logging pipelines (e.g., pino → Datadog).

Error tracking events.

Export metadata (wallet ID, account address) as OTEL attributes.

