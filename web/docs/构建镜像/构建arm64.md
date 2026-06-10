使用 docker compose build + tag + push

# web镜像

步骤 1: 构建镜像

docker compose -f docker-compose-web-custom-v0608-local-validate-arm64.yml build langfuse-web
$env:DOCKER_BUILDKIT=1; docker compose -f docker-compose-web-custom-v0608-local-validate-arm64.yml build langfuse-web

步骤 2: 查看构建的镜像名称

docker images | grep langfuse-web-custom

步骤 3: Tag 重命名

docker tag langfuse-web-custom:v0608.arm64.1 quay.io/caigentle/langfuse-web-custom:v0608.arm64.1

步骤 4: Push 推送

docker push quay.io/caigentle/langfuse-web-custom:v0608.arm64.1

# Worker 镜像同理

# 构建
docker compose -f docker-compose-web-custom-v0608-local-validate-arm64.yml build langfuse-worker
$env:DOCKER_BUILDKIT=1; docker compose -f docker-compose-web-custom-v0608-local-validate-arm64.yml build langfuse-worker

# Tag
docker tag langfuse-worker-custom:v0529.arm64.1 quay.io/caigentle/langfuse-worker-custom:v0529.arm64.1

# Push
docker push quay.io/caigentle/langfuse-worker-custom:v0529.arm64.1

注意事项
┌────────────────────────────────┬───────────────────────────┬────────────────────────────────┐
│              方式              │           优点            │              缺点              │
├────────────────────────────────┼───────────────────────────┼────────────────────────────────┤
│ docker compose build           │ 简单，自动读取 build args │ 构建的是当前机器架构，非跨平台 │
├────────────────────────────────┼───────────────────────────┼────────────────────────────────┤
│ docker buildx build --platform │ 支持跨平台构建            │ 命令较长                       │
└────────────────────────────────┴───────────────────────────┴────────────────────────────────┘
如果你在 arm64 机器上执行 docker compose build，构建出来的就是 arm64 镜像。如果在 amd64 机器上，需要使用 buildx 方式。


---

创建工作流文件：

● Write(.github\workflows\build-arm64.yml)
⎿  Wrote 1 lines to .github\workflows\build-arm64.yml
name: Build ARM64 Images
on:
workflow_dispatch:
inputs:
web_tag:
description: 'Web image tag'
required: true
default: 'v0608.arm64.1'
worker_tag:
⎿  PostToolUse:Write hook error

● 配置步骤

1. 在 GitHub 仓库添加 Secrets

进入 GitHub 仓库 → Settings → Secrets and variables → Actions → New repository secret

添加以下 secrets：
┌───────────────┬─────────────────────────────────────────┐
│  Secret 名称  │                   值                    │
├───────────────┼─────────────────────────────────────────┤
│ QUAY_USERNAME │ 你的 quay.io 用户名                     │
├───────────────┼─────────────────────────────────────────┤
│ QUAY_PASSWORD │ 你的 quay.io 密码或 Robot Account Token │
└───────────────┴─────────────────────────────────────────┘
2. 触发构建

# 提交工作流文件
git add .github/workflows/build-arm64.yml
git commit -m "ci: add arm64 build workflow"
git push origin feature/local-file-storage

然后在 GitHub 仓库页面：
1. 进入 Actions 标签
2. 选择 Build ARM64 Images 工作流
3. 点击 Run workflow
4. 输入镜像标签（默认已填好）
5. 点击 Run workflow 按钮

  ---
预期效果
┌──────────┬─────────────────┬──────────────────────┐
│   项目   │ 本地 QEMU 构建  │    GitHub Actions    │
├──────────┼─────────────────┼──────────────────────┤
│ 构建时间 │ 2+ 小时（崩溃） │ 10-15 分钟           │
├──────────┼─────────────────┼──────────────────────┤
│ 稳定性   │ 差              │ 稳定                 │
├──────────┼─────────────────┼──────────────────────┤
│ 费用     │ 免费            │ 免费（arm64 runner） │
└──────────┴─────────────────┴──────────────────────┘
  ---
工作流说明

┌─────────────────────────────────────────────────────────┐
│  触发 workflow_dispatch                                  │
│       ↓                                                  │
│  ┌─────────────────┐    ┌─────────────────┐             │
│  │ build-web       │    │ build-worker    │  ← 并行执行  │
│  │ (arm64 runner)  │    │ (arm64 runner)  │             │
│  └────────┬────────┘    └────────┬────────┘             │
│           ↓                      ↓                       │
│  推送到 quay.io/caigentle/langfuse-web-custom:v0608.arm64.1  │
│  推送到 quay.io/caigentle/langfuse-worker-custom:v0529.arm64.1│
└─────────────────────────────────────────────────────────┘

构建完成后，k8s 部署时会自动拉取这两个镜像。

