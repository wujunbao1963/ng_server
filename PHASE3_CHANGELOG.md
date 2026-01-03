# Phase 3 重构变更总结

## 变更概览

Phase 3 完成了 Outbox 模式的完整实现：
1. ✅ Outbox Entity 和 Migration
2. ✅ OutboxService - 消息入队和管理
3. ✅ OutboxWorker - 异步消息消费
4. ✅ PushNotificationHandler - 推送处理器
5. ✅ NotificationsService 集成 Outbox
6. ✅ 单元测试和集成测试

---

## 架构设计

### Outbox 模式解决的问题

**修复前（Phase 2）：**
```
┌─────────────────┐
│ Business Logic  │
│  (同步执行)      │
└────────┬────────┘
         │ 直接调用
         ↓
┌─────────────────┐
│  Push Provider  │  ← 如果失败，业务已提交
└─────────────────┘     推送丢失
```

**修复后（Phase 3）：**
```
┌─────────────────────────────────────────────────────┐
│              同一事务 (Atomicity)                    │
│  ┌─────────────────┐    ┌─────────────────┐        │
│  │ Business Logic  │ →  │  Outbox Entry   │        │
│  │  (Notification) │    │   (Message)     │        │
│  └─────────────────┘    └─────────────────┘        │
└─────────────────────────────────────────────────────┘
                              ↓
                     (异步轮询)
                              ↓
┌─────────────────────────────────────────────────────┐
│                  Outbox Worker                       │
│  1. Fetch PENDING messages                          │
│  2. Lock with FOR UPDATE SKIP LOCKED                │
│  3. Dispatch to Handler                             │
│  4. Mark COMPLETED/FAILED                           │
│  5. Retry with exponential backoff                  │
└─────────────────────────────────────────────────────┘
```

### 核心保证

| 保证 | 实现方式 |
|------|---------|
| **原子性** | 业务数据和 Outbox 消息在同一事务 |
| **可靠性** | 消息持久化到数据库，不会丢失 |
| **幂等性** | idempotencyKey 防止重复处理 |
| **并发安全** | SELECT FOR UPDATE SKIP LOCKED |
| **失败恢复** | 指数退避重试 (1m, 5m, 25m, 2h, 10h) |
| **死信处理** | 超过最大重试次数移入 DEAD 状态 |

---

## 新增文件

### Outbox 模块 (`src/common/outbox/`)

| 文件 | 说明 | 行数 |
|------|------|------|
| `ng-outbox.entity.ts` | Outbox 实体定义 | ~120 |
| `outbox.service.ts` | 入队和状态管理 | ~220 |
| `outbox.worker.ts` | 异步消费者 | ~180 |
| `push-notification.handler.ts` | 推送处理器 | ~130 |
| `outbox.module.ts` | 模块定义 | ~40 |
| `index.ts` | 导出文件 | ~15 |

### 数据库迁移

| 文件 | 说明 |
|------|------|
| `1742654000000-Outbox.ts` | 创建 ng_outbox 表 |

### 测试 (`test/outbox/`)

| 文件 | 说明 |
|------|------|
| `outbox.service.spec.ts` | OutboxService 单元测试 |
| `outbox.worker.spec.ts` | OutboxWorker 集成测试 |

---

## 数据库表设计

### ng_outbox

```sql
CREATE TABLE ng_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 消息元数据
  message_type VARCHAR(50) NOT NULL,     -- PUSH_NOTIFICATION, EMAIL_NOTIFICATION, etc.
  status VARCHAR(20) DEFAULT 'PENDING',   -- PENDING, PROCESSING, COMPLETED, FAILED, DEAD
  payload JSONB NOT NULL,                 -- 消息载荷
  
  -- 聚合关联
  aggregate_id VARCHAR(100),              -- 关联的业务实体 ID
  aggregate_type VARCHAR(50),             -- 实体类型
  idempotency_key VARCHAR(255) UNIQUE,    -- 幂等键
  
  -- 调度
  scheduled_at TIMESTAMPTZ DEFAULT NOW(), -- 计划执行时间
  
  -- 重试
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 5,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  
  -- 处理状态
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_ms INT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_outbox_status_scheduled ON ng_outbox (status, scheduled_at);
CREATE INDEX idx_outbox_type_status ON ng_outbox (message_type, status);
CREATE INDEX idx_outbox_aggregate ON ng_outbox (aggregate_type, aggregate_id);
CREATE INDEX idx_outbox_next_retry ON ng_outbox (status, next_retry_at) WHERE status = 'FAILED';
```

---

## 使用方式

### 1. 在事务中入队消息

```typescript
// NotificationsService.createParcelNotification()
const notification = await this.dataSource.transaction(async (manager) => {
  // 1. 创建通知
  const notification = await this.createNotification(manager, {...});
  
  // 2. 入队推送消息（同一事务）
  await this.outboxService.enqueue({
    messageType: 'PUSH_NOTIFICATION',
    payload: {
      notificationId: notification.id,
      userId: notification.userId,
      title: notification.title,
      body: notification.body,
    },
    aggregateId: notification.id,
    aggregateType: 'Notification',
    idempotencyKey: `push:${notification.id}`,
  }, manager);
  
  return notification;
});
```

### 2. 创建自定义 Handler

