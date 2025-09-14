/**
 * Minimal logger with levels and error capture.
 */

export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
};

export class Logger {
  constructor({ enableDebug = false } = {}) {
    this.enableDebug = enableDebug;
    this.buffer = [];
    this.max = 200;
  }

  push(entry) {
    this.buffer.push({ time: Date.now(), ...entry });
    if (this.buffer.length > this.max) this.buffer.shift();
    if (typeof window !== 'undefined') window.__TEMPLE_RUN_LOGS__ = this.buffer;
  }

  debug(...args) {
    if (!this.enableDebug) return;
    // eslint-disable-next-line no-console
    console.debug('[DEBUG]', ...args);
    this.push({ level: LogLevel.DEBUG, msg: args.join(' ') });
  }
  info(...args) {
    // eslint-disable-next-line no-console
    console.info('[INFO]', ...args);
    this.push({ level: LogLevel.INFO, msg: args.join(' ') });
  }
  warn(...args) {
    // eslint-disable-next-line no-console
    console.warn('[WARN]', ...args);
    this.push({ level: LogLevel.WARN, msg: args.join(' ') });
  }
  error(err, context) {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', err);
    const entry = {
      level: LogLevel.ERROR,
      msg: String(err?.message || err),
      code: err?.code || undefined,
      stack: err?.stack || undefined,
      context: context || err?.context || undefined,
    };
    this.push(entry);
  }
}

export const defaultLogger = new Logger({ enableDebug: false });
