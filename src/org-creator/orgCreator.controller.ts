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
import { ENSNamespaceTypes } from 'iam-client-lib';
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
    this.logger.log(`Processing event recieved...`);
    const requestObject = plainToClass(ClaimRequestEventDto, message);
    const errors = await validate(requestObject, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    if (errors.length > 0) {
      this.logger.log(
        `Event Request recieved is not a claims creation event... skipping org creation event`,
      );
      return;
    }
    const { token, requester, id, registrationTypes } = message;

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
        `Role found ${claimData?.claimType} is not the role for requesting to create a new organisation.`,
      );
    }

    await this.iamService.initializeIAM();

    this.logger.log('starting userHasOrgCheck validation');
    const userHasOrgCheck = await this.iamService.getENSTypesByOwner({
      type: ENSNamespaceTypes.Organization,
      owner,
    });

    const orgName = claimData?.fields.find((x) => x.key === 'orgname').value;

    if (userHasOrgCheck?.length > 0) {
      this.logger.error(`User ${owner} already has an existing organisation.`);
      throw new BadRequestException(
        `User ${owner} already has organisation created.`,
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
