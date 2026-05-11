1. 构建自定义镜像

项目已经包含了完整的 web/Dockerfile,可以直接构建。在项目根目录(D:\Projects\ExpProjects\GITProject\langfuse-edited)执行以下命令:

# 基础构建(适用于本地开发)
docker build -t langfuse-web-custom:latest -f web/Dockerfile .
docker build --no-cache -t langfuse-web-custom:latest -f web/Dockerfile .

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

docker compose -f docker-compose-web-custom.yml up -d

docker compose -f docker-compose-web-custom.yml up -d --build



