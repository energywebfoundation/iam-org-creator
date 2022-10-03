import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '../logger/logger.service';
import { IamService } from './iam.service';

let blockchainInUse: boolean;

const MockLogger = {
  log: jest.fn(),
  setContext: jest.fn(),
};

const blockchainTx = () => {
  expect(blockchainInUse).toBeFalsy();
  blockchainInUse = true;
  return new Promise((resolve) => {
    setTimeout(() => {
      blockchainInUse = false;
      resolve('');
    }, 100);
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
   * An account can only do a transaction on a blockchain at a time.
   * Therefore, IAM service methods with update blockchain state should be executed in sequence,
   * even if initiation of the methods is done concurrently
   */
  describe('blockchain non-concurrency', () => {
    it(`concurrent calls to changeOrganizationOwnership should be handled in sequence`, async () => {
      blockchainInUse = false;
      const blockchainOperations = ['1', '2'].map((newOwner) => {
        return service.changeOrgOwnership({
          namespace: '',
          newOwner,
        });
      });
      await Promise.all(blockchainOperations);
    });

    it(`concurrent calls to createOrganization should be handled in sequence`, async () => {
      blockchainInUse = false;
      const blockchainOperations = ['1', '2'].map((orgName) => {
        return service.createOrganization({
          orgName,
          namespace: '',
          data: undefined,
        });
      });
      await Promise.all(blockchainOperations);
    });
  });
});
