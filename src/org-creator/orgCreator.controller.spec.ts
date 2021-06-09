import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { Chance } from 'chance';
import * as jwt from 'jsonwebtoken';
import { claimTokenData } from './mock/claimTokenData';
import { OrgCreatorController } from './orgCreator.controller';

jest.mock('jsonwebtoken', () => ({
  decode: jest.fn().mockImplementation(() => {
    return {
      payload: {
        claimData: claimTokenData,
      },
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
    if (key === 'PERMITTED_ORG_CREATOR_ROLE') {
      return claimTokenData.claimType;
    }
    return null;
  }),
};

describe('NATS transport', () => {
  let app: INestApplication;
  let controller: OrgCreatorController;
  let config: ConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [OrgCreatorController],
      providers: [
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
        claimIssuer: [chance.string()],
        requester: chance.string(),
      };
      const request = await controller.createOrg(mockClaimRequest);
      expect(jwt.decode).toHaveBeenCalled();
      expect(jwt.decode).toHaveBeenCalledWith(mockClaimRequest.token, {
        complete: true,
      });
      expect(request).toBe(true);
    });

    it(`createOrg() should recieve claim request event and skip processing it `, async () => {
      MockConfigService.get = jest.fn().mockResolvedValueOnce(chance.string());
      const mockClaimRequest = {
        id: chance.string(),
        token: 'qwerty',
        claimIssuer: [chance.string()],
        requester: chance.string(),
      };
      await controller.createOrg(mockClaimRequest);
      expect(MockLogger.log).toHaveBeenCalledTimes(1);
      expect(MockLogger.log).toBeCalledWith(
        `Role found in claim request event is not permitted, exiting org creation process.`,
      );
    });
  });
});
