import { useEffect, useState } from 'react';
import {
  listMessages,
  createMessage,
  deleteMessage,
  updateMessage,
  adminLogin,
  adminLogout,
  adminCheck,
  TOKEN_KEY,
} from './api.js';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  async function refresh() {
    try {
      setError('');
      setMessages(await listMessages());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // 页面加载时校验本地已保存的管理员令牌是否仍有效
    (async () => {
      if (!localStorage.getItem(TOKEN_KEY)) return;
      if (await adminCheck()) {
        setIsAdmin(true);
      } else {
        localStorage.removeItem(TOKEN_KEY);
      }
    })();
  }, []);

  function resetAdmin() {
    setIsAdmin(false);
    localStorage.removeItem(TOKEN_KEY);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await createMessage({ name: name.trim(), content: content.trim() });
      setContent('');
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    if (!password) return;
    setLoggingIn(true);
    setError('');
    try {
      const { token } = await adminLogin(password);
      localStorage.setItem(TOKEN_KEY, token);
      setPassword('');
      setIsAdmin(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    setError('');
    try {
      await adminLogout();
    } catch {
      // 令牌可能已失效，忽略，直接在前端清除
    }
    resetAdmin();
  }

  async function handleDelete(id) {
    setError('');
    try {
      await deleteMessage(id);
      await refresh();
    } catch (err) {
      if (err.status === 401) resetAdmin();
      setError(err.message);
    }
  }

  function startEdit(m) {
    setEditingId(m.id);
    setEditContent(m.content);
    setError('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent('');
  }

  async function saveEdit(id) {
    if (!editContent.trim()) return;
    setSavingEdit(true);
    setError('');
    try {
      await updateMessage(id, { content: editContent.trim() });
      cancelEdit();
      await refresh();
    } catch (err) {
      if (err.status === 401) resetAdmin();
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <div className="container">
      <header>
        <h1>留言板</h1>
        <p className="subtitle">前端 React · 后端 Express · 数据库 SQLite/PostgreSQL</p>
      </header>

      <div className="card admin-bar">
        {isAdmin ? (
          <>
            <span>🔑 管理员模式</span>
            <button className="ghost" onClick={handleLogout}>退出登录</button>
          </>
        ) : (
          <form className="admin-login" onSubmit={handleLogin}>
            <input
              type="password"
              placeholder="管理员密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button type="submit" disabled={loggingIn || !password}>
              {loggingIn ? '登录中…' : '管理员登录'}
            </button>
          </form>
        )}
      </div>

      <form className="card" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="你的昵称（可选）"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={30}
        />
        <textarea
          placeholder="写点什么吧…"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          maxLength={500}
          required
        />
        <button type="submit" disabled={submitting || !content.trim()}>
          {submitting ? '提交中…' : '发布留言'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <section>
        <h2>全部留言（{messages.length}）</h2>
        {loading ? (
          <p className="muted">加载中…</p>
        ) : messages.length === 0 ? (
          <p className="muted">还没有留言，来抢沙发～</p>
        ) : (
          <ul className="messages">
            {messages.map((m) => (
              <li key={m.id} className="card message">
                <div className="message-head">
                  <strong>{m.name}</strong>
                  <span className="time">{formatTime(m.created_at)}</span>
                </div>

                {editingId === m.id ? (
                  <div className="edit-box">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      maxLength={500}
                    />
                    <div className="actions">
                      <button
                        onClick={() => saveEdit(m.id)}
                        disabled={savingEdit || !editContent.trim()}
                      >
                        {savingEdit ? '保存中…' : '保存'}
                      </button>
                      <button className="ghost" onClick={cancelEdit}>取消</button>
                    </div>
                  </div>
                ) : (
                  <p className="content">{m.content}</p>
                )}

                {isAdmin && editingId !== m.id && (
                  <div className="actions">
                    <button className="ghost" onClick={() => startEdit(m)}>编辑</button>
                    <button className="delete" onClick={() => handleDelete(m.id)}>删除</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('zh-CN', { hour12: false });
}
