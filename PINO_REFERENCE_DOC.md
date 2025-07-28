Integrating Custom Logging (à la Mastra) into Passkey Kit
Mastra’s Flexible Pino Logging Architecture
Mastra implements a robust logging system built on Pino, enabling logs to be routed to various destinations (console, files, external services) via a transport-based architecture. The core is the PinoLogger class, which extends an abstract MastraLogger base. This design allows injecting custom transports (outputs) when configuring the logger
mastra.ai
mastra.ai
. In practice, a Mastra logger instance is created like:
const logger = new PinoLogger({ 
  name: "Mastra", 
  level: "info",
  transports: { /* custom transports can be added here */ }
});
The logger provides standard methods (debug, info, warn, error) to record events at various severity levels
mastra.ai
mastra.ai
. Depending on its configuration, log messages can be written to the console, a file, or sent to an external monitoring service
mastra.ai
. By default, if no custom transport is added, Mastra uses a pretty-print console stream for human-readable logs. If transports are provided, Mastra leverages Pino’s multi-stream capability to broadcast each log record to all configured destinations simultaneously
mastra.ai
mastra.ai
. This means you can have, for example, console output for local debugging and a remote log service (like Datadog) receiving the same log events in JSON form. Under the hood, transports in Mastra are implemented as Node.js Transform streams. Mastra defines a LoggerTransport class (subclassing Transform) to represent a log destination stream with optional methods for retrieving logs (used for querying saved logs)
mastra.ai
. Each transport stream consumes Pino log objects and sends them onward – e.g. writing to a file, making an HTTP request, etc. The use of Transform streams makes the system very flexible: you can pipe log data to any target by providing a stream that implements a _transform method
mastra.ai
. For example, Mastra’s deployment module creates a custom Transform to capture child process output and feed it into the logger, illustrating that even process streams can be integrated as log input.
Custom Transports for External Services
A key feature of Mastra’s logger is the ability to plug in custom transports for external monitoring services (Datadog, Sentry, etc.). Mastra provides a utility function createCustomTransport(stream) which takes a Transform stream and wraps it as a LoggerTransport instance
mastra.ai
. This allows developers to define an arbitrary stream (for example, one that sends log data to an HTTP API or third-party SDK) and then attach it to the PinoLogger. The logger will treat it as just another output destination. How it works: Suppose you have a stream that sends data to an external service. You create that stream (often using a third-party library or custom code), then call createCustomTransport(yourStream). The returned object can be added to the logger’s transports. From then on, every log message (as a JSON object) is passed into your stream’s _transform function for processing. Example – Sentry Integration: In Mastra’s documentation, there’s a clear example of adding a Sentry.io transport using this method. They use a community Pino transport pino-sentry-transport to get a Sentry-bound stream, then wrap it for Mastra:
import { createCustomTransport } from "@mastra/core/loggers";
import pinoSentry from "pino-sentry-transport";

const sentryStream = await pinoSentry({
  sentry: { dsn: "YOUR_SENTRY_DSN", _experiments: { enableLogs: true } }
});
const sentryTransport = createCustomTransport(sentryStream);

const logger = new PinoLogger({
  name: "Mastra",
  transports: { sentry: sentryTransport },
  level: "info",
});
[The above Sentry integration is adapted from Mastra’s docs
mastra.ai
mastra.ai
 – it shows the pattern for wrapping any custom log stream.] This transport-based approach means Datadog integration is absolutely feasible in the same manner. The Mastra logger doesn’t have special-case code for Datadog; instead it provides the generic plumbing to hook in any service. For Datadog, one could use Datadog’s own logging client or a Pino transport library. For instance, the community package pino-datadog-transport can batch and send logs to Datadog’s HTTP API
github.com
. Using it with Mastra’s system would be straightforward: create the Datadog stream and wrap it. Conceptually:
import pinoDatadog from "pino-datadog-transport";
// ... configure pinoDatadog with your Datadog API key, site, etc.
const ddStream = pinoDatadog({ 
  ddClientConf: { authMethods: { apiKeyAuth: "<DATADOG_API_KEY>" } },
  ddServerConf: { site: "datadoghq.com" }  // or EU site, etc:contentReference[oaicite:15]{index=15}
});
const ddTransport = createCustomTransport(ddStream);

