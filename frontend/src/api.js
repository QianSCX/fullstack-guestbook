// 前端唯一与后端通信的入口：所有 HTTP 请求都走这里。
// 开发环境由 Vite 代理 /api 到后端；生产环境由 nginx/后端反向代理。

const BASE = '/api';
export const TOKEN_KEY = 'admin_token';

function authHeaders() {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(res, fallback) {
  const data = await res.json().catch(() => ({}));
  const err = new Error(data.error || fallback);
  err.status = res.status;
  return err;
}

export async function listMessages() {
  const res = await fetch(`${BASE}/messages`);
  if (!res.ok) throw await parseError(res, '加载留言失败');
  return res.json();
}

export async function createMessage({ name, content }) {
  const res = await fetch(`${BASE}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content }),
  });
  if (!res.ok) throw await parseError(res, '发布失败');
  return res.json();
}

export async function deleteMessage(id) {
  const res = await fetch(`${BASE}/messages/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw await parseError(res, '删除失败');
  return res.json();
}

export async function updateMessage(id, { content }) {
  const res = await fetch(`${BASE}/messages/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw await parseError(res, '修改失败');
  return res.json();
}

export async function adminLogin(password) {
  const res = await fetch(`${BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw await parseError(res, '登录失败');
  return res.json();
}

export async function adminLogout() {
  const res = await fetch(`${BASE}/admin/logout`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw await parseError(res, '退出失败');
  return res.json();
}

export async function adminCheck() {
  const res = await fetch(`${BASE}/admin/check`, { headers: authHeaders() });
  return res.ok;
}
