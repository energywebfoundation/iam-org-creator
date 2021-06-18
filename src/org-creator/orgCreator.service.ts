import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from '../logger/logger.service';

@Injectable()
export class OrgCreatorService {
  constructor(
    private configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.logger.setContext(OrgCreatorService.name);
  }

  extractAddressFromDID(didString: string): string {
    return didString.split(':')[2];
  }
}
