import { addressOf } from '@ew-did-registry/did-ethr-resolver';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
    private iamService: IamService,
    private configService: ConfigService,
  ) {
    this.logger.setContext(OrgCreatorService.name);
  }

  extractAddressFromDID(didString: string): string {
    return addressOf(didString);
  }

  async handler(claimId: string): Promise<boolean> {
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

    const owner = this.extractAddressFromDID(requester);

    const requestNewOrgRole = this.configService.get<string>(
      'REQUEST_NEW_ORG_ROLE',
    );

    if (claimData?.claimType !== requestNewOrgRole) {
      this.logger.error(
        `Role found in claim request event ${claimData?.claimType} is not the role that is used to request a new organization, exiting org creation process.`,
      );
      throw new UnauthorizedException(
        `Role found ${claimData?.claimType} is not the role for requesting to create a new organization.`,
      );
    }

    this.logger.log('starting userHasOrgCheck validation');
    const userHasOrgCheck = await this.iamService.getENSTypesByOwner({
      type: NamespaceType.Organization,
      owner,
    });

    const orgName =
      claimData?.fields?.find((x) => x.key === 'orgname')?.value ||
      claimData?.requestorFields?.find((x) => x.key === 'orgname')?.value;

    if (!orgName) {
      throw new BadRequestException('Org name is not found in claim');
    }

    if (userHasOrgCheck?.length > 0) {
      this.logger.error(`User ${owner} already has an existing organization.`);
      throw new BadRequestException(
        `User ${owner} already has organization created.`,
      );
    }

    const data = { orgName };
    const namespace = this.configService.get<string>('ORG_NAMESPACE');

    const createOrgData = {
      orgName,
      data,
      namespace,
    };

    this.logger.log('starting organization creation process');
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
      token,
      id,
      subjectAgreement,
      registrationTypes,
    });

    this.logger.log('completed organization creation process');
    return true;
  }
}
