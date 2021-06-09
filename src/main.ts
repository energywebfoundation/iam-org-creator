import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import * as dotenv from 'dotenv';
import { AppModule } from './module';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.NATS,
      options: {
        url: process.env.NATS_CLIENTS_URL,
      },
    },
  );

  const configService = app.get(ConfigService);
  app.listen(() =>
    Logger.log(
      `IamOrgCreator Service is now listening to NATS events on port: ${configService.get(
        'NESTJS_PORT',
      )}`,
    ),
  );
}

bootstrap();
