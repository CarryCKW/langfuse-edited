1. 构建自定义镜像

项目已经包含了完整的 web/Dockerfile,可以直接构建。在项目根目录(D:\Projects\ExpProjects\GITProject\langfuse-edited)执行以下命令:

# 基础构建(适用于本地开发)
# 目前标签latest, v0519, v0520.1, v0520.2
docker build -t langfuse-web-custom:v0520.2 -f web/Dockerfile .
docker build --no-cache -t langfuse-web-custom:v0519 -f web/Dockerfile .
docker build -t langfuse-web-custom:v0529.1 -f web/Dockerfile .
docker build -t langfuse-web-custom:v0608.1 -f web/Dockerfile .


docker build --cache-from langfuse-web-custom:v0608.1 --build-arg NEXT_PUBLIC_BASE_PATH="/langfuse" --build-arg NEXT_PUBLIC_EXTERNAL_AUTH_ENABLED="true" --build-arg NEXT_PUBLIC_EXTERNAL_AUTH_LOGIN_REDIRECT_URL="https://10.151.18.110:31987/databoard" --build-arg NEXT_PUBLIC_EXTERNAL_AUTH_VALIDATION_MODE="per_request" --build-arg NEXT_PUBLIC_EXTERNAL_AUTH_ACCESS_TOKEN_COOKIE="access_token" -t langfuse-web-custom:v0608.2 -f web/Dockerfile .
DOCKER_BUILDKIT=1 docker build --build-arg BUILDKIT_INLINE_CACHE=1 --cache-from langfuse-web-custom:v0608.1 --build-arg NEXT_PUBLIC_BASE_PATH="/langfuse" --build-arg NEXT_PUBLIC_EXTERNAL_AUTH_ENABLED="true" --build-arg NEXT_PUBLIC_EXTERNAL_AUTH_LOGIN_REDIRECT_URL="https://10.151.18.110:31987/databoard" --build-arg NEXT_PUBLIC_EXTERNAL_AUTH_VALIDATION_MODE="per_request" --build-arg NEXT_PUBLIC_EXTERNAL_AUTH_ACCESS_TOKEN_COOKIE="access_token" -t langfuse-web-custom:v0608.2 -f web/Dockerfile .


2. 修改 docker-compose.yml

需要将 langfuse-web 服务中的 image 字段从官方镜像改为你的自定义镜像:

services:
    langfuse-web:
    # image: docker.io/langfuse/langfuse:3  # 注释掉原始镜像
    image: langfuse-web-custom:latest            # 使用自定义镜像
    restart: always
    depends_on: *langfuse-depends-on
    ports:
    - 23001:3000

3. 启动
docker compose -f docker-compose-web-custom-v0520.yml up -d --force-recreate

docker compose -f docker-compose-web-custom.yml up -d

docker compose -f docker-compose-web-custom.yml up -d --build

docker compose -f docker-compose-web-custom-v0519.yml up -d

docker compose -f docker-compose-web-custom-v0520.yml up -d --build

docker compose -f docker-compose-web-custom-v0529-local.yml up -d --build


docker compose -f docker-compose-web-custom-v0608-local-validate.yml up -d 


---

基础镜像拆分 (web/Dockerfile.base)

将不常变化的工具安装（Alpine 系统包、turbo、pnpm）提取到独立的基础镜像。

构建基础镜像：
docker build -f web/Dockerfile.base -t langfuse-web-base:v0608 .

使用时指定基础镜像：
docker build --build-arg BASE_IMAGE=your-registry.com/langfuse-base:latest -f web/Dockerfile .

2. pnpm store 缓存挂载

在 pnpm install 时使用 BuildKit 缓存挂载，避免重复下载已有的包。

启用方式： 确保构建时启用 BuildKit：
DOCKER_BUILDKIT=1 docker build ...

效果
┌────────────┬─────────────────────┬──────────────────────────┐
│    场景    │       优化前        │          优化后          │
├────────────┼─────────────────────┼──────────────────────────┤
│ 首次构建   │ 下载所有工具 + 依赖 │ 构建基础镜像 + 依赖      │
├────────────┼─────────────────────┼──────────────────────────┤
│ 仅代码变更 │ 重新下载工具 + 依赖 │ 跳过工具安装，依赖走缓存 │
├────────────┼─────────────────────┼──────────────────────────┤
│ 依赖变更   │ 重新下载所有依赖    │ 增量下载变更的依赖       │
└────────────┴─────────────────────┴──────────────────────────┘
如果不想维护私有仓库，也可以取消注释 Dockerfile 中的注释部分，恢复原始构建方式。

---
由于 langfuse-web 使用了 *langfuse-depends-on 锚点，它也会自动获得这个依赖。

现在重新启动容器：

docker compose -f docker-compose-web-custom-v0608-local-validate.yml down
docker compose -f docker-compose-web-custom-v0608-local-validate.yml up -d

方案 2：如果问题仍然存在

可能是 Docker volume 之前已经创建但权限不对。可以先清理 volume 再启动：

docker compose -f docker-compose-web-custom-v0608-local-validate.yml down -v
docker compose -f docker-compose-web-custom-v0608-local-validate.yml up -d

-v 参数会删除关联的 volumes，让 storage-init 重新创建并设置正确的权限。

docker compose -f docker-compose-web-custom-v0608-local-validate.yml build langfuse-web

docker-compose --env-file .env.docker -f docker-compose-web-custom-v0608-local-validate.yml up -d

EXTERNAL_AUTH_VALIDATE_URL=http://host.docker.internal:28801/internal/auth/validate docker-compose -f docker-compose-web-custom-v0608-local-validate.yml up -d

$env:EXTERNAL_AUTH_VALIDATE_URL="http://host.docker.internal:28801/internal/auth/validate"; docker-compose -f docker-compose-web-custom-v0608-local-validate.yml up -d