const logger = new PinoLogger({
  name: "MyService",
  level: "info",
  transports: { datadog: ddTransport }
});
With this setup, every call like logger.info("XDR signed", { transactionId, ... }) would emit a log object to both the console (pretty printed) and to Datadog via the custom transport. Mastra’s use of pino.multistream under the hood ensures multiple transports can receive the logs concurrently
mastra.ai
mastra.ai
.
Applying a Similar Logging System to Passkey Kit
Currently, the Passkey Kit SDK has minimal built-in logging. To enhance observability (especially for events like Stellar transaction creation, signing, XDR outputs, etc.), we can introduce a Mastra-inspired logging architecture:
Adopt Pino for Structured Logging: Incorporate Pino as the logging library in Passkey Kit. Pino is chosen for its performance and ability to emit structured JSON logs which are easily parsed by monitoring tools. We might create a PasskeyLogger (akin to Mastra’s PinoLogger) that wraps a Pino instance.
Transport Configuration at Build/Init Time: Allow developers to configure logging outputs when they initialize the library (or via environment variables at build time). For example, Passkey Kit could expose a configuration where you can enable an external log transport. This is similar to how Passkey Kit’s telemetry (TelemetryService) can be toggled via code or env variables. We can introduce something like LoggingService.init({ transports: ..., level: ... }) or options in the PasskeyKit constructor for logging. Environment variables (e.g., LOG_DATADOG_ENABLED, DATADOG_API_KEY, etc.) could be read to decide if the Datadog transport should be attached, making it configurable without code changes at build/deploy time.
Custom Transports for Monitoring Services: Emulate Mastra’s createCustomTransport pattern. We can provide a utility to wrap any Node.js Stream as a Passkey Kit log transport. In practice, we’d likely integrate a Datadog stream. For instance, using Datadog’s official Node client or a Pino Datadog transport, we create a Transform stream that sends logs to Datadog. Then, wrap it so that our logger can use it. The result would enable sending Passkey Kit logs to Datadog (or any similar service) seamlessly. This design means you aren’t limited to Datadog – you could plug in Sentry, Logstash, or any custom endpoint by providing the appropriate stream.
Multiple Simultaneous Outputs: Like Mastra, Passkey Kit’s logger can default to console output (for developer visibility) while also forwarding logs to external services. Using Pino’s multi-stream support, we ensure that adding a Datadog transport doesn’t remove the existing console log; instead, both will receive the events. This is crucial for debugging locally while still capturing logs centrally in production. The configuration might allow overriding default transports if needed (Mastra has an overrideDefaultTransports option), but by default we’d merge custom transports with console logging.
Structured Log Content: As we add logging calls in Passkey Kit’s code (for example, when a wallet is created, a transaction XDR is generated, a transaction is signed, etc.), we should log structured data. Pino allows logging objects, not just strings. For example, when PasskeyKit.createWallet() is called, we could log an info-level entry like: { message: "Wallet created", user, app, walletId: ..., publicKey: ... }. This way, DataDog or other services can index fields like walletId or user. Mastra’s logger encourages structured logs with fields like destinationPath or type for categorization
mastra.ai
mastra.ai
. We might define similar conventions for Passkey Kit (e.g., a field indicating the operation type such as "passkey.operation": "createWallet").
Leveraging OpenTelemetry (if applicable): It’s worth noting that Passkey Kit recently introduced OpenTelemetry tracing (as seen in the diff adding TelemetryService.init and spans around wallet.create). Logging can complement tracing by recording high-level events and payloads. The logging system we add could optionally include trace IDs (if available) in log entries, so that logs and traces correlate in systems like Datadog (which can ingest both APM traces and logs). This would require capturing the current trace/span context in the log metadata, which Pino supports via hooks or by passing context explicitly.
Example: DataDog Logging Integration in Passkey Kit
To illustrate how Datadog integration might look, imagine enabling it via environment and code: Environment config:
LOG_DATADOG=true  
DATADOG_API_KEY=<your API key>  
DATADOG_SITE=datadoghq.com  
LOG_LEVEL=info  
Code usage in Passkey Kit:
On initialization, Passkey Kit’s logging service checks LOG_DATADOG. If true, it uses a Datadog transport. Using a Pino transport library for Datadog, the code could resemble:
import { createCustomTransport } from "passkey-kit/logging";
import pinoDatadog from "pino-datadog-transport";

const transports: Record<string, any> = {};
if (process.env.LOG_DATADOG) {
  const ddStream = pinoDatadog({
    ddClientConf: { authMethods: { apiKeyAuth: process.env.DATADOG_API_KEY } },
    ddServerConf: { site: process.env.DATADOG_SITE || "datadoghq.com" }
  });
  transports.datadog = createCustomTransport(ddStream);
}

