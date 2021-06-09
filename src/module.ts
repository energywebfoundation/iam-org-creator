import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { OrgCreatorModule } from './org-creator/orgCreator.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    OrgCreatorModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
