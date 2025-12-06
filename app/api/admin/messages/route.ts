// app/api/admin/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import kv from '@/lib/kv';
import { Message } from '@/types/message';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN!;

function unauthorized() {
  return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
}

// GET /api/admin/messages?status=pending|approved
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${ADMIN_TOKEN}`) return unauthorized();

  const url = new URL(req.url);
  const status = url.searchParams.get('status') ?? 'pending';

  if (status === 'approved') {
    const approved =
      ((await kv.lrange<Message>(
        'messages:approved',
        0,
        99
      )) as Message[]) ?? [];
    return NextResponse.json({ messages: approved });
  }

  // pending (по умолчанию)
  const pending =
    ((await kv.lrange<Message>(
      'messages:pending',
      0,
      99
    )) as Message[]) ?? [];
  return NextResponse.json({ messages: pending });
}

// POST /api/admin/messages
// body: { action: 'approve' | 'delete' | 'answer', id: string, answer?: string }
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${ADMIN_TOKEN}`) return unauthorized();

  try {
    const { action, id, answer } = await req.json();

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'no_id' }, { status: 400 });
    }

    // читаем все pending
    const pending =
      ((await kv.lrange<Message>(
        'messages:pending',
        0,
        -1
      )) as Message[]) ?? [];

    const msg = pending.find(m => m.id === id);
    if (!msg) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    if (action === 'delete') {
      // фильтруем и перезаписываем список pending
      const filtered = pending.filter(m => m.id !== id);
      await kv.del('messages:pending');
      if (filtered.length) {
        await kv.rpush('messages:pending', ...filtered);
      }
      return NextResponse.json({ ok: true });
    }

    if (action === 'approve' || action === 'answer') {
      const updated: Message =
        action === 'answer' && typeof answer === 'string'
          ? { ...msg, answer: answer.trim() }
          : msg;

      // переносим в approved
      await kv.lpush('messages:approved', updated);

      // и удаляем из pending
      const filtered = pending.filter(m => m.id !== id);
      await kv.del('messages:pending');
      if (filtered.length) {
        await kv.rpush('messages:pending', ...filtered);
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'bad_action' }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: 'server_error' },
      { status: 500 }
    );
  }
}
