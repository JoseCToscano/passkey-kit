import pino from 'pino';
import pretty from 'pino-pretty';
import type { LoggingConfig, LoggerTransport } from './types';
import { Transform } from 'stream';

let logger: pino.Logger | undefined;

function isPinoLogger(obj: any): obj is pino.Logger {
  return obj && 
    typeof obj === 'object' &&
    typeof obj.info === 'function' && 
    typeof obj.error === 'function' &&
    typeof obj.warn === 'function' &&
    typeof obj.debug === 'function' &&
    typeof obj.child === 'function';
}

export class LoggingService {
  static init(config: LoggingConfig | pino.Logger) {
    if (isPinoLogger(config)) {
      logger = config;
      return;
    }

    const streams: pino.StreamEntry[] = [];
    const level = config.level || 'info';
    const prettyStream: Transform = pretty({ colorize: true });
    streams.push({ stream: prettyStream, level });

    Object.entries(config.transports || {}).forEach(([, stream]) => {
      streams.push({ stream, level });
    });

    logger = pino({ name: config.name || 'passkey-kit', level }, pino.multistream(streams));
  }

  static get(): pino.Logger {
    if (!logger) {
      logger = pino({ name: 'passkey-kit' }, pino.multistream([ { stream: pretty({ colorize: true }) } ]));
    }
    return logger;
  }
}

export function createCustomTransport(transform: Transform): LoggerTransport {
  const transport = transform as LoggerTransport;
  
  // Add optional retrieveLogs method if not present
  if (!transport.retrieveLogs) {
    transport.retrieveLogs = () => {
      throw new Error('retrieveLogs not implemented for this transport');
    };
  }
  
  return transport;
}
