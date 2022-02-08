import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { IamService } from '../iam/iam.service';
import { Logger } from '../logger/logger.service';
import { OrgCreatorService } from './orgCreator.service';

@Injectable()
export class OrgCreatorPolling {
  public readonly ROLE_NAMESPACE: string;

  constructor(
    @Inject(ConfigService)
    private readonly configService: ConfigService,
    private readonly logger: Logger,
    private readonly iamService: IamService,
    private readonly handlerService: OrgCreatorService,
  ) {
    this.logger.setContext(OrgCreatorPolling.name);
    this.ROLE_NAMESPACE = this.configService.get('REQUEST_NEW_ORG_ROLE');
  }

  // Defaults to every 2.5 minutes
  @Interval('REQUEST_POLLING', +process.env.REQUEST_POLLING_INTERVAL || 150_000)
  private async intervalHandler() {
    this.logger.log(`Polling for new org creation requests...`);
    const notAcceptedRequests = await this.iamService.getClaimsByIssuer({
      did: this.iamService.did,
      isAccepted: false,
      namespace: this.ROLE_NAMESPACE,
    });
    const notRejectedRequests = notAcceptedRequests.filter(
      (claim) => !claim.isRejected,
    );

    const pendingJobs = notRejectedRequests.map((request) => {
      return this.handlerService.handler(request.id);
    });

    Promise.all(pendingJobs);
  }
}
