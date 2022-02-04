import { Injectable } from '@nestjs/common';
import { addressOf } from '@ew-did-registry/did-ethr-resolver';
import { Logger } from '../logger/logger.service';

@Injectable()
export class OrgCreatorService {
  constructor(private readonly logger: Logger) {
    this.logger.setContext(OrgCreatorService.name);
  }

  extractAddressFromDID(didString: string): string {
    return addressOf(didString);
  }
}
