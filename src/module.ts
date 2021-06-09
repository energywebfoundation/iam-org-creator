import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from './logger/logger.module';
import { OrgCreatorModule } from './org-creator/orgCreator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    OrgCreatorModule,
    LoggerModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
