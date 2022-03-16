import { NatsOptions } from '@nestjs/microservices';

// `servers` and `queue` is injected at module level
export const natsConfig: Omit<NatsOptions['options'], 'servers' | 'queue'> = {
  pingInterval: 5000,
  maxReconnectAttempts: -1,
};
