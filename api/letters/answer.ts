import type { IncomingMessage, ServerResponse } from "node:http";
import { redis, setSecurityHeaders, requireAdmin, parseJsonBody, sanitizeMessage } from "./_redis.js";

interface AnswerBody { id?: string; answer?: string }

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

  const body = await parseJsonBody<AnswerBody>(req);
  const id     = sanitizeMessage(body?.id ?? "", 128);
  const answer = sanitizeMessage(body?.answer ?? "");
  if (!id)     { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: "missing_id" })); return; }
  if (!answer) { res.writeHead(400); res.end(JSON.stringify({ ok: false, error: "empty_answer" })); return; }

  try {
    const raw = (await redis("LRANGE", "letters:approved", 0, -1)) as string[] | null ?? [];
    let index = -1;
    let item: Record<string, unknown> | null = null;

    for (let i = 0; i < raw.length; i++) {
      try {
        const o = JSON.parse(raw[i] as string) as Record<string, unknown>;
        if (o["id"] === id) { index = i; item = o; break; }
      } catch { /* skip */ }
    }

    if (index === -1 || !item) {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: false, error: "not_found" }));
      return;
    }

    item["answered"]   = true;
    item["answer"]     = answer;
    item["answeredAt"] = Date.now();

    await redis("LSET", "letters:approved", index, JSON.stringify(item));
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error("[answer] error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ ok: false, error: "server_error" }));
  }
}
