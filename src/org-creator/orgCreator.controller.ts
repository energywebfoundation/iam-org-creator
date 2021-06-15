import { BadRequestException, Controller, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, Payload } from '@nestjs/microservices';
import { ENSNamespaceTypes } from 'iam-client-lib';
import * as jwt from 'jsonwebtoken';
import { IamService } from 'src/iam/iam.service';
import { Logger } from '../logger/logger.service';
import { ClaimRequestEventDto } from './orgCreator.dto';

@Injectable()
@Controller()
export class OrgCreatorController {
  constructor(
    private configService: ConfigService,
    private readonly logger: Logger,
    private iamService: IamService,
  ) {
    this.logger.setContext(OrgCreatorController.name);
  }

  @EventPattern('*.claim.exchange')
  async createOrg(@Payload() message: ClaimRequestEventDto) {
    console.log(message);
    const { token, requester, id } = message;
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

    await this.iamService.initializeIAM();

    const userHasOrgCheck = await this.iamService.getENSTypesByOwner({
      type: ENSNamespaceTypes.Organization,
      owner: claimData.requester,
    });

    if (userHasOrgCheck?.length > 0) {
      throw new BadRequestException(
        'User already has organisation created.. exiting org creation process',
      );
    }

    const orgName = claimData?.fields.find((x) => x.key === 'orgname').value;

    const data = { orgName };

    const createOrgData = {
      orgName,
      data,
      namespace: 'iam.ewc',
    };

    console.log(createOrgData);

    // createOrg
    const wee = await this.iamService.createOrganization(createOrgData);
    console.log(wee);

    // transfer org to user
    await this.iamService.changeOrgOwnership({
      namespace: claimData.claimType,
      newOwner: claimData.requester,
    });
    console.log(`got here 2`);

    // send nats notification to user
    await this.iamService.issueClaimRequest({
      requesterDID: requester,
      token,
      id,
    });
  }
}
