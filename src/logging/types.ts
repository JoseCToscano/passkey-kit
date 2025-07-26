import { Transform } from "stream";

export interface LoggingConfig {
  name?: string;
  level?: 'info' | 'debug' | 'error' | 'warn';
  transports?: Record<string, LoggerTransport>;
}

export interface LoggerTransport extends Transform {
  retrieveLogs?: () => Promise<any[]> | any[];
}
