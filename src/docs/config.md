# Configuration

<p>Configuration properties from .env file used by Org Creator properties</p>
                               
```
NESTJS_PORT:                                       <PORT to which nest application start listening e.g 9000>
NATS_CLIENTS_URL:                                  <NATS CLIENT emmiting events to this service e.g nats://identityevents-dev-nats.energyweb.org:4222>                           
REQUEST_NEW_ORG_ROLE:                              <Org role that can be used to request org creation e.g mytest.roles.testy.iam.ewc>
VOLTA_CHAIN_ID:                                    <Volta chain id e.g 73799>
RPC_URL:                                           <Volta RPC URL e.g https://volta-rpc.com  >
PRIVATE_KEY:                                       <Private key required for connecting to iam-client-lib >
ORG_NAMESPACE:                                     <Organisation namespace e.g iam.ewc>
CACHE_SERVER_URL:                                  <Cache Server URL used by iam-client-lib to retrieve info e.g https://identitycache-dev.energyweb.org/>
```
