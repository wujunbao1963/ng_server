# 发布到 Railway 的步骤

## 简单发布流程

由于您已经配置好 GitHub 与 Railway 的自动部署，发布新代码非常简单：

### 1. 确认当前分支的改动已提交

```bash
git status
git log --oneline -5
```

当前分支 `copilot/add-ios-native-push-channel` 已包含所有 iOS 推送功能的改动。

### 2. 合并到主分支

如果 Railway 监听的是 `main` 分支：

```bash
# 切换到 main 分支
git checkout main

# 拉取最新代码
git pull origin main

# 合并功能分支
git merge copilot/add-ios-native-push-channel

# 推送到 GitHub
git push origin main
```

### 3. 自动部署

推送到 GitHub 后，Railway 会自动：
- 检测到新的提交
- 开始构建
- 运行数据库迁移
- 部署新版本

### 4. 在 Railway 添加新的环境变量

iOS 推送功能需要在 Railway 中添加以下环境变量（如果需要 iOS 推送）：

```bash
APNS_KEY_ID=你的密钥ID
APNS_TEAM_ID=你的团队ID
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APNS_BUNDLE_ID=com.neighbor-guard.app
APNS_PRODUCTION=false
```

在 Railway Dashboard 中：
1. 选择你的项目
2. 点击 "Variables" 标签
3. 添加上述环境变量
4. Railway 会自动重新部署

### 5. 验证部署

访问你的 Railway 应用 URL，检查健康状态：

```bash
curl https://你的应用.railway.app/health
```

查看 Railway 日志，确认 iOS 推送提供商已初始化：

```
[APNsPushProvider] APNsPushProvider initialized
[MultiPushProvider] MultiPushProvider initialized with WebPush and APNs
```

## 仅此而已！

就这么简单 - 您只需要：
1. `git push` 到 GitHub
2. Railway 自动部署
3. 添加 iOS 推送的环境变量（如果需要）

---

**注意**：如果 Railway 监听的是其他分支（如 `develop`），请相应调整第 2 步中的分支名称。
