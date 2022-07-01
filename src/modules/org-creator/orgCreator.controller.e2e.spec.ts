import { INestApplication } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientProxy, ClientsModule, Transport } from '@nestjs/microservices';
import { Test } from '@nestjs/testing';
import { Chance } from 'chance';
import { NamespaceType } from 'iam-client-lib';
import * as jwt from 'jsonwebtoken';
import { IamService } from '../iam/iam.service';
import { LoggerModule } from '../logger/logger.module';
import { Logger } from '../logger/logger.service';
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
  rejectClaimRequest: jest.fn(),
};

describe('OrgCreatorController ', () => {
  let app: INestApplication;
  let client: ClientProxy;

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
    }).compile();

    app = module.createNestApplication();

    app.connectMicroservice({
      transport: Transport.NATS,
      options: {
        servers: ['nats://0.0.0.0:4222'],
      },
    });

    await app.startAllMicroservices();
    await app.init();

    client = app.get('NATS_SERVICE');
    await client.connect();
  });

  afterEach(async () => {
    await app?.close();
    await client?.close();
  });

  describe('createOrg Event', () => {
    it(`createOrg() should process createClaimRequest event`, async () => {
      const orgNameSpace = 'iam.ewc';
      MockIamService.getClaimById.mockResolvedValueOnce(createClaimRequest);
      const response = await client
        .send('request-credential.claim-exchange.a.a', {
          claimId: createClaimRequest.id,
          type: 'createClaimRequest',
        })
        .toPromise();

      expect(response).toBe(true);
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
      delete createClaimRequest.claimIssuer;
      expect(MockIamService.issueClaimRequest).toHaveBeenCalledWith({
        ...createClaimRequest,
        ...{ subjectAgreement: undefined, publishOnChain: false },
      });
      expect(response).toBe(true);
    }, 30000);

    it(`createOrg() should throw an error if user already has existing org `, async () => {
      MockIamService.getENSTypesByOwner = jest
        .fn()
        .mockResolvedValueOnce([{ name: 'org' }]);
      MockIamService.getClaimById.mockResolvedValueOnce(createClaimRequest);
      await client
        .send('request-credential.claim-exchange.a.a', {
          claimId: createClaimRequest.id,
          type: 'createClaimRequest',
        })
        .toPromise();
      expect(MockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('already has an existing organization.'),
      );
    });

    it(`createOrg() should throw an error if role is not the role for requesting to create a new organization. `, async () => {
      MockConfigService.get = jest.fn().mockResolvedValueOnce(chance.string());
      MockIamService.getClaimById.mockResolvedValueOnce(createClaimRequest);
      await client
        .send('request-credential.claim-exchange.a.a', {
          claimId: createClaimRequest.id,
          type: 'createClaimRequest',
        })
        .toPromise();
      expect(MockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'is not the role that is used to request a new organization',
        ),
      );
    });
  });
});