const logger = new PasskeyLogger({ level: process.env.LOG_LEVEL || "info", transports });
logger.info("PasskeyKit initialized", { service: "passkey-kit", version: "X.Y.Z" });
Every meaningful operation within Passkey Kit would use logger.debug/info/error calls. For example, when a transaction is signed:
logger.info("Transaction signed", { 
  txId: signedTx.hash, 
  xdr: signedTx.toXDR(), 
  operation: "wallet.sign" 
});
If Datadog logging is enabled, that info will be sent to Datadog with all the structured data (and still printed to console for local dev). Datadog’s logs UI would then allow filtering by fields like operation: wallet.sign or seeing the txId and XDR for troubleshooting. This aligns with Mastra’s approach of capturing both human-readable and machine-parseable logs.
Summary of Benefits
By mirroring Mastra’s logging architecture in Passkey Kit, we gain:
Pluggability: Developers can integrate any logging/monitoring provider (Datadog, Splunk, Sentry, etc.) by adding a custom transport, without modifying Passkey Kit’s core logic. Mastra’s createCustomTransport concept makes this extensible
mastra.ai
.
Configurability: Logging destinations and levels can be configured at build or startup time. For instance, one could enable verbose logging in a staging environment with console output, but in production pipe the logs to Datadog for long-term retention and analysis.
Minimal Overhead & Structured Data: Pino’s design ensures high performance. Logging in JSON means that context (like user IDs, wallet IDs, error details) can be included in each log entry. This is crucial for monitoring complex processes like multi-step Stellar transactions. Mastra’s own use of structured fields (e.g., runId for correlation
mastra.ai
) demonstrates how logs can be tied to specific operations or workflows – Passkey Kit can use similar techniques (like attaching a passkey ID or transaction hash to each log).
Multiple Outputs for Developer Convenience: The multi-stream logging means developers don’t lose the simplicity of console.log during development. They can see logs in the terminal and have them forwarded to a service in parallel. This dual-output approach was effectively used in Mastra (e.g., sending logs to a file or HTTP endpoint while still pretty-printing to stdout
mastra.ai
mastra.ai
).
In conclusion, Mastra’s logging system provides an excellent blueprint for enhancing Passkey Kit’s observability. By introducing a Pino-based logger with configurable transports, we can enable first-class support for Datadog and other log aggregators. The implementation would involve creating a logging module in Passkey Kit that mirrors Mastra’s transport mechanism, allowing for flexible integration at build time and ensuring that critical events (like XDR creation, signature operations, etc.) are captured for monitoring and debugging purposes. This will make it much easier to operate Passkey-based applications in production, with rich logs flowing into your monitoring dashboards. Sources:
Mastra Observability Docs – Logger Instance and Custom Transports
mastra.ai
mastra.ai
Mastra Code Examples – File and Upstash transports, multi-stream configuration
mastra.ai
mastra.ai
Pino Datadog Transport – GitHub README (usage and config)
github.com
github.com
Citas

Reference: Logger Instance | Mastra Observability Docs

https://mastra.ai/en/reference/observability/logger

Reference: Logger Instance | Mastra Observability Docs

https://mastra.ai/en/reference/observability/logger

Reference: Logger Instance | Mastra Observability Docs

https://mastra.ai/en/reference/observability/logger

Reference: Logger Instance | Mastra Observability Docs

https://mastra.ai/en/reference/observability/logger

Reference: Logger Instance | Mastra Observability Docs

https://mastra.ai/en/reference/observability/logger

Reference: Logger Instance | Mastra Observability Docs

https://mastra.ai/en/reference/observability/logger

Reference: Logger Instance | Mastra Observability Docs

https://mastra.ai/en/reference/observability/logger
1.diff.txt

file://file-V2dtzuXNpqHuYRAjUUcmte
1.diff.txt

file://file-V2dtzuXNpqHuYRAjUUcmte

Reference: Logger Instance | Mastra Observability Docs

https://mastra.ai/en/reference/observability/logger

Reference: Logger Instance | Mastra Observability Docs

https://mastra.ai/en/reference/observability/logger

GitHub - theogravity/pino-datadog-transport: A pino v7+ transport for sending logs to Datadog

https://github.com/theogravity/pino-datadog-transport

GitHub - theogravity/pino-datadog-transport: A pino v7+ transport for sending logs to Datadog

https://github.com/theogravity/pino-datadog-transport
1.diff.txt

file://file-V2dtzuXNpqHuYRAjUUcmte
1.diff.txt

file://file-V2dtzuXNpqHuYRAjUUcmte
1.diff.txt

file://file-V2dtzuXNpqHuYRAjUUcmte
1.diff.txt

file://file-V2dtzuXNpqHuYRAjUUcmte

Reference: Logger Instance | Mastra Observability Docs

https://mastra.ai/en/reference/observability/logger

Reference: Logger Instance | Mastra Observability Docs

https://mastra.ai/en/reference/observability/logger
1.diff.txt

file://file-V2dtzuXNpqHuYRAjUUcmte
1.diff.txt

file://file-V2dtzuXNpqHuYRAjUUcmte

GitHub - theogravity/pino-datadog-transport: A pino v7+ transport for sending logs to Datadog

https://github.com/theogravity/pino-datadog-transport