```typescript
@Injectable()
export class EmailNotificationHandler implements OutboxHandler {
  readonly messageType: OutboxMessageType = 'EMAIL_NOTIFICATION';
  
  async handle(message: NgOutbox): Promise<ProcessResult> {
    const payload = message.payload as EmailPayload;
    
    try {
      await this.emailService.send(payload);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        retryable: this.isRetryable(error),
      };
    }
  }
}

// 注册到 OutboxModule
{
  provide: OUTBOX_HANDLERS,
  useFactory: (pushHandler, emailHandler) => [pushHandler, emailHandler],
  inject: [PushNotificationHandler, EmailNotificationHandler],
}
```

### 3. 延迟消息

```typescript
// 5分钟后发送
await outboxService.enqueue({
  messageType: 'PUSH_NOTIFICATION',
  payload: {...},
  delaySeconds: 5 * 60,
});
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OUTBOX_WORKER_ENABLED` | 是否启用 Worker | `true` |
| `OUTBOX_POLL_INTERVAL_MS` | 轮询间隔 (毫秒) | `5000` |
| `OUTBOX_BATCH_SIZE` | 每次获取消息数量 | `10` |
| `OUTBOX_STALE_TIMEOUT_MINUTES` | 超时重置时间 | `10` |

---

## 消息生命周期

```
                     ┌─────────────┐
                     │   PENDING   │
                     └──────┬──────┘
                            │
                     (Worker 获取)
                            │
                            ▼
                     ┌─────────────┐
                     │  PROCESSING │
                     └──────┬──────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
         (成功)         (失败-可重试)   (失败-不可重试)
              │             │             │
              ▼             ▼             ▼
       ┌───────────┐ ┌───────────┐ ┌───────────┐
       │ COMPLETED │ │  FAILED   │ │   DEAD    │
       └───────────┘ └─────┬─────┘ └───────────┘
                           │
                    (等待 nextRetryAt)
                           │
                           ▼
                     ┌─────────────┐
                     │   PENDING   │ (重新入队)
                     └─────────────┘
```

---

## 重试策略

使用指数退避算法：

| 重试次数 | 等待时间 |
|---------|---------|
| 1 | 1 分钟 |
| 2 | 5 分钟 |
| 3 | 25 分钟 |
| 4 | 2 小时 5 分钟 |
| 5 | 10 小时 25 分钟 |
| 6+ | 移入 DEAD |

---

## 监控

### 获取统计信息

```typescript
const stats = await outboxService.getStats();
// {
//   PENDING: 5,
//   PROCESSING: 2,
//   COMPLETED: 1000,
//   FAILED: 3,
//   DEAD: 1
// }

const workerStats = await worker.getStats();
// {
//   enabled: true,
//   isRunning: false,
//   handlersCount: 1,
//   messageStats: {...}
// }
```

### 推荐告警

| 指标 | 告警阈值 |
|------|---------|
| PENDING 消息积压 | > 100 |
| FAILED 消息数量 | > 10 |
| DEAD 消息数量 | > 0 |
| PROCESSING 超时 | > 10 分钟 |

---

## 维护任务

Worker 自动执行以下维护任务：

1. **重置超时消息** (每 10 分钟)
   - 将 PROCESSING 超过 10 分钟的消息重置为 PENDING

2. **清理已完成消息** (每小时)
   - 删除 COMPLETED 超过 7 天的消息

---

## 修改的现有文件

### `src/notifications/notifications.service.ts`
- 移除 `PushProviderPort` 直接注入
- 添加 `OutboxService` 注入
- `createParcelNotification()` 使用事务 + Outbox
- 新增 `createNotificationWithOutbox()` 方法
- 删除 `sendPushNotification()` 方法（由 Handler 处理）

### `src/app.module.ts`
- 添加 `OutboxModule` 导入

---

## 部署注意事项

### 1. 数据库迁移

```bash
npm run migration:run
```

### 2. 环境变量

```bash
# 开发环境
OUTBOX_WORKER_ENABLED=true
OUTBOX_POLL_INTERVAL_MS=5000
PUSH_PROVIDER_MODE=mock

# 生产环境
OUTBOX_WORKER_ENABLED=true
OUTBOX_POLL_INTERVAL_MS=1000
PUSH_PROVIDER_MODE=fcm
```

### 3. 多实例部署

Worker 使用 `SELECT FOR UPDATE SKIP LOCKED` 保证并发安全，可以在多个实例上同时运行。

### 4. 回滚计划

如果需要回滚，通知仍会创建，但推送不会发送。可以通过以下步骤恢复：

```sql
-- 查找未处理的推送
SELECT * FROM ng_outbox 
WHERE message_type = 'PUSH_NOTIFICATION' 
AND status IN ('PENDING', 'FAILED');

-- 重置 FAILED 消息
UPDATE ng_outbox SET status = 'PENDING', retry_count = 0 
WHERE status = 'FAILED';
```

---

## 测试

### 运行测试

```bash
npm run test -- test/outbox/
```

### 测试覆盖

- ✅ OutboxService.enqueue() - 正常入队
- ✅ OutboxService.enqueue() - 延迟消息
- ✅ OutboxService.markCompleted() - 成功标记
- ✅ OutboxService.markFailed() - 重试逻辑
- ✅ OutboxService.markFailed() - 死信移入
- ✅ OutboxWorker - 消息处理流程
- ✅ OutboxWorker - 失败重试
- ✅ OutboxWorker - 非重试错误

---

## 下一步优化建议

1. **添加监控仪表板** - Grafana Dashboard 显示 Outbox 状态
2. **死信队列处理** - 自动通知运维人员
3. **消息优先级** - 支持高优先级消息优先处理
4. **分区处理** - 按消息类型分配不同的 Worker 池
5. **批量处理优化** - 合并相同类型的推送请求
