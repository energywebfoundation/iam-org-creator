import { Controller, Injectable, UseInterceptors } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { Logger } from '../logger/logger.service';
import { SentryErrorInterceptor } from '../sentry/sentry-error-interceptor';
import { ClaimRequestEventDto } from './orgCreator.dto';
import { OrgCreatorService } from './orgCreator.service';

@Injectable()
@UseInterceptors(SentryErrorInterceptor)
@Controller()
export class OrgCreatorController {
  constructor(
    private readonly logger: Logger,
    private orgcreatorService: OrgCreatorService,
  ) {
    this.logger.setContext(OrgCreatorController.name);
  }

  @EventPattern('request-credential.claim-exchange.*.*')
  async createOrg(@Payload() message: ClaimRequestEventDto): Promise<boolean> {
    this.logger.log(`Processing event received...`);
    const requestObject = plainToClass(ClaimRequestEventDto, message);
    const errors = await validate(requestObject, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      this.logger.log(
        `Event Request received is not a claims creation event... skipping org creation event`,
      );
      return;
    }

    return await this.orgcreatorService.handler(message.claimId);
  }
}
