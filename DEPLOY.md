# 发布到 Railway 的步骤

## 📢 重要说明

**实际情况：Railway 没有自动触发部署！**

根据您的反馈，虽然代码已经推送到 GitHub，但 Railway **并没有自动部署**。这可能是因为：

1. ❌ Railway 没有配置监听这个分支
2. ❌ Railway 的自动部署功能没有启用
3. ❌ Railway 的 webhook 没有正确设置

**所以您需要手动触发部署！** 本文档将说明如何操作。

---

## 🚀 方法 1：手动触发 Railway 部署（推荐，立即生效）

### 步骤 A：在 Railway Dashboard 手动部署

1. **登录 Railway**
   - 访问 [Railway Dashboard](https://railway.app/dashboard)
   - 登录你的账号

2. **选择项目**
   - 找到并点击你的 ng_server 项目

3. **手动触发部署**
   - 在项目页面，找到你的服务（service）
   - 点击服务进入详情
   - 方法一：点击右上角的 "Deploy" 按钮
   - 方法二：在 "Deployments" 标签中，点击 "New Deployment"
   - 选择分支：`copilot/add-ios-native-push-channel`
   - 点击 "Deploy" 确认

4. **等待部署完成**
   - 在 "Deployments" 标签查看部署进度
   - 等待状态变为 "Success"（绿色）
   - 通常需要 3-5 分钟

### 步骤 B：添加 iOS 推送环境变量

在手动部署的同时，添加必要的环境变量：

1. 在项目页面，点击 "Variables" 标签
2. 添加以下环境变量（如果需要 iOS 推送）：

```bash
APNS_KEY_ID=你的密钥ID
APNS_TEAM_ID=你的团队ID
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----
APNS_BUNDLE_ID=com.neighbor-guard.app
APNS_PRODUCTION=false
```

3. 点击 "Add" 保存
4. 添加变量后，Railway 会自动重新部署

---

## ⚙️ 方法 2：配置自动部署（一次配置，以后自动）

如果您希望将来 push 代码时自动部署，需要配置 Railway：

### 步骤 1：检查当前配置

1. 在 Railway 项目中，选择你的服务
2. 点击 "Settings" 标签
3. 找到 "Source" 或 "Deploy" 部分
4. 查看当前监听的分支

### 步骤 2：配置监听分支

1. 在 "Settings" → "Source" 中
2. 找到 "Branch" 或 "Watch Branches" 设置
3. **修改为**：`copilot/add-ios-native-push-channel`
4. 或者选择 "Watch all branches"（监听所有分支）
5. 保存设置

### 步骤 3：启用自动部署

1. 确保 "Auto Deploy" 或 "Automatic Deployments" 是**启用**状态
2. 如果是关闭的，点击开关启用

### 步骤 4：测试自动部署

配置完成后，测试一下：

```bash
# 在本地做一个小改动（比如在 README.md 加一行）
echo "\n# Test auto-deploy" >> README.md
git add README.md
git commit -m "Test: trigger auto deploy"
git push origin copilot/add-ios-native-push-channel
```

然后在 Railway Dashboard 查看是否自动触发了新的部署。

---

## 📋 当前情况下的完整流程

### 第 1 步：从 GitHub 拉取代码到本地

iOS 推送功能的代码已经在 GitHub 上，先拉取到本地：

```bash
# 切换到工作分支
git checkout copilot/add-ios-native-push-channel

# 从 GitHub 拉取最新代码
git pull origin copilot/add-ios-native-push-channel
```

拉取后，你会看到新增的 iOS 推送功能文件。

### 第 2 步：🚀 手动在 Railway 触发部署

**因为自动部署没有工作，您需要手动触发：**

1. 登录 [Railway Dashboard](https://railway.app/dashboard)
2. 选择你的 ng_server 项目
3. 点击服务 → 点击 "Deploy" 按钮
4. 选择分支：`copilot/add-ios-native-push-channel`
5. 等待部署完成（3-5 分钟）

### 第 3 步：添加环境变量

在 Railway Variables 中添加 iOS 推送配置：

```bash
APNS_KEY_ID=你的密钥ID
APNS_TEAM_ID=你的团队ID
APNS_KEY_CONTENT=你的密钥内容
APNS_BUNDLE_ID=com.neighbor-guard.app
APNS_PRODUCTION=false
```

添加后 Railway 会自动重新部署。

### 第 4 步：验证部署

部署完成后，测试健康端点：

```bash
curl https://你的应用.railway.app/health
```

查看日志确认 iOS 推送提供商已初始化。

---

## 🔧 故障排查

### 为什么 Railway 没有自动部署？

**可能的原因：**

1. **Railway 没有监听这个分支**
   - 解决：在 Settings → Source 中配置监听 `copilot/add-ios-native-push-channel`

2. **自动部署功能被禁用**
   - 解决：在 Settings 中启用 "Auto Deploy"

3. **GitHub webhook 没有正确配置**
   - 解决：在 GitHub 仓库 Settings → Webhooks 中检查 Railway webhook 状态

4. **Railway 监听的是 main 分支**
   - 解决：修改监听分支，或者将代码合并到 main

### 如何检查 Railway 配置？

1. 进入 Railway 项目
2. 点击服务 → Settings
3. 查看 "Source" 部分：
   - Repository: 应该是 `wujunbao1963/ng_server`
   - Branch: 应该是 `copilot/add-ios-native-push-channel` 或 "All branches"
   - Auto Deploy: 应该是启用状态

### 临时方案 vs 长期方案

**临时方案**（立即生效）：
- 每次代码更新后，手动在 Railway Dashboard 点击 "Deploy"

**长期方案**（一劳永逸）：
- 配置 Railway 监听你的工作分支
- 启用自动部署
- 以后 push 代码就会自动部署

---

## 📝 总结

### ✅ 当前需要做的：

1. **拉取代码到本地**
   ```bash
   git pull origin copilot/add-ios-native-push-channel
   ```

2. **手动触发 Railway 部署**
   - Railway Dashboard → 项目 → Deploy 按钮
   - 选择分支：`copilot/add-ios-native-push-channel`

3. **添加环境变量**
   - Railway Variables 添加 APNs 配置

4. **验证部署成功**
   - 检查健康端点
   - 查看日志

### 🔄 配置自动部署（可选，建议配置）：

1. Railway Settings → Source
2. 设置 Branch: `copilot/add-ios-native-push-channel`
3. 启用 Auto Deploy
4. 以后 push 就会自动部署

---

**重要**：
- ✅ 代码已经在 GitHub 上
- ❌ Railway **没有**自动部署（需要手动触发）
- 🔧 建议配置自动部署，避免每次都要手动操作
- 📖 iOS 推送功能的详细配置见 `docs/IOS_PUSH_SETUP.md`
