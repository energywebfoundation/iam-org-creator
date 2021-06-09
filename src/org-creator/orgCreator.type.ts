export interface IClaimToken {
  did: string;
  claimData: ClaimData;
  signer: string;
  iss: string;
  sub: string;
}

export type ClaimData = { claimType: string; claimTypeVersion: string };
