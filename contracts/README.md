# @grahvani/contracts

**Events-Only Package** — The only shared code between microservices.

## Why Only Events?

In proper microservices architecture:
- **Each service owns its own API types** (request/response DTOs)
- **Only event schemas are shared** (for async communication)

This prevents tight coupling and allows independent deployments.

## Usage

```typescript
import { UserRegisteredEvent, EVENT_CHANNELS } from '@grahvani/contracts';

// Publishing
const event: UserRegisteredEvent = {
  type: 'user.registered',
  data: { userId, email, name, tenantId },
  metadata: { eventId, timestamp, source: 'auth-service', version: '1.0' }
};
redis.publish(EVENT_CHANNELS.AUTH, JSON.stringify(event));

// Subscribing
redis.subscribe(EVENT_CHANNELS.AUTH);
redis.on('message', (channel, message) => {
  const event = JSON.parse(message) as GrahvaniEvent;
  // Handle event
});
```

## Event Categories

| Channel | Events |
|---------|--------|
| `grahvani:events:auth` | user.registered, user.login, user.logout |
| `grahvani:events:booking` | booking.created, booking.confirmed |
| `grahvani:events:payment` | payment.completed, payment.failed |
| `grahvani:events:notification` | notification.requested |
