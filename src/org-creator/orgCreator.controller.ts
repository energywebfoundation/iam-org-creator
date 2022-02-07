import {
  BadRequestException,
  Controller,
  Injectable,
  UnauthorizedException,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventPattern, Payload } from '@nestjs/microservices';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { NamespaceType } from 'iam-client-lib';
import * as jwt from 'jsonwebtoken';
import { IamService } from '../iam/iam.service';
import { Logger } from '../logger/logger.service';
import { SentryErrorInterceptor } from '../sentry/sentry-error-interceptor';
import { ClaimRequestEventDto } from './orgCreator.dto';
import { OrgCreatorService } from './orgCreator.service';
import { IClaimToken } from './orgCreator.type';

@Injectable()
@UseInterceptors(SentryErrorInterceptor)
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

  @EventPattern('request-credential.claim-exchange.*.*')
  async createOrg(@Payload() message: ClaimRequestEventDto): Promise<boolean> {
    this.logger.log(`Processing event received...`);
    const requestObject = plainToClass(ClaimRequestEventDto, message);
    const errors = await validate(requestObject, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      this.logger.log(
        `Event Request received is not a claims creation event... skipping org creation event`,
      );
      return;
    }

    const claim = await this.iamService.getClaimById(requestObject.claimId);

    if (!claim) {
      this.logger.log(`claim ${requestObject.claimId} not found...`);
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

    const owner = this.orgcreatorService.extractAddressFromDID(requester);

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
