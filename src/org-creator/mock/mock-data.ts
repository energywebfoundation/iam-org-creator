import { Chance } from 'chance';
import { RegistrationTypes } from 'iam-client-lib';

const chance = new Chance();

export const claimTokenData = {
  fields: [
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
  claimIssuer: [`did:ethr:${chance.hash({ length: 16 })}`],
  requester: `did:ethr:${chance.hash({ length: 16 })}`,
  registrationTypes: [RegistrationTypes.OnChain],
};

export const issueClaimRequest = {
  id: chance.guid({ version: 4 }),
  token: 'qwertytokenvalue',
  requester: `did:ethr:${chance.hash({ length: 16 })}`,
  subjectAgreement: '',
  registrationTypes: [RegistrationTypes.OnChain],
};

export const rejectClaimRequest = {
  id: chance.guid({ version: 4 }),
  claimIssuer: [`did:ethr:${chance.hash({ length: 16 })}`],
  requester: `did:ethr:${chance.hash({ length: 16 })}`,
  isRejected: true,
};
