import { BadRequestException, Controller, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ENSNamespaceTypes } from 'iam-client-lib';
import * as jwt from 'jsonwebtoken';
import { IamService } from '../iam/iam.service';
import { Logger } from '../logger/logger.service';
import { ClaimRequestEventDto } from './orgCreator.dto';
import { OrgCreatorService } from './orgCreator.service';
import { IClaimToken } from './orgCreator.type';

@Injectable()
@Controller()
export class OrgCreatorController {
  constructor(
    private configService: ConfigService,
    private readonly logger: Logger,
    private iamService: IamService,
    private orgcreatorService: OrgCreatorService,
  ) {
    this.logger.setContext(OrgCreatorController.name);
  }

  @EventPattern('*.claim.exchange')
  async createOrg(@Payload() message: ClaimRequestEventDto): Promise<boolean> {
    const { token, requester, id, registrationTypes } = message;

    const { claimData } = jwt.decode(token) as IClaimToken;

    const owner = this.orgcreatorService.extractAddressFromDID(requester);

    const requestNewOrgRole = this.configService.get<string>(
      'REQUEST_NEW_ORG_ROLE',
    );

    if (claimData?.claimType !== requestNewOrgRole) {
      this.logger.log(
        `Role found in claim request event is not the role that is used to request a new organization, exiting org creation process.`,
      );
      return;
    }

    await this.iamService.initializeIAM();

    this.logger.log('starting userHasOrgCheck validation');
    const userHasOrgCheck = await this.iamService.getENSTypesByOwner({
      type: ENSNamespaceTypes.Organization,
      owner,
    });

    const orgName = claimData?.fields.find((x) => x.key === 'orgname').value;

    if (userHasOrgCheck?.length > 0) {
      throw new BadRequestException(
        'User already has organisation created.. exiting org creation process',
      );
    }

    const data = { orgName };
    const namespace = this.configService.get<string>('ORG_NAMESPACE');

    const createOrgData = {
      orgName,
      data,
      namespace,
    };

    this.logger.log('starting organisation creation process');
    // createOrg
    await this.iamService.createOrganization(createOrgData);

    this.logger.log('starting organisation ownership change process');

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
      subjectAgreement: '',
      registrationTypes,
    });

    this.logger.log('completed organisation creation process');
    return true;
  }
}
