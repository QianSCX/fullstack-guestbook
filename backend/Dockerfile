FROM node:24-alpine
WORKDIR /app

# npm 镜像源（默认使用国内镜像，构建更稳定；可用 --build-arg NPM_REGISTRY=... 覆盖）
ARG NPM_REGISTRY=https://registry.npmmirror.com
RUN npm config set registry "$NPM_REGISTRY"

COPY package*.json ./
RUN npm install --omit=dev

COPY src ./src

EXPOSE 3001
CMD ["node", "src/index.js"]
