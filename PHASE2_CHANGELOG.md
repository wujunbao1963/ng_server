# Phase 2 重构变更总结

## 变更概览

Phase 2 完成了以下核心任务：
1. ✅ 实现 `RequestIdInterceptor` - 请求链路追踪
2. ✅ 实现 `PushProviderPort` - 推送服务抽象
3. ✅ 提取 `CompleteEvidenceUseCase` 和 `CreateUploadSessionUseCase`
4. ✅ 集成推送功能到 `NotificationsService`

---

## 新增文件

### 基础设施层 (`src/common/infra/`)

| 文件 | 说明 |
|------|------|
| `request-id.interceptor.ts` | 请求链路追踪，支持 AsyncLocalStorage |
| `push-provider.port.ts` | 推送服务抽象，含 Mock 和 FCM 实现 |

### 应用层 (`src/application/usecases/`)

| 文件 | 说明 |
|------|------|
| `complete-evidence.usecase.ts` | 证据完成用例 |
| `create-upload-session.usecase.ts` | 上传 Session 创建用例 |

---

## 修改文件

### `src/common/infra/infra.module.ts`
- 添加 `PushProviderPort` 工厂（根据环境变量选择 Mock/FCM）
- 注册 `RequestIdInterceptor` 为全局拦截器

### `src/common/infra/index.ts`
- 导出新增的组件

### `src/application/application.module.ts`
- 添加 `CompleteEvidenceUseCase` 和 `CreateUploadSessionUseCase`
- 扩展 TypeORM entities 导入

### `src/application/index.ts`
- 导出新增的 UseCases 和类型

### `src/evidence/evidence.service.ts` ⚠️ 重大重构
**修复前：**
- 300+ 行代码，包含所有业务逻辑
- 直接操作数据库

**修复后：**
```typescript
@Injectable()
export class EvidenceService {
  constructor(
    private readonly createUploadSessionUseCase: CreateUploadSessionUseCase,
    private readonly completeEvidenceUseCase: CompleteEvidenceUseCase,
    // ...
  ) {}

  async createUploadSession(...) {
    // 1) 委托给 UseCase
    const { result, presignRequests } = await this.createUploadSessionUseCase.execute(...);
    // 2) 生成预签名 URL（外部服务）
    // 3) 返回响应
  }

  async completeEvidence(...) {
    // 委托给 UseCase
    const result = await this.completeEvidenceUseCase.execute(...);
    return this.toCompleteResponse(result);
  }
}
```

### `src/evidence/evidence.module.ts`
- 导入 `ApplicationModule`

### `src/notifications/notifications.service.ts`
- 注入 `PushProviderPort`
- 添加 `sendPushNotification()` 方法
- 添加 `cleanupInvalidTokens()` 方法

---

## 架构改进

### 1. 请求链路追踪

```
┌─────────────────────────────────────────────────────────────────┐
│                     RequestIdInterceptor                         │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. 从 Header 获取或生成 X-Request-Id                         ││
│  │ 2. 创建 RequestContext (requestId, startTime, userId...)    ││
│  │ 3. 使用 AsyncLocalStorage 传递上下文                         ││
│  │ 4. 记录请求开始/结束日志                                      ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Controller / Service                          │
│  import { getCurrentRequestId } from 'common/infra';             │
│  const requestId = getCurrentRequestId(); // 随时获取            │
└─────────────────────────────────────────────────────────────────┘
```

**日志输出示例：**
```
2025-01-02T12:00:00.000Z INFO    [RequestIdInterceptor][abc12345] → POST /api/circles/.../evidence/complete
2025-01-02T12:00:00.150Z INFO    [CompleteEvidenceUseCase][abc12345] Completing evidence session (circle=def45678, event=ghi90123)
2025-01-02T12:00:00.200Z INFO    [RequestIdInterceptor][abc12345] ← POST /api/circles/.../evidence/complete 200 200ms
```

### 2. 推送服务抽象

```
┌─────────────────────────────────────────────────────────────────┐
│                      PushProviderPort                            │
│  interface PushProviderPort {                                    │
│    send(token, payload, platform): Promise<PushResult>           │
│    sendBatch(tokens, payload, platform): Promise<BatchPushResult>│
│    isAvailable(): Promise<boolean>                               │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↑
            ┌─────────────────┴─────────────────┐
            │                                   │
┌───────────────────────┐         ┌───────────────────────┐
│    MockPushProvider    │         │    FCMPushProvider    │
│  - 记录发送请求        │         │  - Firebase Admin SDK  │
│  - 模拟成功/失败       │         │  - 真实推送           │
│  - 测试用              │         │  - 生产用             │
└───────────────────────┘         └───────────────────────┘
```

