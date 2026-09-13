// 留言板后端：Express REST API。
// 只负责接口与静态托管，不包含任何业务界面；数据读写全部委托给 db.js。

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createDatabase } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
app.use(cors());
app.use(express.json());

const db = await createDatabase();
const dbKind = process.env.DATABASE_URL ? 'PostgreSQL' : 'SQLite';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const adminTokens = new Set();

function getBearerToken(req) {
  const header = req.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function requireAdmin(req, res, next) {
  const token = getBearerToken(req);
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: '需要管理员权限' });
  }
  next();
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', db: dbKind, time: new Date().toISOString() });
});

app.post('/api/admin/login', (req, res) => {
  const password = String(req.body?.password ?? '');
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: '密码错误' });
  }
  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.add(token);
  res.json({ token });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  adminTokens.delete(getBearerToken(req));
  res.json({ ok: true });
});

app.get('/api/admin/check', requireAdmin, (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/messages', async (_req, res, next) => {
  try {
    res.json(await db.listMessages());
  } catch (err) {
    next(err);
  }
});

app.post('/api/messages', async (req, res, next) => {
  try {
    const content = String(req.body?.content ?? '').trim();
    if (!content) {
      return res.status(400).json({ error: 'content 不能为空' });
    }
    const name = String(req.body?.name ?? '').trim() || '匿名';
    const message = await db.createMessage({ name, content });
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/messages/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: '无效的 id' });
    }
    const deleted = await db.deleteMessage(id);
    if (!deleted) {
      return res.status(404).json({ error: '留言不存在' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

app.put('/api/messages/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: '无效的 id' });
    }
    const content = String(req.body?.content ?? '').trim();
    if (!content) {
      return res.status(400).json({ error: 'content 不能为空' });
    }
    const updated = await db.updateMessage(id, { content });
    if (!updated) {
      return res.status(404).json({ error: '留言不存在' });
    }
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// 生产模式下托管前端构建产物（单服务器部署用）
const distDir = path.join(__dirname, '..', '..', 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: '接口不存在' });
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// 统一错误处理
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, HOST, () => {
  console.log(`后端已启动：http://${HOST}:${PORT}（数据库：${dbKind}）`);
});
