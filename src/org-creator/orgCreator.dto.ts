import { IsOptional, IsString } from 'class-validator';
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

  @IsOptional()
  @IsString()
  subjectAgreement: string;
}
