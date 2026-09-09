import { useEffect, useState } from 'react';
import { listMessages, createMessage, deleteMessage } from './api.js';

export default function App() {
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

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
  }, []);

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

  async function handleDelete(id) {
    setError('');
    try {
      await deleteMessage(id);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="container">
      <header>
        <h1>留言板</h1>
        <p className="subtitle">前端 React · 后端 Express · 数据库 SQLite/PostgreSQL</p>
      </header>

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
                <p className="content">{m.content}</p>
                <button className="delete" onClick={() => handleDelete(m.id)}>
                  删除
                </button>
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
