# NG Server API 变更记录

## 版本历史

| 版本 | 日期 | 描述 |
|------|------|------|
| v7.11 | 2026-01-01 | 移除 download 端点的 lease 限制 |
| v7.10 | 2026-01-01 | 移除 download 端点的 JWT 认证 |
| v7.9 | 2026-01-01 | 添加 edge events 读取和状态更新 API |

---

## v7.11 - Download Lease 限制移除

**日期**: 2026-01-01

**修改文件**: `src/evidence-tickets/evidence-ticket-download.controller.ts`

**问题**: 
视频播放器发送多个 Range 请求来分段加载视频，但 lease 机制限制每个 ticket 只能有一个并发下载，导致 429 Too Many Requests。

**修改**:
移除 `acquireLease()` 和 `releaseLease()` 调用。

**安全性保证**:
- Ticket 有过期时间 (默认 600 秒)
- Ticket 绑定特定 evidenceKey
- Ticket 创建时已验证用户身份和 circle 权限
- 每次下载都记录审计日志 (`ng_evidence_download_audit`)

**影响范围**:
- `GET /api/evidence/tickets/:ticketId/download`

---

## v7.10 - Download JWT 认证移除

**日期**: 2026-01-01

**修改文件**: `src/evidence-tickets/evidence-ticket-download.controller.ts`

**问题**:
`<video src="...">` 和 `<img src="...">` HTML 标签无法发送 Authorization header，导致 401 Unauthorized。

**修改**:
```typescript
// 之前
@Get(':ticketId/download')
@UseGuards(AuthGuard('jwt'))  // ← 移除
async download(...) { ... }

// 之后
@Get(':ticketId/download')
async download(...) { ... }
```

**设计理由**:
Ticket 本身就是短期认证凭证：
1. 创建 ticket 需要 JWT 认证 (`POST /evidence/tickets`)
2. Ticket 有过期时间
3. Ticket 绑定特定 evidenceKey 和 requesterUserId
4. 每次下载都记录审计日志

**Contract 补充** (§5.3):
```
## §5.3 Evidence Download Authentication

The `/api/evidence/tickets/:ticketId/download` endpoint does NOT require 
JWT authentication. The ticket itself serves as a short-lived bearer token:

- Created via authenticated POST to `/evidence/tickets`
- Bound to specific evidenceKey and requesterUserId
- TTL: 600 seconds (default)
- All downloads are audited

This design enables `<video>` and `<img>` tags to load evidence directly,
as these HTML elements cannot send Authorization headers.
```

---

## v7.9 - Edge Events 读取 API

**日期**: 2026-01-01

**修改文件**: 
- `src/edge-events/edge-events.controller.ts`
- `src/edge-events/edge-events.service.ts`
- `src/edge-events/edge-events.module.ts`

**背景**:
Edge v7.7 写入 `ng_edge_events` 表，但 App 原本查询 `ng_events` 表，导致事件不可见。

**新增端点**:

### GET /api/circles/:circleId/edge/events
列出 circle 内的 edge 事件。

**认证**: JWT (AuthGuard)

**响应**:
```json
{
  "items": [
    {
      "eventId": "evt-20260101...",
      "edgeInstanceId": "edge-xxx",
      "threatState": "TRIGGERED",
      "triggerReason": "entry_delay_expired",
      "occurredAt": "2026-01-01T12:00:00Z",
      "updatedAt": "2026-01-01T12:00:00Z",
      "status": "OPEN",
      "title": "入侵警报",
      "entryPointId": "front_door"
    }
  ],
  "nextCursor": null
}
```

### GET /api/circles/:circleId/edge/events/:eventId
获取单个 edge 事件详情。

**认证**: JWT (AuthGuard)

### PATCH /api/circles/:circleId/edge/events/:eventId/status
更新 edge 事件状态。

**认证**: JWT (AuthGuard)

**请求**:
```json
{
  "status": "RESOLVED",  // OPEN | ACKED | RESOLVED
  "note": "确认安全"
}
```

**响应**:
```json
{
  "updated": true,
  "eventId": "evt-20260101...",
  "status": "RESOLVED",
  "updatedAt": "2026-01-01T12:05:00Z"
}
```

---

## API 路径汇总

### App → Server (用户认证)

| 操作 | 方法 | 路径 | 认证 |
|------|------|------|------|
| 事件列表 | GET | `/api/circles/:cid/edge/events` | JWT |
| 事件详情 | GET | `/api/circles/:cid/edge/events/:eid` | JWT |
| 获取 manifest | GET | `/api/circles/:cid/events/:eid/incident/manifest` | JWT |
| 创建 ticket | POST | `/api/circles/:cid/events/:eid/evidence/tickets` | JWT |
| 下载证据 | GET | `/api/evidence/tickets/:tid/download` | **无** (ticket 是凭证) |
| 更新状态 | PATCH | `/api/circles/:cid/edge/events/:eid/status` | JWT |

### Edge → Server (设备认证)

| 操作 | 方法 | 路径 | 认证 |
|------|------|------|------|
| 事件摘要 | POST | `/api/circles/:cid/edge/events/summary-upsert` | Device Key |
| 证据清单 | POST | `/api/circles/:cid/edge/events/:eid/incident/manifest-upsert` | Device Key |

---

## 数据表关系

```
Edge 写入:
  ng_edge_events (事件摘要)
  ng_incident_manifests (证据清单)

App 读取:
  ng_edge_events (事件列表/详情)
  ng_incident_manifests (证据清单)
  ng_evidence_access_tickets (下载票据)
  ng_evidence_download_audit (下载审计)
```

---

## 待办事项

- [ ] 实时视频流 Verification API
- [ ] 推送通知 (FCM/APNs)
- [ ] Circle ID 动态获取 (替代环境变量)
- [ ] Lease 机制优化 (支持并发 Range 请求)
