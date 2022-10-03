import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '../logger/logger.service';
import { IamService } from './iam.service';

let blockchainInUse: boolean;

const MockLogger = {
  log: jest.fn(),
  setContext: jest.fn(),
};

jest.mock('iam-client-lib', () => ({
  setCacheConfig: jest.fn(),
  setChainConfig: jest.fn(),
  initWithPrivateKeySigner: jest.fn().mockImplementation(() => {
    return {
      connectToCacheServer: jest.fn().mockImplementation(() => {
        return {
          domainsService: {
            changeOrgOwnership: () => {
              expect(blockchainInUse).toBeFalsy();
              blockchainInUse = true;
              return new Promise((resolve) => {
                setTimeout(() => {
                  blockchainInUse = false;
                  resolve('');
                }, 100);
              });
            },
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

  describe('blockchain concurrency', () => {
    it(`concurrent calls to createOrganization should be handled in sequence`, async () => {
      blockchainInUse = false;
      const blockchainOperations = [];
      blockchainOperations.push(
        service.changeOrgOwnership({
          namespace: '',
          newOwner: 'owner1',
        }),
      );
      blockchainOperations.push(
        service.changeOrgOwnership({
          namespace: '',
          newOwner: 'owner2',
        }),
      );
      await Promise.all(blockchainOperations);
      expect(true).toBeTruthy();
    });
  });
});
