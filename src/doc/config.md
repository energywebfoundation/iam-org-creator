# Configuration

<p>Configuration properties from .env file used by Org Creator properties</p>

| Property             | Example value                                     | Additional description                                                              |
| -------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------- |
| NESTJS_PORT          | 9000                                              | Server port                                                                         |
| NATS_CLIENTS_URL     | nats://identityevents-dev-nats.energyweb.org:4222 | NATS URL Server emmiting events to which the service listens to for specific events |
| REQUEST_NEW_ORG_ROLE | mytest.roles.testy.iam.ewc                        | Org role that can be used to request org creation                                   |
| VOLTA_CHAIN_ID       | 73799                                             | Volta chain ID                                                                      |
| RPC_URL              | https://volta-rpc.com                             | Volta RPC URL                                                                       |
| CACHE_SERVER_URL     | https://identitycache-dev.energyweb.org/          | Cache Server URL used by iam-client-lib to retrieve info                            |
| PRIVATE_KEY          |                                                   | Private key required for connecting to iam-client-lib                               |
| ORG_NAMESPACE        | iam.ewc                                           | Organisation namespace in which an organisation can be created                      |
| NATS_SERVER_URL      | https://identityevents-dev.energyweb.org          | NATS server url valued needed for sending messages                                  |
