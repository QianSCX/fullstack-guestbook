# 构建阶段
FROM node:24-alpine AS build
WORKDIR /app

# npm 镜像源（默认使用国内镜像，构建更稳定；可用 --build-arg NPM_REGISTRY=... 覆盖）
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry "$NPM_REGISTRY"

COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 运行阶段：nginx 托管静态资源 + 反向代理 /api 到后端
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
