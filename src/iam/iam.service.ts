import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IAM,
  MessagingMethod,
  setCacheClientOptions,
  setChainConfig,
  setMessagingOptions,
} from 'iam-client-lib';
import { Logger } from '../logger/logger.service';

@Injectable()
export class IamService extends IAM {
  public _iam: IAM;
  constructor(configService: ConfigService, private readonly logger: Logger) {
    super({
      rpcUrl: configService.get<string>('RPC_URL'),
      privateKey: configService.get<string>('PRIVATE_KEY'),
    });

    const voltaChainId = configService.get<number>('VOLTA_CHAIN_ID');

    // Set Cache Server
    setCacheClientOptions(voltaChainId, {
      url: configService.get<string>('CACHE_SERVER_URL'),
      cacheServerSupportsAuth: true,
    });

    // Set RPC
    setChainConfig(voltaChainId, {
      rpcUrl: configService.get<string>('RPC_URL'),
    });

    // Set Messaging Options
    setMessagingOptions(voltaChainId, {
      messagingMethod: MessagingMethod.Nats,
      natsServerUrl: configService.get<string>('NATS_SERVER_URL'),
    });
  }

  async initializeIAM() {
    const { connected } = await this.initializeConnection({});
    if (connected) {
      this.logger.info('successfully connected..');
    }
  }
}
