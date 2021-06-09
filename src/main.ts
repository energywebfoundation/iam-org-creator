import { NestFactory } from '@nestjs/core';
import { Transport,MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './module';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';
dotenv.config();

async function bootstrap() {  
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.NATS,
    options: {
      url: process.env.NATS_CLIENTS_URL,
    },
  });

  const configService = app.get(ConfigService);
  app.listen(() => console.log(`IamOrgCreator Service is now listening to NATS events on port: ${configService.get('NESTJS_PORT')}`));
}

bootstrap();