import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as dotenv from 'dotenv';
import { AppModule } from './app';
import { natsConfig } from './config';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.connectMicroservice({
    transport: Transport.NATS,
    options: {
      servers: [process.env.NATS_CLIENTS_URL],
      ...natsConfig,
    },
  });

  const configService = app.get(ConfigService);

  await app.startAllMicroservices();
  await app.listen(configService.get('NESTJS_PORT'));
}

bootstrap();
