# Phase 3: Outbox Pattern Implementation

## Overview

Phase 3 implements the **Outbox pattern** for reliable message delivery, solving the push notification reliability problem where notifications could be lost if the push provider failed after the business transaction committed.

## Architecture Change

### Before (Phase 2)
```
┌─────────────────────────────────────┐
│  Transaction                        │
│  Create Notification → Save         │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│  After Transaction                  │
│  Send Push → (if fails, lost!)     │
└─────────────────────────────────────┘
```

### After (Phase 3)
```
┌─────────────────────────────────────┐
│  Same Transaction (Atomicity)       │
│  Create Notification + Outbox Entry │
└─────────────────────────────────────┘
              ↓
       (Async Worker)
              ↓
┌─────────────────────────────────────┐
│  OutboxWorker                       │
│  1. Fetch PENDING messages          │
│  2. Lock (FOR UPDATE SKIP LOCKED)   │
│  3. Dispatch to Handler             │
│  4. Mark COMPLETED/FAILED           │
│  5. Retry with exponential backoff  │
└─────────────────────────────────────┘
```

## Core Guarantees

| Guarantee | Implementation |
|-----------|---------------|
| Atomicity | Business data + Outbox message in same transaction |
| Reliability | Message persisted to database, won't be lost |
| Idempotency | `idempotencyKey` prevents duplicate processing |
| Concurrency Safety | `SELECT FOR UPDATE SKIP LOCKED` |
| Failure Recovery | Exponential backoff: 1m → 5m → 25m → 2h → 10h |
| Dead Letter | Messages exceeding max retries → DEAD status |

## New Files

### Outbox Module (`src/common/outbox/`)

| File | Lines | Purpose |
|------|-------|---------|
| `ng-outbox.entity.ts` | ~130 | Entity with status/retry/dead letter fields |
| `outbox.service.ts` | ~220 | Enqueue, status management, statistics |
| `outbox.worker.ts` | ~180 | Async consumer with polling |
| `push-notification.handler.ts` | ~130 | Push handler implementation |
| `outbox.module.ts` | ~40 | Module definition |
| `index.ts` | ~15 | Exports |

### Migration
| File | Purpose |
|------|---------|
| `src/migrations/1742654000000-Outbox.ts` | Creates `ng_outbox` table |

## Database Schema

```sql
CREATE TABLE ng_outbox (
  id UUID PRIMARY KEY,
  message_type VARCHAR(50) NOT NULL,     -- PUSH_NOTIFICATION, EMAIL, etc.
  status VARCHAR(20) DEFAULT 'PENDING',  -- PENDING/PROCESSING/COMPLETED/FAILED/DEAD
  payload JSONB NOT NULL,
  aggregate_id VARCHAR(100),
  aggregate_type VARCHAR(50),
  idempotency_key VARCHAR(255) UNIQUE,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_outbox_status_scheduled ON ng_outbox (status, scheduled_at);
CREATE INDEX idx_outbox_type_status ON ng_outbox (message_type, status);
CREATE INDEX idx_outbox_aggregate ON ng_outbox (aggregate_type, aggregate_id);
CREATE INDEX idx_outbox_next_retry ON ng_outbox (status, next_retry_at) WHERE status = 'FAILED';
```

## Message Lifecycle

```
PENDING → (Worker fetch) → PROCESSING
                              ↓
              ┌───────────────┼───────────────┐
              ↓               ↓               ↓
         (success)    (fail-retryable)  (fail-non-retryable)
              ↓               ↓               ↓
         COMPLETED        FAILED           DEAD
                              ↓
                      (wait nextRetryAt)
                              ↓
                          PENDING (retry)
```

## Modified Files

### `src/notifications/notifications.service.ts`
- Added `OutboxService` and `DataSource` injection
- `createParcelNotification()` now uses transaction + Outbox
- New private method `createNotificationWithOutbox()`

### `src/app.module.ts`
- Added `OutboxModule` import

## Usage Example

```typescript
// In any service that needs reliable async processing:
async createSomethingWithNotification() {
  return this.dataSource.transaction(async (manager) => {
    // 1. Business logic
    const entity = await manager.getRepository(MyEntity).save({...});
    
    // 2. Enqueue message (same transaction!)
    await this.outboxService.enqueue({
      messageType: OutboxMessageType.PUSH_NOTIFICATION,
      payload: {
        notificationId: entity.id,
        userId: entity.userId,
        title: 'Something happened',
        body: 'Details here',
      },
      aggregateId: entity.id,
      aggregateType: 'MyEntity',
      idempotencyKey: `push:${entity.id}`,
    }, manager);  // Pass transaction manager!
    
    return entity;
  });
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OUTBOX_WORKER_ENABLED` | Enable/disable worker | `true` |
| `OUTBOX_POLL_INTERVAL_MS` | Polling interval | `5000` |
| `OUTBOX_BATCH_SIZE` | Messages per batch | `10` |
| `OUTBOX_STALE_TIMEOUT_MINUTES` | Timeout for stuck messages | `10` |

## Monitoring

### Statistics Endpoint (Future)
```typescript
// Get queue statistics
const stats = await outboxService.getStats();
// { PENDING: 5, PROCESSING: 2, COMPLETED: 1000, FAILED: 3, DEAD: 1 }

// Get worker statistics
const workerStats = worker.getStats();
// { enabled: true, isRunning: false, handlersCount: 1, messageStats: {...} }
```

### Recommended Alerts
- PENDING messages > 100 (queue buildup)
- FAILED messages > 10 (delivery issues)
- DEAD messages > 0 (needs investigation)
- PROCESSING timeout > 10 minutes (stuck worker)

## Deployment

### Prerequisites
- Phase 1-2 already deployed (InfraModule, PushProviderPort)
- Database access for migration

### Steps

1. **Apply code changes**
```bash
# Extract Phase 3 files to ng-server/src/
unzip phase3-outbox.zip -d ~/ng-server/
```

2. **Verify build**
```bash
cd ~/ng-server
npm run build
```

3. **Run migration**
```bash
# Railway
railway run npm run migration:run

# Local
npm run migration:run
```

4. **Deploy**
```bash
git add .
git commit -m "feat: Phase 3 - Outbox pattern for reliable push"
git push
```

5. **Verify deployment**
- Check logs for: "Starting outbox worker"
- Check logs for: "Registered handler: PUSH_NOTIFICATION"

### Rollback

**Code rollback:**
```bash
git revert HEAD
git push
```

**Migration rollback:**
```bash
railway run npm run migration:revert
```

**Worker-only disable:**
```bash
# Set in Railway environment
OUTBOX_WORKER_ENABLED=false
```

## Multi-Instance Safety

The Outbox worker uses `SELECT FOR UPDATE SKIP LOCKED`, ensuring:
- Multiple instances won't process the same message
- No deadlocks when competing for messages
- Automatic load balancing across instances

---

## Summary: Phase 1-3 Complete

| Phase | Core Improvements |
|-------|------------------|
| Phase 1 | Transaction fix, UseCase pattern, ClockPort/Logger |
| Phase 2 | RequestId tracing, PushProviderPort abstraction |
| Phase 3 | Outbox pattern, reliable message delivery |

Total new infrastructure:
- 2 new modules (InfraModule, OutboxModule)
- 6 new services/workers
- 2 new migrations
- Production-ready push notification pipeline
