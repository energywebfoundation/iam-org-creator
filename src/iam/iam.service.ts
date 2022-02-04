import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClaimsService,
  DomainsService,
  initWithPrivateKeySigner,
  setCacheConfig,
  setChainConfig,
} from 'iam-client-lib';
import { Logger } from '../logger/logger.service';

@Injectable()
export class IamService implements OnApplicationBootstrap {
  private domainsService: DomainsService;
  private claimService: ClaimsService;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    const voltaChainId = configService.get<number>('VOLTA_CHAIN_ID');

    // Set Cache Server
    setCacheConfig(voltaChainId, {
      url: configService.get<string>('CACHE_SERVER_URL'),
      cacheServerSupportsAuth: true,
    });

    // Set RPC
    setChainConfig(voltaChainId, {
      rpcUrl: configService.get<string>('RPC_URL'),
    });
  }

  async onApplicationBootstrap() {
    await this.initializeIAM();
  }

  async initializeIAM() {
    const { connectToCacheServer } = await initWithPrivateKeySigner(
      this.configService.get<string>('PRIVATE_KEY'),
      this.configService.get<string>('RPC_URL'),
    );
    const { connectToDidRegistry, domainsService } =
      await connectToCacheServer();
    const { claimsService } = await connectToDidRegistry();

    this.domainsService = domainsService;
    this.claimService = claimsService;

    this.logger.log(`IAM Service Initialized...`);
  }

  get getENSTypesByOwner() {
    return this.domainsService.getENSTypesByOwner;
  }

  get getClaimById() {
    return this.claimService.getClaimById;
  }

  get createOrganization() {
    return this.domainsService.createOrganization;
  }

  get changeOrgOwnership() {
    return this.domainsService.changeOrgOwnership;
  }

  get issueClaimRequest() {
    return this.claimService.issueClaimRequest;
  }
}
