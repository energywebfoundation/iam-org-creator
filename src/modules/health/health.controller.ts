import { Controller, Get, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Transport } from '@nestjs/microservices';
import {
  HealthCheck,
  HealthCheckService,
  MicroserviceHealthIndicator,
} from '@nestjs/terminus';

import { natsConfig } from '../../config';
import { Logger } from '../logger/logger.service';
import { IAMHealthIndicator } from './indicators';

@Controller('health')
export class HealthController {
  protected readonly logger: Logger;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    private readonly health: HealthCheckService,
    private readonly microservice: MicroserviceHealthIndicator,
    private readonly iam: IAMHealthIndicator,
  ) {
    this.logger = new Logger(configService);
    this.logger.setContext(HealthController.name);
  }

  @Get('liveness')
  @HealthCheck()
  async livenessHealthCheck() {
    return this.health.check([
      () =>
        this.microservice.pingCheck('nats', {
          transport: Transport.NATS,
          options: {
            ...natsConfig,
            servers: [this.configService.get('NATS_CLIENTS_URL')],
          },
        }),
      () => this.iam.pingCheck('iam'),
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  readinessHealthCheck() {
    return this.health.check([]);
  }
}
