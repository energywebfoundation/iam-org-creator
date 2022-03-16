import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import {
  HealthModule,
  IamModule,
  LoggerModule,
  OrgCreatorModule,
} from './modules';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ...[HealthModule, IamModule, OrgCreatorModule, LoggerModule],
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
