import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '../logger/logger.service';
import { OrgCreatorService } from './orgCreator.service';

const MockLogger = {
  log: jest.fn(),
  setContext: jest.fn(),
};

describe('OrgCreatorService', () => {
  let service: OrgCreatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgCreatorService,
        {
          provide: ConfigService,
          useValue: {},
        },
        {
          provide: Logger,
          useValue: MockLogger,
        },
      ],
    }).compile();

    service = module.get<OrgCreatorService>(OrgCreatorService);
  });

  it('extractAddressFromDID(), should extract string from DIDString', () => {
    const mockDidString = 'did:ethr:0x39579900f9d60819fd5521a9aC044a1B2a849DC6';
    expect(service.extractAddressFromDID(mockDidString)).toBe(
      mockDidString.split(':')[2],
    );
  });
});
