import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClaimsService,
  DomainsService,
  initWithPrivateKeySigner,
  setCacheConfig,
  setChainConfig,
  SignerService,
} from 'iam-client-lib';
import { Logger } from '../logger/logger.service';

@Injectable()
export class IamService implements OnApplicationBootstrap {
  private domainsService: DomainsService;
  private claimService: ClaimsService;
  private signerService: SignerService;

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
    const { connectToCacheServer, signerService } =
      await initWithPrivateKeySigner(
        this.configService.get<string>('PRIVATE_KEY'),
        this.configService.get<string>('RPC_URL'),
      );
    const { connectToDidRegistry, domainsService } =
      await connectToCacheServer();
    const { claimsService } = await connectToDidRegistry();

    this.domainsService = domainsService;
    this.claimService = claimsService;
    this.signerService = signerService;

    this.logger.log(`IAM Service Initialized...`);
  }

  async getENSTypesByOwner(
    ...params: Parameters<DomainsService['getENSTypesByOwner']>
  ) {
    return this.domainsService.getENSTypesByOwner(params[0]);
  }

  async getClaimById(...params: Parameters<ClaimsService['getClaimById']>) {
    return this.claimService.getClaimById(params[0]);
  }

  async createOrganization(
    ...params: Parameters<DomainsService['createOrganization']>
  ) {
    return this.domainsService.createOrganization(params[0]);
  }

  async changeOrgOwnership(
    ...params: Parameters<DomainsService['changeOrgOwnership']>
  ) {
    return this.domainsService.changeOrgOwnership(params[0]);
  }

  async issueClaimRequest(
    ...params: Parameters<ClaimsService['issueClaimRequest']>
  ) {
    return this.claimService.issueClaimRequest(params[0]);
  }

  async getClaimsByIssuer(
    ...params: Parameters<ClaimsService['getClaimsByIssuer']>
  ) {
    return this.claimService.getClaimsByIssuer(params[0]);
  }

  get did() {
    return this.signerService.did;
  }
}
