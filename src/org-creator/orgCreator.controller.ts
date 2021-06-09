import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, Payload } from '@nestjs/microservices';
import jwt_decode from 'jwt-decode';
import { Logger } from '../logger/logger.service';
import { OrgCreatorEventDto } from './orgCreator.dto';
import { IClaimToken } from './orgCreator.type';

@Injectable()
export class OrgCreatorController {
  constructor(
    private configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(OrgCreatorController.name);
  }

  @EventPattern('*.claim.exchange')
  createOrg(@Payload() message: OrgCreatorEventDto) {
    const { token } = message;
    const { claimData }: IClaimToken = jwt_decode(token);
    const permittedEventRole = this.configService.get<string>(
      'PERMITTED_ORG_CREATOR_ROLE',
    );
    if (claimData.claimType !== permittedEventRole) {
      this.logger.log(
        `role found in orgCreator event is not permitted, exiting org creation process `,
      );
      return;
    }
    // TODO: Org process creation logic
    return true;
  }
}
