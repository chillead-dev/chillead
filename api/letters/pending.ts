import type { IncomingMessage, ServerResponse } from "node:http";
import { redis, setSecurityHeaders, requireAdmin } from "./_redis.js";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setSecurityHeaders(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }
  if (!requireAdmin(req)) {
    res.writeHead(403);
    res.end(JSON.stringify({ ok: false, error: "forbidden" }));
    return;
  }

  try {
    const raw = (await redis("LRANGE", "letters:pending", 0, 30)) as string[] | null;
    const items: { id: string; message: string; createdAt: number }[] = [];

    for (const s of raw ?? []) {
      try {
        const o = JSON.parse(s) as { id?: string; message?: string; createdAt?: number };
        if (o.id && o.message && o.createdAt) {
          items.push({ id: o.id, message: o.message, createdAt: Number(o.createdAt) });
        }
      } catch { /* skip */ }
    }

    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, items }));
  } catch (err) {
    console.error("[pending] error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ ok: false, error: "server_error" }));
  }
}
