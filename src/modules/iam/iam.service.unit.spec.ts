import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '../logger/logger.service';
import { IamService } from './iam.service';

const MockLogger = {
  log: jest.fn(),
  setContext: jest.fn(),
};

let blockchainInUse: boolean;
const blockChainTxMillis = 10;
const blockchainTx = () => {
  expect(blockchainInUse).toBeFalsy();
  blockchainInUse = true;
  return new Promise((resolve) => {
    setTimeout(() => {
      blockchainInUse = false;
      resolve('');
    }, blockChainTxMillis);
  });
};

jest.mock('iam-client-lib', () => ({
  setCacheConfig: jest.fn(),
  setChainConfig: jest.fn(),
  initWithPrivateKeySigner: jest.fn().mockImplementation(() => {
    return {
      connectToCacheServer: jest.fn().mockImplementation(() => {
        return {
          domainsService: {
            changeOrgOwnership: blockchainTx,
            createOrganization: blockchainTx,
          },
          connectToDidRegistry: jest.fn().mockImplementation(() => {
            return {
              claimsService: jest.fn(),
            };
          }),
        };
      }),
    };
  }),
}));

describe('IAM Service', () => {
  let service: IamService;

  beforeEach(async () => {
    blockchainInUse = false;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IamService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        {
          provide: Logger,
          useValue: MockLogger,
        },
      ],
    }).compile();

    service = module.get<IamService>(IamService);
    await service.initializeIAM();
  });

  /**
   * An account can only execute one transaction on a blockchain at a time.
   * Therefore, IAM service methods with update blockchain state should be executed in sequence,
   * even if initiation of the methods is done concurrently
   */
  describe('blockchain non-concurrency', () => {
    it(`should execute concurrent calls to changeOrganizationOwnership in sequence`, async () => {
      const blockchainOperations = ['1', '2'].map((newOwner) => {
        return service.changeOrgOwnership({
          namespace: '',
          newOwner,
        });
      });
      await Promise.all(blockchainOperations);
    });

    it(`should execute concurrent calls to createOrganization in sequence`, async () => {
      const blockchainOperations = ['1', '2'].map((orgName) => {
        return service.createOrganization({
          orgName,
          namespace: '',
          data: undefined,
        });
      });
      await Promise.all(blockchainOperations);
    });

    it(`should execute a call to createOrganization that is concurrent to a changeOrgOwnership in sequence`, async () => {
      const blockchainOperations = [];
      blockchainOperations.push(
        service.createOrganization({
          orgName: 'newOrg',
          namespace: '',
          data: undefined,
        }),
        service.changeOrgOwnership({
          namespace: '',
          newOwner: 'newOwner',
        }),
      );
      await Promise.all(blockchainOperations);
    });
  });
});
