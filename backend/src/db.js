// 数据访问层：封装对数据库的读写。
// 默认使用 SQLite（Node 内置 node:sqlite，零依赖）；
// 当设置了 DATABASE_URL 环境变量时，改用 PostgreSQL（pg）。
// 上层（index.js）只调用这里的语义化方法，不关心底层数据库。

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA_SQLITE = `
  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
  );
`;

const SCHEMA_POSTGRES = `
  CREATE TABLE IF NOT EXISTS messages (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

class SqliteAdapter {
  constructor(dbPath) {
    this.db = new DatabaseSync(dbPath);
  }

  async init() {
    this.db.exec(SCHEMA_SQLITE);
  }

  async createMessage({ name, content }) {
    const info = this.db
      .prepare('INSERT INTO messages (name, content) VALUES (?, ?)')
      .run(name, content);
    return this.getMessage(Number(info.lastInsertRowid));
  }

  async getMessage(id) {
    return this.db
      .prepare('SELECT id, name, content, created_at FROM messages WHERE id = ?')
      .get(id);
  }

  async listMessages() {
    return this.db
      .prepare('SELECT id, name, content, created_at FROM messages ORDER BY id DESC')
      .all();
  }

  async deleteMessage(id) {
    const info = this.db.prepare('DELETE FROM messages WHERE id = ?').run(id);
    return info.changes > 0;
  }

  async close() {
    this.db.close();
  }
}

class PostgresAdapter {
  constructor(pool) {
    this.pool = pool;
  }

  async init() {
    await this.pool.query(SCHEMA_POSTGRES);
  }

  async createMessage({ name, content }) {
    const { rows } = await this.pool.query(
      'INSERT INTO messages (name, content) VALUES ($1, $2) RETURNING id, name, content, created_at',
      [name, content]
    );
    return rows[0];
  }

  async getMessage(id) {
    const { rows } = await this.pool.query(
      'SELECT id, name, content, created_at FROM messages WHERE id = $1',
      [id]
    );
    return rows[0];
  }

  async listMessages() {
    const { rows } = await this.pool.query(
      'SELECT id, name, content, created_at FROM messages ORDER BY id DESC'
    );
    return rows;
  }

  async deleteMessage(id) {
    const { rowCount } = await this.pool.query(
      'DELETE FROM messages WHERE id = $1',
      [id]
    );
    return rowCount > 0;
  }

  async close() {
    await this.pool.end();
  }
}

export async function createDatabase() {
  if (process.env.DATABASE_URL) {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PostgresAdapter(pool);
    await adapter.init();
    return adapter;
  }

  const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const adapter = new SqliteAdapter(path.join(dataDir, 'guestbook.db'));
  await adapter.init();
  return adapter;
}
