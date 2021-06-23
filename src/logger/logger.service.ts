import {
  Injectable,
  Logger as NestLogger,
  LoggerService,
  Scope,
} from '@nestjs/common';
import {
  createLogger,
  format,
  Logger as WinstonLogger,
  transports,
} from 'winston';

import { ConfigService } from '@nestjs/config';

@Injectable({ scope: Scope.TRANSIENT })
export class Logger extends NestLogger implements LoggerService {
  public readonly logger: WinstonLogger;
  constructor(configService: ConfigService) {
    super();
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    const logFormat = isProduction
      ? format.combine(format.timestamp(), format.json())
      : format.combine(
          format.timestamp(),
          format.printf(
            ({ level, message, timestamp, context }) =>
              `${level} [${context || ''}] : ${timestamp} - ${message}`,
          ),
          format.colorize(),
        );

    const console = new transports.Console({ format: logFormat });

    this.logger = createLogger({
      format: logFormat,
      level: 'debug',
      transports: [console],
    });
  }

  error(error: any, trace?: string, context: string = this.context) {
    if (Array.isArray(error)) {
      this.logger.error(
        error.map((err) => JSON.stringify(err, null, 2)).join(', '),
      );
      return;
    }
    if (error instanceof Error) {
      const { message, stack, ...meta } = error;
      return this.logger.error(message, {
        context,
        stack: [trace || stack],
        ...meta,
      });
    }
    if ('object' === typeof error) {
      const { message, ...meta } = error as { message: string };
      return this.logger.error(message, {
        context,
        stack: [trace],
        ...meta,
      });
    }
    this.logger.error(error, { context });
  }

  warn(message: any, context: string = this.context) {
    return this.logger.warn(message, { context });
  }

  debug(message: any, context: string = this.context) {
    return this.logger.debug(message, { context });
  }

  verbose(message: any, context: string = this.context) {
    return this.logger.verbose(message, { context });
  }

  info(message: any, context: string = this.context) {
    return this.logger.info(message, { context });
  }
}
