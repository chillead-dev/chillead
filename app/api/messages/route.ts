// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import kv from '@/lib/kv';
import { Message } from '@/types/message';
import crypto from 'crypto';

function hashIP(ip: string) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// GET /api/messages — получить одобренные сообщения
export async function GET() {
  const messages =
    ((await kv.lrange<Message>('messages:approved', 0, 49)) as Message[]) ?? [];

  return NextResponse.json({ messages });
}

// POST /api/messages — анонимно отправить сообщение
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body.text ?? '').trim();

    if (text.length < 3) {
      return NextResponse.json(
        { error: 'too_short' },
        { status: 400 }
      );
    }

    if (text.length > 1000) {
      return NextResponse.json(
        { error: 'too_long' },
        { status: 400 }
      );
    }

    // простейший антиспам
    const ip =
      req.headers.get('x-forwarded-for') ||
      req.ip ||
      'unknown';

    const key = `rate:${hashIP(ip)}`;
    const last = (await kv.get<number>(key)) ?? 0;
    const now = Date.now();

    // не чаще одного сообщения в 30 секунд
    if (last && now - last < 30_000) {
      return NextResponse.json(
        { error: 'too_fast' },
        { status: 429 }
      );
    }

    await kv.set(key, now, { ex: 60 }); // хранить таймштамп ~1м

    // экранируем углы, чтобы не было XSS
    const safeText = text
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const msg: Message = {
      id: crypto.randomUUID(),
      text: safeText,
      createdAt: now,
    };

    // кладём в список ожидающих модерации
    await kv.lpush('messages:pending', msg);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: 'invalid_body' },
      { status: 400 }
    );
  }
}
