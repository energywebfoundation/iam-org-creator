# IAM Org Creator Service

## Overview

This repository contains the org-creator service that consumes create claims request allowing users to create an organisation on demand

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

Tools you will need to setup this service

```
npm version 6+
nodejs version 10+
```

## Config

[configuration variables](src/docs/config.md)

## Installation

```bash
$ npm install
```

## Running the app

- Using Docker
  - `docker-compose up` (first time run will perform build)
    - you can force a fresh build with `--build`
    - you can background (run without holding up your CLI) by using `--detach`
- Without Docker

  ```bash
    # development
    $ npm run start

    # watch mode
    $ npm run start:dev

    # production mode
    $ npm run start:prod
  ```

## Publishing Messages

To publish events to the org-creator service to process run this snippet as a ts or js file.

To generate a valid claim token, call the [createPublicClaim](https://github.com/energywebfoundation/iam-client-lib/blob/3a5c4be4e3c45248110abfab340b25d9be55c92d/src/iam.ts#L338) method of the `iam-client-lib` with an object param in this format `{ data: { claimType: mytest.roles.testy.iam , claimTypeVersion: 1.0 }, subject?: 0x7dD6eF77e6f143300C4550220c4eD66690a655fc }`

```javascript
import { connect, Codec, JSONCodec } from 'nats';

const sampleCreateRequestClaim = {
  id: '2952901f-6e22-445b-af6a-fg92f54cf26b',
  token: '<valid_claim_token>',
  claimIssuer: ['did:ethr:0x7dD6eF86e6f143300C4550220c4eD66690a655fc'],
  requester: 'did:ethr:0x39579900f8f50819fd5521a9aC044a1B2a849DC6',
  registrationTypes: ['RegistrationTypes::OffChain'],
};

async function createConnection(successCallback: any, errorCallback: any) {
  const natsServerUrl = 'nats://identityevents-dev-nats.energyweb.org:4222'; // this must be the same as the natsServerUrl of the org creator service ;
  const nc = await connect({ servers: [natsServerUrl] });
  const message = JSONCodec();

  const claimsRequestMessage = message.encode(sampleCreateRequestClaim);

  nc.publish('test.claim.exchange', claimsRequestMessage);
}

function apiFunctionWrapper() {
  return new Promise((resolve, reject) => {
    createConnection(
      (successResponse: any) => {
        resolve(successResponse);
      },
      (errorResponse: any) => {
        reject(errorResponse);
      },
    );
  });
}

(async () => {
  await apiFunctionWrapper();
})();
```

You will get a logged output from the org-creator service with the message `Processing event recieved....`

## Test

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Contributing

Please read [CONTRIBUTING.md](https://gist.github.com/PurpleBooth/b24679402957c63ec426) for details on our code of conduct, and the process for submitting pull requests to us.

## License

This project is licensed under the GNU General Public License v3.0 or later - see the [LICENSE](LICENSE) file for details

## FAQ

Frequently asked questions and their answers will be documented here.
