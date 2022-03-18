import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { IAMHealthIndicator } from './indicators';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [IAMHealthIndicator],
})
export class HealthModule {}
