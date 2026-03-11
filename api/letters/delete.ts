import type { IncomingMessage, ServerResponse } from "node:http";
import { redis, setSecurityHeaders, requireAdmin, parseJsonBody, sanitizeMessage } from "./_redis.js";

interface IdBody { id?: string }

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

  const body = await parseJsonBody<IdBody>(req);
  const id = sanitizeMessage(body?.id ?? "", 128);
  if (!id) {
    res.writeHead(400);
    res.end(JSON.stringify({ ok: false, error: "missing_id" }));
    return;
  }

  try {
    for (const key of ["letters:pending", "letters:approved"]) {
      const raw = (await redis("LRANGE", key, 0, -1)) as string[] | null ?? [];
      for (const s of raw) {
        try {
          const o = JSON.parse(s) as { id?: string };
          if (o.id === id) await redis("LREM", key, 0, s);
        } catch { /* skip */ }
      }
    }
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error("[delete] error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ ok: false, error: "server_error" }));
  }
}
