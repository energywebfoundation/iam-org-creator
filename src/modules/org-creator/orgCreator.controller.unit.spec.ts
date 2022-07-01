import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Chance } from 'chance';
import { NamespaceType } from 'iam-client-lib';
import * as jwt from 'jsonwebtoken';
import { IamService } from '../iam/iam.service';
import { LoggerModule } from '../logger/logger.module';
import { Logger } from '../logger/logger.service';
import { SentryService } from '../sentry/sentry.service';
import { claimTokenData } from './mock/mock-data';
import { createClaimRequest } from './mock/mock-data';
import { OrgCreatorController } from './orgCreator.controller';
import { OrgCreatorService } from './orgCreator.service';

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockImplementation(() => {
    return {
      claimData: claimTokenData,
    };
  }),
}));

const chance = new Chance();
const MockLogger = {
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setContext: jest.fn(),
};
const MockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'REQUEST_NEW_ORG_ROLE') {
      return claimTokenData.claimType;
    }
    if (key === 'ORG_NAMESPACE') {
      return 'iam.ewc';
    }
    return null;
  }),
};

const MockIamService = {
  initializeIAM: jest.fn(),
  getENSTypesByOwner: jest.fn(),
  createOrganization: jest.fn(),
  changeOrgOwnership: jest.fn(),
  issueClaimRequest: jest.fn(),
  getClaimById: jest.fn(),
  rejectClaimRequest: jest.fn(),
};

describe('NATS transport', () => {
  let app: INestApplication;
  let controller: OrgCreatorService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [OrgCreatorController],
      providers: [
        {
          provide: ConfigService,
          useValue: MockConfigService,
        },
        OrgCreatorService,
        {
          provide: IamService,
          useValue: MockIamService,
        },
        {
          provide: Logger,
          useValue: MockLogger,
        },

        {
          provide: SentryService,
          useValue: jest.fn(),
        },
      ],
      imports: [
        LoggerModule,
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<OrgCreatorService>(OrgCreatorService);
    MockIamService.getClaimById.mockResolvedValue(createClaimRequest);
  });

  describe('createOrg() event', () => {
    it(`createOrg() should receive claim request event and process it `, async () => {
      const request = await controller.handler(createClaimRequest.id);
      const orgNameSpace = 'iam.ewc';

      expect(jwt.decode).toHaveBeenCalledWith(createClaimRequest.token);
      expect(MockIamService.getENSTypesByOwner).toHaveBeenCalledWith({
        type: NamespaceType.Organization,
        owner: createClaimRequest.requester.split(':')[3],
      });
      expect(MockIamService.createOrganization).toHaveBeenCalledWith({
        orgName: claimTokenData.requestorFields[0].value,
        data: {
          orgName: claimTokenData.requestorFields[0].value,
        },
        namespace: orgNameSpace,
      });
      expect(MockIamService.changeOrgOwnership).toHaveBeenCalledWith({
        newOwner: createClaimRequest.requester.split(':')[3],
        namespace: `${claimTokenData.requestorFields[0].value}.${orgNameSpace}`,
      });
      expect(MockIamService.issueClaimRequest).toHaveBeenCalled();
      expect(request).toBe(true);
    });

    it(`createOrg() should throw an error when orgName is not valid`, async () => {
      claimTokenData.requestorFields[0].value = 'BAD_ORG_NAME1!';
      await controller.handler(createClaimRequest.id);
      expect(MockLogger.warn).toBeCalledWith(
        `Org name bad_org_name1! is not valid`,
      );
      expect(MockIamService.rejectClaimRequest).toHaveBeenCalled();
      claimTokenData.requestorFields[0].value = 'mctesty';
    });

    it(`createOrg() should throw an error if user already has existing org `, async () => {
      const owner = createClaimRequest.requester.split(':')[3];
      MockIamService.getENSTypesByOwner = jest
        .fn()
        .mockResolvedValueOnce([{ name: 'org' }]);
      await controller.handler(createClaimRequest.id);

      expect(MockLogger.error).toHaveBeenCalledWith(
        `User ${owner} already has an existing organization.`,
      );
      expect(jwt.decode).toHaveBeenCalled();
      expect(jwt.decode).toHaveBeenCalledWith(createClaimRequest.token);
      expect(MockIamService.getENSTypesByOwner).toHaveBeenCalledWith({
        type: NamespaceType.Organization,
        owner,
      });
    });

    it(`createOrg() throw an error when role is not the role for requesting org creation `, async () => {
      MockConfigService.get = jest.fn().mockResolvedValueOnce(chance.string());
      const role = claimTokenData.claimType;

      await controller.handler(createClaimRequest.id);

      expect(MockLogger.error).toHaveBeenCalledTimes(1);
      expect(MockLogger.error).toBeCalledWith(
        `Role found in claim request event ${role} is not the role that is used to request a new organization, exiting org creation process.`,
      );
    });

    it(`createOrg() should throw an error when both ORG_NAMESPACE and claimType are not available `, async () => {
      delete claimTokenData.claimType;
      MockConfigService.get = jest.fn().mockResolvedValueOnce(null);

      await controller.handler(createClaimRequest.id);
      expect(MockLogger.error).toHaveBeenCalledTimes(1);
      expect(MockLogger.error).toBeCalledWith(
        `Role found in claim request event ${claimTokenData?.claimType} is not the role that is used to request a new organization, exiting org creation process.`,
      );
    });
  });
});
