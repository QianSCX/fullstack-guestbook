# 留言板（前后端数据库分离示例）

一个最小但完整的前后端分离 Web 应用：用户发布/查看/删除留言。三层职责清晰隔离，前后端只通过 HTTP REST API 通信。

## 架构

```
┌──────────────┐   HTTP/JSON    ┌──────────────┐    SQL     ┌──────────────┐
│   前端       │  ────────────▶ │   后端       │  ────────▶ │   数据库     │
│  React+Vite  │   /api/*       │   Express    │            │ SQLite / PG  │
│  端口 5173   │                │   端口 3001  │            │              │
└──────────────┘                └──────────────┘            └──────────────┘
```

| 层 | 技术 | 目录 | 说明 |
|----|------|------|------|
| 前端 | React 18 + Vite | `frontend/` | 独立构建、独立运行，通过 `/api` 调用后端 |
| 后端 | Node.js + Express | `backend/` | REST API，独立进程，不包含任何界面 |
| 数据库 | SQLite（默认）/ PostgreSQL（可选） | `backend/data/` 或独立 PG 容器 | 只被后端访问，前端不直接接触 |

> **「分离」体现在**：三份独立代码、独立依赖、独立进程（Docker 下是三个独立容器），彼此只通过 HTTP / SQL 协议通信，任意一层可替换。

## 快速开始（本地开发）

```bash
# 1. 安装前后端依赖
npm run setup

# 2. 开两个终端分别启动
npm run dev:backend   # 后端 http://localhost:3001
npm run dev:frontend  # 前端 http://localhost:5173（已配置代理 /api → 3001）
```

打开 http://localhost:5173 即可使用。

默认使用 **SQLite**（Node 内置 `node:sqlite`，零额外安装）。首次运行会自动建表。

## 生产模式（单服务器 + 公网 IP 访问）

```bash
npm run setup
npm run build          # 构建前端到 frontend/dist
npm start              # 后端监听 0.0.0.0:3001，并托管前端静态文件
```

之后通过 `http://<你的公网IP>:3001` 即可访问。要在公网被访问需要：

1. 后端已监听 `0.0.0.0`（默认已配置，见 `backend/.env.example`）。
2. 在服务器/路由器上**放行 3001 端口**（防火墙入站规则 + 端口转发）。
3. 如果本机没有公网 IP（家用宽带），可用内网穿透工具（如 Cloudflare Tunnel、frp、ngrok）。

## 公网访问实战（ngrok 内网穿透）

家用宽带通常是运营商级 NAT，没有真实公网 IP，无法直接端口映射。最快的方式是用 ngrok 把本地 `3001` 端口映射成一个公网 HTTPS 地址。

### 步骤

1. 构建前端并启动后端（单进程同时托管前端 + API）：

   ```bash
   npm run setup
   npm run build          # 构建前端到 frontend/dist
   npm start              # 后端监听 0.0.0.0:3001，并托管 frontend/dist
   ```

2. 配置 ngrok authtoken（仅首次，令牌在 ngrok 控制台获取）：

   ```bash
   ngrok config add-authtoken <你的token>
   ```

3. 启动隧道：

   ```bash
   ngrok http 3001
   ```

   控制台会输出 `https://xxx.ngrok-free.dev` 公网地址，浏览器打开即可访问。

4. 验证服务：

   ```bash
   curl https://xxx.ngrok-free.dev/api/health   # → {"status":"ok",...}
   ```

### 注意事项

- 浏览器首次访问 ngrok 免费域名会弹「You are about to visit…」确认页，点 **Visit Site** 进入即可。
- 免费版域名**每次重启 ngrok 都会变化**；要固定域名可用 ngrok 付费版保留域名，或改用 Cloudflare Tunnel。
- 目前留言板**任何人可删除任意留言**（无鉴权）；长期对外使用建议加一层管理密码。

## Docker 部署（真·三层分离：三个独立容器）

需要安装 Docker，然后：

```bash
docker compose up -d --build
```

启动三个独立服务：

- **db**：PostgreSQL 16（独立数据库容器，数据持久化到 volume）
- **backend**：Node 后端（通过 `DATABASE_URL` 连接 db，端口 3001）
- **frontend**：nginx 托管前端 + 反向代理 `/api` 到 backend（端口 80）

访问 `http://<你的公网IP>`（80 端口）即可。

## API 文档

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `GET` | `/api/messages` | 获取所有留言（按时间倒序） |
| `POST` | `/api/messages` | 发布留言，body: `{ "name": "昵称", "content": "内容" }` |
| `DELETE` | `/api/messages/:id` | 删除指定留言 |

## 目录结构

```
fullstack-guestbook/
├── backend/               # 后端服务
│   ├── src/
│   │   ├── index.js       # Express 路由 + 静态托管
│   │   └── db.js          # 数据访问层（SQLite / PostgreSQL 双实现）
│   ├── Dockerfile
│   └── .env.example
├── frontend/              # 前端服务
│   ├── src/
│   │   ├── App.jsx        # 页面组件
│   │   └── api.js         # 前端 → 后端 API 封装
│   ├── Dockerfile
│   └── nginx.conf         # 生产环境反向代理
├── docker-compose.yml     # db + backend + frontend 三容器编排
└── package.json           # 根目录便捷脚本
```
