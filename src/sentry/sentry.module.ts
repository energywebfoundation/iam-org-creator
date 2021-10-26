import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SentryErrorInterceptor } from './sentry-error-interceptor';
import { SentryService } from './sentry.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SentryService, SentryErrorInterceptor],
  exports: [SentryService, SentryErrorInterceptor],
})
export class SentryModule {}
