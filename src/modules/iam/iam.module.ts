import { Global, Module } from '@nestjs/common';
import { IamService } from './iam.service';

@Global()
@Module({
  providers: [IamService],
  exports: [IamService],
})
export class IamModule {}
