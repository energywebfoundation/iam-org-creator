import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Chance } from 'chance';
import { ENSNamespaceTypes, RegistrationTypes } from 'iam-client-lib';
import * as jwt from 'jsonwebtoken';
import { IamService } from '../iam/iam.service';
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
};

const MockOrgCreatorService = {
  extractAddressFromDID: jest.fn((key: string) => {
    return key.split(':')[2];
  }),
};

const mockIssuerDID = 'did:ethr:1234567890987654';
const mockRequesterDID = 'did:ethr:1234567890988754';

describe('NATS transport', () => {
  let app: INestApplication;
  let controller: OrgCreatorController;
  let config: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [OrgCreatorController],
      providers: [
        {
          provide: ConfigService,
          useValue: MockConfigService,
        },
        {
          provide: OrgCreatorService,
          useValue: MockOrgCreatorService,
        },
        {
          provide: IamService,
          useValue: MockIamService,
        },
        {
          provide: Logger,
          useValue: MockLogger,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<OrgCreatorController>(OrgCreatorController);
    config = module.get<ConfigService>(ConfigService);
  });

  describe('createOrg() event', () => {
    it(`createOrg() should recieve claim request event and process it `, async () => {
      const request = await controller.createOrg(createClaimRequest);
      const orgNameSpace = config.get('ORG_NAMESPACE');

      expect(jwt.decode).toHaveBeenCalledWith(createClaimRequest.token);
      expect(MockIamService.initializeIAM).toHaveBeenCalled();
      expect(MockIamService.getENSTypesByOwner).toHaveBeenCalledWith({
        type: ENSNamespaceTypes.Organization,
        owner: createClaimRequest.requester.split(':')[2],
      });
      expect(MockIamService.createOrganization).toHaveBeenCalledWith({
        orgName: claimTokenData.fields[0].value,
        data: {
          orgName: claimTokenData.fields[0].value,
        },
        namespace: orgNameSpace,
      });
      expect(MockIamService.changeOrgOwnership).toHaveBeenCalledWith({
        newOwner: createClaimRequest.requester.split(':')[2],
        namespace: `${claimTokenData.fields[0].value}.${orgNameSpace}`,
      });
      expect(MockIamService.issueClaimRequest).toHaveBeenCalled();
      expect(request).toBe(true);
    });

    it(`createOrg() should throw an error if user already has existing org `, async () => {
      MockIamService.getENSTypesByOwner = jest
        .fn()
        .mockResolvedValueOnce([{ name: 'org' }]);
      await expect(
        controller.createOrg(createClaimRequest),
      ).rejects.toThrowError('User already has organisation created.');

      expect(jwt.decode).toHaveBeenCalled();
      expect(jwt.decode).toHaveBeenCalledWith(createClaimRequest.token);
      expect(MockIamService.initializeIAM).toHaveBeenCalled();
      expect(MockIamService.getENSTypesByOwner).toHaveBeenCalledWith({
        type: ENSNamespaceTypes.Organization,
        owner: createClaimRequest.requester.split(':')[2],
      });
    });

    it(`createOrg() throw an error when role is not the role for requesting org creation `, async () => {
      MockConfigService.get = jest.fn().mockResolvedValueOnce(chance.string());

      await expect(
        controller.createOrg(createClaimRequest),
      ).rejects.toThrowError(
        'Role found is not the role for requesting to create a new organisation',
      );
      expect(MockLogger.error).toHaveBeenCalledTimes(1);
      expect(MockLogger.error).toBeCalledWith(
        `Role found in claim request event is not the role that is used to request a new organization, exiting org creation process.`,
      );
    });

    it(`createOrg() should throw an error when both ORG_NAMESPACE and claimType are not available `, async () => {
      delete claimTokenData.claimType;
      MockConfigService.get = jest.fn().mockResolvedValueOnce(null);

      await expect(
        controller.createOrg(createClaimRequest),
      ).rejects.toThrowError(
        'Role found is not the role for requesting to create a new organisation',
      );
      expect(MockLogger.error).toHaveBeenCalledTimes(1);
      expect(MockLogger.error).toBeCalledWith(
        `Role found in claim request event is not the role that is used to request a new organization, exiting org creation process.`,
      );
    });
  });
});
