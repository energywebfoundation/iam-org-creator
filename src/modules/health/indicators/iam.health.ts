import { Injectable } from '@nestjs/common';
import {
  HealthCheckError,
  HealthIndicator,
  HealthIndicatorResult,
} from '@nestjs/terminus';
import { IamService } from '../../iam/iam.service';

@Injectable()
export class IAMHealthIndicator extends HealthIndicator {
  constructor(private readonly iamService: IamService) {
    super();
  }

  async pingCheck(key: string): Promise<HealthIndicatorResult> {
    try {
      const isHealth = await this.iamService.healthCheck();

      if (isHealth) {
        return this.getStatus(key, true);
      }

      throw new Error();
    } catch (error) {
      throw new HealthCheckError(
        `IAM health check failed`,
        this.getStatus(key, false),
      );
    }
  }
}
