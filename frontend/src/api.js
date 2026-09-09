// 前端唯一与后端通信的入口：所有 HTTP 请求都走这里。
// 开发环境由 Vite 代理 /api 到后端；生产环境由 nginx/后端反向代理。

const BASE = '/api';

export async function listMessages() {
  const res = await fetch(`${BASE}/messages`);
  if (!res.ok) throw new Error('加载留言失败');
  return res.json();
}

export async function createMessage({ name, content }) {
  const res = await fetch(`${BASE}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, content }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || '发布失败');
  }
  return res.json();
}

export async function deleteMessage(id) {
  const res = await fetch(`${BASE}/messages/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('删除失败');
  return res.json();
}
