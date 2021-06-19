import { IsString } from 'class-validator';
import { RegistrationTypes } from 'iam-client-lib';

export class ClaimRequestEventDto {
  @IsString()
  id: string;

  @IsString()
  token: string;

  @IsString({ each: true })
  claimIssuer: string[];

  @IsString()
  requester: string;

  @IsString({ each: true })
  registrationTypes: RegistrationTypes[];

  // constructor(claimRequest: Partial<ClaimRequestEventDto>) {
  //   Object.assign(this, claimRequest);
  // }
}
