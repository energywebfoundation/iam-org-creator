import { Module } from '@nestjs/common';
import { OrgCreatorController } from './orgCreator.controller';
import { OrgCreatorService } from './orgCreator.service';

@Module({
  imports: [],
  controllers: [OrgCreatorController],
  providers: [OrgCreatorService],
  exports: [OrgCreatorService],
})
export class OrgCreatorModule {}
