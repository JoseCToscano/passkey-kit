PRD: Flexible Logging Integration for passkey-kit
Feature: Pino-Based Structured Logging with Custom Transports
Repository: https://github.com/freelii/passkey-kit
Objective: Introduce a pluggable logging system using Pino, modeled after Mastra’s architecture. The logger should support structured logs, custom transports (e.g., Datadog, HTTP, console), and be fully configurable via the constructor of PasskeyKit and PasskeyServer, rather than relying on environment variables.

🧩 Goals
Use Pino for structured logging.

Allow users to configure the logger directly via the PasskeyKit and PasskeyServer constructors.

Support multiple simultaneous log transports (console, HTTP, Datadog, etc.).

Enable integration of custom Transform streams via a utility.

Log important lifecycle events such as wallet creation, transaction signing, XDR generation, etc.

Match the extensibility of Mastra’s PinoLogger.

✅ Acceptance Criteria
 Logger supports structured JSON logs.

 Developers can pass a logger or loggingConfig into the constructors of PasskeyKit and PasskeyServer.

 Logging supports:

 Pretty console output

 Optional custom transports (Datadog, HTTP, etc.)

 LoggingService is a singleton or globally accessible utility once initialized.

 Instrument at least the following methods:

createWallet

createKey

connect

signAuthEntry

sign

 Clear README and TS types for configuration.

🏗️ Technical Plan
1. Constructor Interface Changes
Update constructors for PasskeyKit and PasskeyServer to accept:

ts
Copiar
Editar
interface PasskeyOptions {
  ...
  logging?: LoggingConfig | pino.Logger;
}
And in each constructor:

ts
Copiar
Editar
import { LoggingService } from './logging/LoggingService';

constructor(opts: PasskeyOptions) {
  ...
  if (opts.logging) LoggingService.init(opts.logging);
}
2. LoggingService.ts
Same implementation as before, but initialization comes from constructor-provided config only (no .env parsing):

ts
Copiar
Editar
static init(config: LoggingConfig | pino.Logger) {
  if (isPinoLogger(config)) {
    logger = config;
    return;
  }

  const streams: pino.StreamEntry[] = [];

  const prettyStream = pretty({ colorize: true });
  streams.push({ stream: prettyStream, level: config.level || 'info' });

  Object.entries(config.transports || {}).forEach(([, stream]) => {
    streams.push({ stream, level: config.level || 'info' });
  });

  logger = pino({ name: config.name || 'passkey-kit', level: config.level || 'info' }, pino.multistream(streams));
}
3. Usage Example
ts
Copiar
Editar
import { PasskeyKit } from 'passkey-kit';
import { createCustomTransport } from 'passkey-kit/logging';
import pinoDatadog from 'pino-datadog-transport';

const ddStream = pinoDatadog({ /* your datadog config */ });
const ddTransport = createCustomTransport(ddStream);

const kit = new PasskeyKit({
  rpcUrl: 'https://soroban-rpc.testnet.stellar.org',
  logging: {
    level: 'info',
    transports: { datadog: ddTransport },
  },
});
4. Remove env.ts
No .env parsing is needed. Delete src/logging/env.ts.

5. Logger Types (types.ts)
ts
Copiar
Editar
export interface LoggingConfig {
  name?: string;
  level?: 'info' | 'debug' | 'error' | 'warn';
  transports?: Record<string, Transform>;
}

export interface LoggerTransport extends Transform {}
6. Instrumented Logging in Core Methods
Replace or complement existing TelemetryService usage with:

ts
Copiar
Editar
const logger = LoggingService.get();
logger.info("wallet.createWallet", { user, app, walletId });
logger.error("wallet.sign.error", { error, xdr });
7. README Usage Example
ts
Copiar
Editar
import { PasskeyKit } from "passkey-kit";
import { createCustomTransport } from "passkey-kit/logging";
import pinoDatadog from "pino-datadog-transport";

const datadogStream = pinoDatadog({ ... });
const loggerTransport = createCustomTransport(datadogStream);

const kit = new PasskeyKit({
  logging: {
    level: 'info',
    transports: {
      datadog: loggerTransport
    }
  }
});
🧪 Test Cases
 ✅ Logs show in console by default if pretty transport used.

 ✅ PasskeyKit accepts logging option and forwards logs.

 ✅ Structured logs include metadata (e.g. walletId, xdr).

 ✅ Multiple transports work concurrently.

 ✅ Datadog transport logs are sent using a custom stream.