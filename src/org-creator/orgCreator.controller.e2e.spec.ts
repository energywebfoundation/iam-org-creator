import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientProxy, ClientsModule, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { Chance } from 'chance';
import { NamespaceType } from 'iam-client-lib';
import * as jwt from 'jsonwebtoken';
import { IamService } from '../iam/iam.service';
import { SentryService } from '../sentry/sentry.service';
import { claimTokenData, createClaimRequest } from './mock/mock-data';
import { OrgCreatorController } from './orgCreator.controller';
import { OrgCreatorService } from './orgCreator.service';

const chance = new Chance();

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockImplementation(() => {
    return {
      claimData: claimTokenData,
    };
  }),
}));

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
  getClaimById: jest.fn(),
};

const MockOrgCreatorService = {
  extractAddressFromDID: jest.fn((key: string) => {
    return key.split(':')[2];
  }),
};

describe('OrgCreatorController ', () => {
  let app: INestApplication;
  let client: ClientProxy;
  let config: ConfigService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      imports: [
        ClientsModule.register([
          {
            name: 'NATS_SERVICE',
            transport: Transport.NATS,
            options: {
              url: 'nats://0.0.0.0:4222',
            },
          },
        ]),
      ],
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

        {
          provide: SentryService,
          useValue: jest.fn(),
        },
      ],
    }).compile();

    app = module.createNestApplication();

    app.connectMicroservice({
      transport: Transport.NATS,
      options: {
        url: 'nats://0.0.0.0:4222',
      },
    });

    await app.startAllMicroservicesAsync();
    await app.init();

    client = app.get('NATS_SERVICE');
    await client.connect();

    config = module.get<ConfigService>(ConfigService);
  });

  afterEach(async () => {
    await app?.close();
    await client?.close();
  });

  describe('createOrg Event', () => {
    it(`createOrg() should process createClaimRequest event`, async () => {
      const orgNameSpace = config.get('ORG_NAMESPACE');
      MockIamService.getClaimById.mockResolvedValueOnce(createClaimRequest);
      const response = await client
        .send('request-credential.claim-exchange.a.a', {
          claimId: createClaimRequest.id,
        })
        .toPromise();

      expect(response).toBe(true);
      expect(jwt.decode).toHaveBeenCalledWith(createClaimRequest.token);
      expect(MockIamService.getENSTypesByOwner).toHaveBeenCalledWith({
        type: NamespaceType.Organization,
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
      delete createClaimRequest.claimIssuer;
      expect(MockIamService.issueClaimRequest).toHaveBeenCalledWith({
        ...createClaimRequest,
        ...{ subjectAgreement: '' },
      });
      expect(response).toBe(true);
    }, 30000);

    it(`createOrg() should throw an error if user already has existing org `, async () => {
      MockIamService.getENSTypesByOwner = jest
        .fn()
        .mockResolvedValueOnce([{ name: 'org' }]);
      MockIamService.getClaimById.mockResolvedValueOnce(createClaimRequest);
      expect(
        client
          .send('request-credential.claim-exchange.a.a', createClaimRequest)
          .toPromise(),
      ).rejects.toThrowError('User already has organization created.');
    });

    it(`createOrg() should throw an error if role is not the role for requesting to create a new organization. `, async () => {
      MockConfigService.get = jest.fn().mockResolvedValueOnce(chance.string());
      MockIamService.getClaimById.mockResolvedValueOnce(createClaimRequest);
      expect(
        client
          .send('request-credential.claim-exchange.a.a', createClaimRequest)
          .toPromise(),
      ).rejects.toThrowError(
        'Role found is not the role for requesting to create a new organization.',
      );
    });
  });
});
