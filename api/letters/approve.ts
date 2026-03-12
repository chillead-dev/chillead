// ============================================================
//  api/letters/approve.ts  —  admin: move letter to approved
// ============================================================

import type { IncomingMessage, ServerResponse } from "node:http";
import {
  redis,
  setSecurityHeaders,
  requireAdmin,
  parseJsonBody,
  sanitizeMessage,
} from "./_redis.js";
import type { RawLetter } from "../../src/types";

interface ApproveBody { id?: string }

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setSecurityHeaders(res);

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }
  if (!requireAdmin(req)) {
    res.writeHead(403);
    res.end(JSON.stringify({ ok: false, error: "forbidden" }));
    return;
  }

  const body = await parseJsonBody<ApproveBody>(req);
  const id = sanitizeMessage(body?.id ?? "", 128);
  if (!id) {
    res.writeHead(400);
    res.end(JSON.stringify({ ok: false, error: "missing_id" }));
    return;
  }

  try {
    const pending = (await redis("LRANGE", "letters:pending", 0, -1)) as string[] | null ?? [];
    let foundRaw: string | null = null;
    let foundObj: RawLetter | null = null;

    for (const raw of pending) {
      try {
        const o: RawLetter = JSON.parse(raw) as RawLetter;
        if (o.id === id) { foundRaw = raw; foundObj = o; break; }
      } catch {}
    }

    if (!foundRaw || !foundObj) {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: false, error: "not_found" }));
      return;
    }

    await redis("LREM", "letters:pending", 1, foundRaw);

    const approved: RawLetter = {
      id:         foundObj.id ?? id,
      message:    foundObj.message ?? "",
      createdAt:  Number(foundObj.createdAt) || Date.now(),
      answered:   !!foundObj.answered,
      answer:     foundObj.answer ?? null,
      answeredAt: foundObj.answeredAt ?? null,
    };

    await redis("LPUSH", "letters:approved", JSON.stringify(approved));
    await redis("LTRIM", "letters:approved", 0, 200);

    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error("[approve] error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ ok: false, error: "server_error" }));
  }
}
