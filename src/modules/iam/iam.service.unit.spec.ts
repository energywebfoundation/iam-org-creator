import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '../logger/logger.service';
import { IamService } from './iam.service';

const MockLogger = {
  log: jest.fn(),
  setContext: jest.fn(),
};

const domainsService = {
  changeOrgOwnership: jest.fn(),
  createOrganization: jest.fn(),
};

jest.mock('iam-client-lib', () => ({
  setCacheConfig: jest.fn(),
  setChainConfig: jest.fn(),
  initWithPrivateKeySigner: jest.fn().mockImplementation(() => {
    return {
      connectToCacheServer: jest.fn().mockImplementation(() => {
        return {
          domainsService,
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
   * An account can only execute one transaction on a blockchain at a time.
   * Therefore, IAM service methods with update blockchain state should be executed in sequence,
   * even if initiation of the methods is done concurrently
   */
  describe('blockchain non-concurrency', () => {
    let blockchainInUse: boolean;
    const blockChainTxDurationMillis = 10;
    const blockchainTx = () => {
      expect(blockchainInUse).toBeFalsy();
      blockchainInUse = true;
      return new Promise((resolve) => {
        setTimeout(() => {
          blockchainInUse = false;
          resolve('');
        }, blockChainTxDurationMillis);
      });
    };
    const txFailedError = new Error('failed from timeout');
    const failedBlockchainTx = () => {
      expect(blockchainInUse).toBeFalsy();
      blockchainInUse = true;
      return new Promise((_, reject) => {
        setTimeout(() => {
          blockchainInUse = false;
          reject(txFailedError);
        }, blockChainTxDurationMillis);
      });
    };

    beforeEach(() => {
      blockchainInUse = false;
      domainsService.changeOrgOwnership.mockImplementation(blockchainTx);
      domainsService.createOrganization.mockImplementation(blockchainTx);
    });

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

    it(`should execute in sequences calls to createOrganization and changeOrgOwnership`, async () => {
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

    it(`should be able to acquire lock if execution of lock holder fails`, async () => {
      domainsService.createOrganization.mockImplementation(failedBlockchainTx);
      const failingTx = service.createOrganization({
        orgName: 'newOrg',
        namespace: '',
        data: undefined,
      });
      const successfulTx = service.changeOrgOwnership({
        namespace: '',
        newOwner: 'newOwner',
      });
      await expect(failingTx).rejects.toThrow(txFailedError);
      await expect(successfulTx).resolves.toBe(undefined);
    });
  });
});
