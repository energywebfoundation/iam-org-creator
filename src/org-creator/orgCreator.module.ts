import { Module } from '@nestjs/common';
import { IamModule } from 'src/iam/iam.module';
import { OrgCreatorController } from './orgCreator.controller';
import { OrgCreatorService } from './orgCreator.service';

@Module({
  imports: [IamModule],
  controllers: [OrgCreatorController],
  providers: [OrgCreatorService],
  exports: [OrgCreatorService],
})
export class OrgCreatorModule {}
