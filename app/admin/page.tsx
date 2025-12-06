// app/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Message } from '@/types/message';

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved'>('pending');
  const [messages, setMessages] = useState<(Message & { answer?: string })[]>(
    []
  );
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/messages?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setMessages(json.messages ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function doAction(
    id: string,
    action: 'approve' | 'delete' | 'answer'
  ) {
    let answer: string | undefined;
    if (action === 'answer') {
      answer = window.prompt('answer text:') ?? '';
    }

    await fetch('/api/admin/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, id, answer }),
    });

    load();
  }

  return (
    <main className="page">
      <h1>## admin</h1>

      <div className="admin-token">
        <input
          type="password"
          placeholder="admin token"
          value={token}
          onChange={e => setToken(e.target.value)}
        />
        <button onClick={load} disabled={!token || loading}>
          load
        </button>
      </div>

      <div className="admin-filters">
        <button
          className={status === 'pending' ? 'active' : ''}
          onClick={() => setStatus('pending')}
        >
          pending
        </button>
        <button
          className={status === 'approved' ? 'active' : ''}
          onClick={() => setStatus('approved')}
        >
          approved
        </button>
      </div>

      <div className="shoutbox">
        {messages.map(m => (
          <article key={m.id} className="msg">
            <p
              className="msg-text"
              dangerouslySetInnerHTML={{ __html: m.text }}
            />
            {m.answer && (
              <div className="answer">
                <span className="badge">answer</span>
                <p>{m.answer}</p>
              </div>
            )}
            <div className="msg-meta">
              {new Date(m.createdAt).toLocaleString()}
            </div>
            <div className="admin-actions">
              {status === 'pending' && (
                <button onClick={() => doAction(m.id, 'approve')}>
                  approve
                </button>
              )}
              <button onClick={() => doAction(m.id, 'answer')}>answer</button>
              <button onClick={() => doAction(m.id, 'delete')}>delete</button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
