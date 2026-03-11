// ============================================================
//  api/status.ts
// ============================================================

import type { IncomingMessage, ServerResponse } from "node:http";
import { redis, setSecurityHeaders } from "./letters/_redis.js";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setSecurityHeaders(res);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  try {
    const ping    = await redis("PING");
    const pending = await redis("LLEN", "letters:pending");
    const approved = await redis("LLEN", "letters:approved");

    res.writeHead(200);
    res.end(JSON.stringify({
      ok: true,
      redis:   ping ?? "ok",
      letters: { pending: Number(pending ?? 0), approved: Number(approved ?? 0) },
      time:    Date.now(),
    }));
  } catch (err) {
    console.error("[status] error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ ok: false, error: "status_failed" }));
  }
}

// ============================================================
//  api/health.ts
// ============================================================

export async function healthHandler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, time: Date.now() }));
}
