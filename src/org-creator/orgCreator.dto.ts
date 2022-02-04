import { IsString } from 'class-validator';

export class ClaimRequestEventDto {
  @IsString()
  claimId: string;
}
