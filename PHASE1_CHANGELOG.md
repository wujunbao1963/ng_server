# Phase 1 重构变更总结

## 变更概览

Phase 1 完成了以下三个核心任务：
1. ✅ 修复 `evidence.service.ts` 事务问题
2. ✅ 提取 `IngestEdgeEventUseCase`
3. ✅ 统一 Logger（替换 console.log）

---

## 新增文件

### 基础设施层 (`src/common/infra/`)

| 文件 | 说明 |
|------|------|
| `clock.port.ts` | 时钟抽象接口，提供 `SystemClock` 和 `MockClock` |
| `unit-of-work.ts` | 事务管理 helper，封装 TypeORM transaction |
| `logger.service.ts` | 统一日志服务，支持结构化日志和上下文追踪 |
| `infra.module.ts` | 全局基础设施模块，提供 DI 配置 |
| `index.ts` | 导出文件 |

### 应用层 (`src/application/`)

| 文件 | 说明 |
|------|------|
| `usecases/ingest-edge-event.usecase.ts` | Edge 事件入库用例 |
| `application.module.ts` | 应用层模块 |
| `index.ts` | 导出文件 |

---

## 修改文件

### `src/app.module.ts`
- 导入 `InfraModule`（全局基础设施）
- 导入 `ApplicationModule`（用例层）
- 重新组织 imports 顺序

### `src/evidence/evidence.service.ts` ⚠️ 关键修复
**修复前问题：**
```typescript
// 分散的 save 操作，不在同一事务中
await this.evidenceRepo.save(evidence);
session.status = 'COMPLETED';
await this.sessionsRepo.save(session);  // 如果失败，evidence 已提交
```

**修复后：**
```typescript
// 使用事务 + 悲观锁保证原子性
const evidence = await this.dataSource.transaction(async (manager) => {
  // 悲观锁获取 session
  const lockedSession = await sessionRepo.findOne({
    where: { id: sessionId },
    lock: { mode: 'pessimistic_write' },
  });
  
  // 保存 evidence
  await evidenceRepo.save(newEvidence);
  
  // 更新 session（同一事务）
  lockedSession.status = 'COMPLETED';
  await sessionRepo.save(lockedSession);
  
  return newEvidence;
});
```

**其他改进：**
- 注入 `ClockPort` 替代 `new Date()`
- 注入 `NgLoggerService` 替代无日志
- `createUploadSession` 也改为事务操作

### `src/edge-events/edge-events.service.ts`
**修复前：**
- 直接包含 ~200 行事件入库逻辑
- 使用 `console.log` / `console.error`
- 通知创建与主业务逻辑耦合

**修复后：**
```typescript
// 委托给 UseCase
async storeSummaryUpsert(payload: EdgeEventSummaryUpsertV77) {
  const { result, notifications } = await this.ingestUseCase.execute(payload);
  
  // 处理副作用
  for (const notif of notifications) {
    await this.dispatchNotification(notif);
  }
  
  return { applied: result.applied, reason: result.reason };
}
```

### `src/edge-events/edge-events.module.ts`
- 导入 `ApplicationModule`

### `src/notifications/notifications.service.ts`
- 注入 `ClockPort` 替代 `new Date()`
- 注入 `NgLoggerService` 替代 `console.log`

---

## 架构改进

### 1. 事务边界清晰化

```
┌─────────────────────────────────────────────────────┐
│                    UseCase                          │
│  ┌───────────────────────────────────────────────┐  │
│  │            Transaction Boundary               │  │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐       │  │
│  │  │ Write 1 │→ │ Write 2 │→ │ Write 3 │       │  │
│  │  └─────────┘  └─────────┘  └─────────┘       │  │
│  └───────────────────────────────────────────────┘  │
│                        ↓                            │
│              Return side-effect requests            │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│              Service (Orchestration)                │
│  Execute side-effects (notifications, etc.)         │
└─────────────────────────────────────────────────────┘
```

### 2. 依赖方向改进

```
修复前:
EdgeEventsService ──→ NotificationsService ──→ (直接写DB)
                      ↑
                      └── 通知逻辑耦合在事件处理中

修复后:
EdgeEventsService ──→ IngestEdgeEventUseCase ──→ (返回通知请求)
         │                      │
         │                      └── 只处理核心业务
         ↓
  dispatchNotification() ──→ NotificationsService
         │
         └── 副作用与主流程分离
```

### 3. 可测试性提升

| 组件 | 测试方式 |
|------|---------|
| `IngestEdgeEventUseCase` | 注入 `MockClock`，验证业务逻辑 |
| `EvidenceService` | 注入 `MockClock`，验证时间戳 |
| `EdgeEventsService` | Mock `IngestEdgeEventUseCase`，验证编排 |

---

## 使用示例

### ClockPort
```typescript
// 生产环境
@Inject(CLOCK_PORT) private readonly clock: ClockPort

const now = this.clock.now();
const expires = this.clock.after(3600); // 1小时后

// 测试环境
const mockClock = new MockClock('2025-01-02T00:00:00Z');
mockClock.advance(60); // 前进60秒
```

### NgLoggerService
```typescript
constructor(logger: NgLoggerService) {
  this.logger = logger.setContext('MyService');
}

this.logger.log('Operation completed', { eventId, circleId });
this.logger.error('Failed to process', error.message, { eventId });
```

### UseCase
```typescript
// UseCase 返回业务结果 + 副作用请求
const { result, notifications } = await this.ingestUseCase.execute(payload);

// Service 负责执行副作用
for (const notif of notifications) {
  await this.notificationsService.createParcelNotification(notif);
}
```

---

## 下一步 (Phase 2)

1. **引入 `RequestIdInterceptor`** - 链路追踪
2. **引入 `PushProviderPort`** - 推送抽象
3. **提取 `CompleteEvidenceUseCase`**
4. **扩展测试覆盖**

---

## 部署注意事项

1. **无数据库变更** - 本次重构不涉及 schema 修改
2. **向后兼容** - API 行为不变
3. **建议灰度** - 先在测试环境验证完整流程
