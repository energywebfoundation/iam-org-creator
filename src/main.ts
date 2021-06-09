import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { AppModule } from './module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(AppModule, {
    transport: Transport.NATS,
    options: {
      url: 'nats://volta-identityevents-nats.energyweb.org:4222',
    },
  });
  app.listen(() => console.log('IamOrgCreator Service is now listening to NATS events..'));
}
bootstrap();