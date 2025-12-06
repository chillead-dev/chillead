// app/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Message } from '@/types/message';

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function loadMessages() {
    setLoading(true);
    try {
      const res = await fetch('/api/messages', { cache: 'no-store' });
      const json = await res.json();
      setMessages(json.messages ?? []);
    } catch {
      setError('failed to load messages');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMessages();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'failed to send');
      } else {
        setText('');
      }
    } catch {
      setError('failed to send');
    } finally {
      setSending(false);
      loadMessages();
    }
  }

  return (
    <main className="page">
      <section className="block">
        <h1>## anonymous letterbox</h1>
        <p className="muted">
          type a message here. it will be anonymous
          and delivered to me in a matter of seconds.
        </p>

        <form className="letterbox" onSubmit={submit}>
          <textarea
            placeholder="я думаю..."
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={1000}
          />
          <button type="submit" disabled={sending || !text.trim()}>
            {sending ? '…' : '➤'}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      <section className="block">
        <h2>## shoutbox</h2>
        <p className="muted">
          messages from people around the world who visited this site.
        </p>

        {loading ? (
          <p className="muted">loading…</p>
        ) : messages.length === 0 ? (
          <p className="muted">no messages yet.</p>
        ) : (
          <div className="shoutbox">
            {messages.map(m => (
              <article key={m.id} className="msg">
                <p className="msg-text" dangerouslySetInnerHTML={{ __html: m.text }} />
                {m.answer && (
                  <div className="answer">
                    <span className="badge">answer</span>
                    <p>{m.answer}</p>
                  </div>
                )}
                <div className="msg-meta">
                  {new Date(m.createdAt).toLocaleString()}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
