import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DIDAttribute,
  IAM,
  MessagingMethod,
  SafeIam,
  setCacheClientOptions,
  setChainConfig,
  setMessagingOptions,
  WalletProvider,
} from 'iam-client-lib';

@Injectable()
export class IamService extends IAM {
  public _iam: IAM;
  private rpcUrl;
  private privateKey;
  constructor(configService: ConfigService) {
    super({
      rpcUrl: configService.get<string>('RPC_URL'),
      privateKey: configService.get<string>('PRIVATE_KEY'),
    });
    this.rpcUrl = configService.get<string>('RPC_URL');
    this.privateKey = configService.get<string>('PRIVATE_KEY');
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
    const { did, connected } = await this.initializeConnection({});
    console.log(true);
  }
}
