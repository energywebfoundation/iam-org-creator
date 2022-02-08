import { Module } from '@nestjs/common';
import { IamModule } from '../iam/iam.module';
import { SentryModule } from '../sentry/sentry.module';
import { OrgCreatorController } from './orgCreator.controller';
import { OrgCreatorPolling } from './orgCreator.polling';
import { OrgCreatorService } from './orgCreator.service';

@Module({
  imports: [IamModule, SentryModule],
  controllers: [OrgCreatorController],
  providers: [OrgCreatorService, OrgCreatorPolling],
  exports: [OrgCreatorService],
})
export class OrgCreatorModule {}
