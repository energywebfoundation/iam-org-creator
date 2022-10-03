import { addressOf } from '@ew-did-registry/did-ethr-resolver';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NamespaceType } from 'iam-client-lib';
import * as jwt from 'jsonwebtoken';
import { IamService } from '../iam/iam.service';
import { Logger } from '../logger/logger.service';
import { IClaimToken } from './orgCreator.type';

@Injectable()
export class OrgCreatorService {
  constructor(
    private readonly logger: Logger,
    private readonly iamService: IamService,
    private readonly configService: ConfigService,
  ) {
    this.logger.setContext(OrgCreatorService.name);
  }

  extractAddressFromDID(didString: string): string {
    return addressOf(didString);
  }

  isValidOrgName(orgName: string): boolean {
    return /^[a-z]+$/.test(orgName);
  }

  async handler(claimId: string): Promise<boolean> {
    this.logger.log(`Processing claimId: ${claimId}`);
    const claim = await this.iamService.getClaimById(claimId);

    if (!claim) {
      this.logger.log(`claim ${claimId} not found...`);
      return;
    }

    const {
      token,
      isRejected,
      id,
      requester,
      registrationTypes,
      subjectAgreement,
    } = claim;

    if (isRejected) {
      this.logger.log(`claim ${id} is rejected... skipping org creation event`);
      return;
    }

    const { claimData } = jwt.decode(token) as IClaimToken;
    this.logger.log(`claim data decoded: ${JSON.stringify(claimData)}`);
    const owner = this.extractAddressFromDID(requester);

    const requestNewOrgRole = this.configService.get<string>(
      'REQUEST_NEW_ORG_ROLE',
    );

    if (claimData?.claimType !== requestNewOrgRole) {
      this.logger.error(
        `Role found in claim request event ${claimData?.claimType} is not the role that is used to request a new organization, exiting org creation process.`,
      );
      return;
    }

    this.logger.log('starting userHasOrgCheck validation');
    const userHasOrgCheck = await this.iamService.getENSTypesByOwner({
      type: NamespaceType.Organization,
      owner,
    });

    let orgName =
      claimData?.fields?.find((x) => x.key === 'orgname')?.value ||
      claimData?.requestorFields?.find((x) => x.key === 'orgname')?.value;
    orgName = orgName?.toLowerCase();

    if (!orgName) {
      this.logger.warn('No org name found in claim request event');
      this.iamService.rejectClaimRequest({
        id: claimId,
        requesterDID: requester,
        rejectionReason: 'No org name found in claim request event',
      });
      return;
    }

    if (!this.isValidOrgName(orgName)) {
      this.logger.warn(`Org name ${orgName} is not valid`);
      this.iamService.rejectClaimRequest({
        id: claimId,
        requesterDID: requester,
        rejectionReason: `Org name ${orgName} is not valid`,
      });
      return;
    }

    if (userHasOrgCheck?.length > 0) {
      this.logger.error(`User ${owner} already has an existing organization.`);
      this.iamService.rejectClaimRequest({
        id: claimId,
        requesterDID: requester,
        rejectionReason: `User ${owner} already has an existing organization.`,
      });
      return;
    }

    const data = { orgName };
    const namespace = this.configService.get<string>('ORG_NAMESPACE');

    const createOrgData = {
      orgName,
      data,
      namespace,
    };

    this.logger.log(
      `starting organization creation process with org data: ${JSON.stringify(
        createOrgData,
      )}`,
    );
    // createOrg
    await this.iamService.createOrganization(createOrgData);

    this.logger.log('starting organization ownership change process');

    // transfer org to user
    await this.iamService.changeOrgOwnership({
      namespace: `${orgName}.${namespace}`,
      newOwner: owner,
    });

    this.logger.log('starting issue claim request process');
    // send nats notification to user
    await this.iamService.issueClaimRequest({
      requester,
      id,
      token,
      registrationTypes,
      subjectAgreement,
      publishOnChain: false,
    });

    this.logger.log('completed organization creation process');
    return true;
  }
}
