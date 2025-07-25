/**
 * Simple console logger to replace Pino and avoid worker thread issues
 * This prevents the "worker has exited" errors we've been seeing
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogData {
  [key: string]: any;
}

class SimpleLogger {
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
  }

  private formatMessage(level: string, message: string, data?: LogData): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` | ${JSON.stringify(data)}` : '';
    return `[${timestamp}] ${level}: ${message}${dataStr}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  debug(data: LogData | string, message?: string): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    if (typeof data === 'string') {
      console.log(this.formatMessage('DEBUG', data));
    } else {
      console.log(this.formatMessage('DEBUG', message || 'Debug info', data));
    }
  }

  info(data: LogData | string, message?: string): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    if (typeof data === 'string') {
      console.log(this.formatMessage('INFO', data));
    } else {
      console.log(this.formatMessage('INFO', message || 'Info', data));
    }
  }

  warn(data: LogData | string, message?: string): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    if (typeof data === 'string') {
      console.warn(this.formatMessage('WARN', data));
    } else {
      console.warn(this.formatMessage('WARN', message || 'Warning', data));
    }
  }

  error(data: LogData | string, message?: string): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    if (typeof data === 'string') {
      console.error(this.formatMessage('ERROR', data));
    } else {
      console.error(this.formatMessage('ERROR', message || 'Error', data));
    }
  }

  fatal(data: LogData | string, message?: string): void {
    // Fatal logs are always shown regardless of log level
    if (typeof data === 'string') {
      console.error(this.formatMessage('FATAL', data));
    } else {
      console.error(this.formatMessage('FATAL', message || 'Fatal error', data));
    }
  }
}

export const simpleLogger = new SimpleLogger();