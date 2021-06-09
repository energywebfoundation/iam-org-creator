import { Controller, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, Payload } from '@nestjs/microservices';
import * as jwt from 'jsonwebtoken';
import { Logger } from '../logger/logger.service';
import { ClaimRequestEventDto } from './orgCreator.dto';
import { IClaimToken } from './orgCreator.type';

@Injectable()
@Controller()
export class OrgCreatorController {
  constructor(
    private configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(OrgCreatorController.name);
  }

  @EventPattern('*.claim.exchange')
  async createOrg(@Payload() message: ClaimRequestEventDto) {
    const { token } = message;
    const {
      payload: { claimData },
    } = jwt.decode(token, { complete: true });

    const permittedEventRole = this.configService.get<string>(
      'PERMITTED_ORG_CREATOR_ROLE',
    );
    if (claimData?.claimType !== permittedEventRole) {
      this.logger.log(
        `Role found in claim request event is not permitted, exiting org creation process.`,
      );
      return;
    }
    // TODO: Org process creation logic
    return true;
  }
}
