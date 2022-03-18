export interface IClaimToken {
  did: string;
  claimData: ClaimData;
  signer: string;
  iss: string;
  sub: string;
}

export type ClaimData = {
  fields?: KeyValues[];
  requestorFields?: KeyValues[];
  claimType: string;
  claimTypeVersion: string;
};

export type KeyValues = { key: string; value: string };
