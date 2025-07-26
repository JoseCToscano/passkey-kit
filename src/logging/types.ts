export type { Transform } from "stream";
export interface LoggingConfig {
  name?: string;
  level?: 'info' | 'debug' | 'error' | 'warn';
  transports?: Record<string, Transform>;
}

export interface LoggerTransport extends Transform {}