**配置方式：**
```bash
# .env
PUSH_PROVIDER_MODE=mock  # 开发/测试
PUSH_PROVIDER_MODE=fcm   # 生产

# FCM 配置（生产环境）
FIREBASE_PROJECT_ID=your-project
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/service-account.json
# 或使用 GOOGLE_APPLICATION_CREDENTIALS
```

### 3. Evidence UseCase 分离

```
┌─────────────────────────────────────────────────────────────────┐
│                      EvidenceController                          │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                       EvidenceService                            │
│  - 编排 UseCase                                                  │
│  - 调用外部服务（Storage presign）                               │
│  - 转换响应格式                                                  │
└───────────────────────────┬─────────────────────────────────────┘
                            ↓
            ┌───────────────┴───────────────┐
            ↓                               ↓
┌───────────────────────┐     ┌───────────────────────┐
│CreateUploadSessionUseCase│   │CompleteEvidenceUseCase │
│  - 事务创建 session    │     │  - 事务更新 evidence   │
│  - 事务创建 items      │     │  - 悲观锁防并发        │
│  - 返回 presign 请求   │     │  - 幂等处理           │
└───────────────────────┘     └───────────────────────┘
```

---

## 使用示例

### RequestId 追踪
```typescript
import { getCurrentRequestId, getCurrentRequestContext } from '../common/infra';

// 在任何地方获取当前请求 ID
const requestId = getCurrentRequestId();
this.logger.log('Processing', { requestId });

// 获取完整上下文
const ctx = getCurrentRequestContext();
console.log(ctx?.userId, ctx?.circleId);
```

### 推送服务
```typescript
// 注入
@Inject(PUSH_PROVIDER_PORT) private readonly pushProvider: PushProviderPort

// 单条推送
const result = await this.pushProvider.send(token, {
  title: '📦 快递到达',
  body: '您的快递已送达前门',
  data: { eventId: '...' },
}, 'fcm');

// 批量推送
const batch = await this.pushProvider.sendBatch(tokens, payload, 'fcm');
// 清理无效 token
for (const token of batch.invalidTokens) {
  await this.cleanupToken(token);
}
```

### 测试 Mock
```typescript
// 获取 Mock 实例
const mockPush = module.get<MockPushProvider>(PUSH_PROVIDER_PORT);

// 模拟 token 失败
mockPush.setTokenFailing('some-token');
mockPush.setTokenInvalid('invalid-token');

// 验证发送
expect(mockPush.sentMessages).toHaveLength(1);
expect(mockPush.sentMessages[0].payload.title).toBe('📦 快递到达');
```

---

## 环境变量

### 新增
| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PUSH_PROVIDER_MODE` | 推送模式 (`mock`/`fcm`) | `mock` |
| `FIREBASE_PROJECT_ID` | Firebase 项目 ID | - |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | 服务账户 JSON 路径 | - |

---

## 下一步 (Phase 3)

1. **引入 Outbox 模式** - 通知可靠投递
2. **添加 Worker 消费 Outbox**
3. **目录结构重组** - 按 bounded context 组织
4. **完善测试覆盖**

---

## 部署注意事项

1. **无数据库变更** - 本次重构不涉及 schema 修改
2. **向后兼容** - API 行为不变
3. **环境变量** - 确保 `PUSH_PROVIDER_MODE=mock` 在非生产环境
4. **日志格式变化** - RequestId 会出现在所有日志中

---

## 测试建议

### 单元测试
```typescript
describe('CompleteEvidenceUseCase', () => {
  let useCase: CompleteEvidenceUseCase;
  let mockClock: MockClock;

  beforeEach(() => {
    mockClock = new MockClock('2025-01-02T00:00:00Z');
    // ... setup with mock repos
  });

  it('should complete evidence in transaction', async () => {
    const result = await useCase.execute(circleId, eventId, deviceId, request);
    expect(result.evidenceStatus).toBe('ARCHIVED');
  });

  it('should return deduped for duplicate request', async () => {
    await useCase.execute(...); // first call
    const result = await useCase.execute(...); // second call
    expect(result.deduped).toBe(true);
  });
});
```

### 集成测试
```typescript
describe('Push Notification Flow', () => {
  let mockPush: MockPushProvider;

  beforeEach(() => {
    mockPush = module.get(PUSH_PROVIDER_PORT);
    mockPush.clear();
  });

  it('should send push when parcel notification created', async () => {
    await notificationsService.createParcelNotification({...});
    
    expect(mockPush.sentMessages).toHaveLength(1);
    expect(mockPush.sentMessages[0].payload.title).toContain('快递');
  });
});
```
