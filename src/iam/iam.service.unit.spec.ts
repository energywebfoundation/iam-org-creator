import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { IAM } from 'iam-client-lib';
import { Logger } from '../logger/logger.service';
import { IamService } from './iam.service';

jest
  .spyOn(IAM.prototype, 'initializeConnection')
  .mockImplementation(async () => {
    return {
      did: 'gjgjjg',
      connected: true,
      userClosedModal: false,
      didDocument: null,
      identityToken: '',
      realtimeExchangeConnected: true,
      accountInfo: undefined,
    };
  });

const MockLogger = {
  info: jest.fn(),
};

const MockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'RPC_URL') {
      return 'http://testrpcurl.com';
    }
    if (key === 'PRIVATE_KEY') {
      return 'qwertyPrivateKey';
    }
    return null;
  }),
};

describe('IamService', () => {
  let service: IamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IamService,
        {
          provide: ConfigService,
          useValue: MockConfigService,
        },
        {
          provide: Logger,
          useValue: MockLogger,
        },
      ],
    }).compile();

    service = module.get<IamService>(IamService);
  });

  it('initializeIAM(), it should initialize IAM connection ', async () => {
    await service.initializeIAM();
    expect(MockLogger.info).toHaveBeenCalledWith('successfully connected..');
  });
});
