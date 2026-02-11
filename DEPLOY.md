# 发布到 Railway 的步骤

## 简单发布流程

由于您已经配置好 GitHub 与 Railway 的自动部署，发布新代码非常简单：

### 1. 🔥 重要：先从 GitHub 拉取最新代码到本地

**当前情况**：iOS 推送功能的代码已经在 GitHub 上，但您的本地 PC 还没有这些新代码。

在本地 PC 上执行：

```bash
# 切换到工作分支
git checkout copilot/add-ios-native-push-channel

# 从 GitHub 拉取最新代码
git pull origin copilot/add-ios-native-push-channel
```

如果你的工作分支名称不同，替换为实际的分支名。

拉取后，你会看到新增的文件：
- `src/infra/ports/apns-push-provider.ts` - iOS 原生推送提供商
- `src/infra/ports/multi-push-provider.ts` - 多渠道推送系统
- `docs/IOS_PUSH_SETUP.md` - iOS 推送配置指南
- `docs/IOS_PUSH_SUMMARY_CN.md` - 中文说明文档
- 以及其他相关修改

### 2. 确认本地代码已更新

```bash
git status
git log --oneline -5
```

确认本地分支已包含所有代码改动（包括 iOS 推送功能）。

### 3. 推送到 GitHub（如果有新的改动）

**如果您在本地做了额外的修改**，才需要推送：

**注意**：`main` 分支不是工作代码，直接推送工作分支即可。

```bash
# 确认在正确的工作分支上
git branch

# 提交所有改动（如果有）
git add .
git commit -m "你的提交信息"

# 推送到 GitHub 的工作分支
git push origin copilot/add-ios-native-push-channel
```

如果你的工作分支名称不同，替换为实际的分支名。

**如果您没有做新的改动**，代码已经在 GitHub 上了，直接跳到第 4 步。

### 4. 自动部署

推送到 GitHub 后，Railway 会自动（如果 Railway 配置监听此分支）：
- 检测到新的提交
- 开始构建
- 运行数据库迁移
- 部署新版本

**重要**：确保 Railway 项目配置中监听的是你的工作分支，而不是 `main` 分支。

### 5. 在 Railway 添加新的环境变量

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

### 6. 验证部署

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

就这么简单 - 完整流程：
1. **先从 GitHub 拉取最新代码到本地** - `git pull origin 你的工作分支`
2. 如果有新改动，推送到 GitHub - `git push origin 你的工作分支`
3. Railway 自动检测并部署
4. 添加 iOS 推送的环境变量（如果需要）

---

**重要提示**：
- **首先要拉取代码**：本地 PC 需要先从 GitHub 获取最新代码
- 确保 Railway 配置中监听的分支与你的工作分支一致
- 不需要合并到 `main` 分支
- Railway 会直接从你的工作分支部署
- iOS 推送功能的所有代码已经在 GitHub 的 `copilot/add-ios-native-push-channel` 分支上
