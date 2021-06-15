import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { IamModule } from './iam/iam.module';
import { LoggerModule } from './logger/logger.module';
import { OrgCreatorModule } from './org-creator/orgCreator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    OrgCreatorModule,
    LoggerModule,
    IamModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
