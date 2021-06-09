import { IsString } from 'class-validator';
export class OrgCreatorEventDto {
  @IsString()
  id: string;

  @IsString()
  token: string;

  @IsString({ each: true })
  claimIssuer: string[];

  @IsString()
  requester: string;
}
