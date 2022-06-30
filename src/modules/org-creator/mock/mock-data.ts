import { Chance } from 'chance';
import { RegistrationTypes } from 'iam-client-lib';

const chance = new Chance();

export const claimTokenData = {
  requestorFields: [
    {
      key: 'orgname',
      value: 'mctesty',
    },
  ],
  claimType: 'test.role.testy.apps.testorg.iam.ewc',
  claimTypeVersion: '1.0.0',
};

export const createClaimRequest = {
  id: chance.guid({ version: 4 }),
  token: 'qwertytokenvalue',
  claimIssuer: [`did:ethr:volta:0x${chance.hash({ length: 40 })}`],
  requester: `did:ethr:volta:0x${chance.hash({ length: 40 })}`,
  registrationTypes: [RegistrationTypes.OnChain],
};

export const issueClaimRequest = {
  id: chance.guid({ version: 4 }),
  token: 'qwertytokenvalue',
  requester: `did:ethr:volta:0x${chance.hash({ length: 40 })}`,
  subjectAgreement: '',
  registrationTypes: [RegistrationTypes.OnChain],
};

export const rejectClaimRequest = {
  id: chance.guid({ version: 4 }),
  claimIssuer: [`did:ethr:volta:0x${chance.hash({ length: 40 })}`],
  requester: `did:ethr:volta:0x${chance.hash({ length: 40 })}`,
  isRejected: true,
};
