import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Chance } from 'chance';
import { ENSNamespaceTypes, RegistrationTypes } from 'iam-client-lib';
import * as jwt from 'jsonwebtoken';
import { IamService } from '../iam/iam.service';
import { claimTokenData } from './mock/claimTokenData';
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
      const mockClaimRequest = {
        id: chance.string(),
        token: 'qwerty',
        claimIssuer: [mockIssuerDID],
        requester: mockRequesterDID,
        registrationTypes: [RegistrationTypes.OnChain],
      };
      const request = await controller.createOrg(mockClaimRequest);
      const orgNameSpace = config.get('ORG_NAMESPACE');

      expect(jwt.decode).toHaveBeenCalledWith(mockClaimRequest.token);
      expect(MockIamService.initializeIAM).toHaveBeenCalled();
      expect(MockIamService.getENSTypesByOwner).toHaveBeenCalledWith({
        type: ENSNamespaceTypes.Organization,
        owner: mockClaimRequest.requester.split(':')[2],
      });
      expect(MockIamService.createOrganization).toHaveBeenCalledWith({
        orgName: claimTokenData.fields[0].value,
        data: {
          orgName: claimTokenData.fields[0].value,
        },
        namespace: orgNameSpace,
      });
      expect(MockIamService.changeOrgOwnership).toHaveBeenCalledWith({
        newOwner: mockRequesterDID.split(':')[2],
        namespace: `${claimTokenData.fields[0].value}.${orgNameSpace}`,
      });
      delete mockClaimRequest.claimIssuer;
      expect(MockIamService.issueClaimRequest).toHaveBeenCalledWith({
        ...mockClaimRequest,
        ...{ subjectAgreement: '' },
      });
      expect(request).toBe(true);
    });

    it(`createOrg() should throw an error if user already has existing org `, async () => {
      const mockClaimRequest = {
        id: chance.string(),
        token: 'qwerty',
        claimIssuer: [mockIssuerDID],
        requester: mockRequesterDID,
        registrationTypes: [RegistrationTypes.OnChain],
      };

      MockIamService.getENSTypesByOwner = jest
        .fn()
        .mockResolvedValueOnce([{ name: 'org' }]);
      const request = await expect(
        controller.createOrg(mockClaimRequest),
      ).rejects.toThrowError(
        'User already has organisation created.. exiting org creation process',
      );

      expect(jwt.decode).toHaveBeenCalled();
      expect(jwt.decode).toHaveBeenCalledWith(mockClaimRequest.token);
      expect(MockIamService.initializeIAM).toHaveBeenCalled();
      expect(MockIamService.getENSTypesByOwner).toHaveBeenCalledWith({
        type: ENSNamespaceTypes.Organization,
        owner: mockClaimRequest.requester.split(':')[2],
      });
    });

    it(`createOrg() should recieve claim request event and skip processing it `, async () => {
      MockConfigService.get = jest.fn().mockResolvedValueOnce(chance.string());
      const mockClaimRequest = {
        id: chance.string(),
        token: 'qwerty',
        claimIssuer: [mockIssuerDID],
        requester: mockRequesterDID,
        registrationTypes: [RegistrationTypes.OnChain],
      };
      await controller.createOrg(mockClaimRequest);
      expect(MockLogger.log).toHaveBeenCalledTimes(1);
      expect(MockLogger.log).toBeCalledWith(
        `Role found in claim request event is not the role that is used to request a new organization, exiting org creation process.`,
      );
    });

    it(`createOrg() should recieve claim request event and skip processing it if both ORG_NAMESPACE and claimType are not available `, async () => {
      delete claimTokenData.claimType;
      MockConfigService.get = jest.fn().mockResolvedValueOnce(null);
      const mockClaimRequest = {
        id: chance.string(),
        token: 'qwerty',
        claimIssuer: [mockIssuerDID],
        requester: mockRequesterDID,
        registrationTypes: [RegistrationTypes.OnChain],
      };
      await controller.createOrg(mockClaimRequest);
      expect(MockLogger.log).toHaveBeenCalledTimes(1);
      expect(MockLogger.log).toBeCalledWith(
        `Role found in claim request event is not the role that is used to request a new organization, exiting org creation process.`,
      );
    });
  });
});
