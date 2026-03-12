// ============================================================
//  api/letters/submit.ts
// ============================================================

import type { IncomingMessage, ServerResponse } from "node:http";
import {
  redis,
  setSecurityHeaders,
  sanitizeMessage,
  isValidMessage,
  makeId,
  isRateLimited,
  getClientIp,
  parseJsonBody,
} from "./_redis.js";
import type { SubmitBody, RawLetter } from "../../src/types";

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setSecurityHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405);
    res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    res.writeHead(429);
    res.end(JSON.stringify({ ok: false, error: "rate_limited" }));
    return;
  }

  const body = await parseJsonBody<SubmitBody>(req);
  if (!body) {
    res.writeHead(400);
    res.end(JSON.stringify({ ok: false, error: "invalid_json" }));
    return;
  }

  const msg = sanitizeMessage(body.message);

  if (!isValidMessage(msg)) {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: false, error: "too_short_or_too_long" }));
    return;
  }

  try {
    const item: RawLetter = {
      id: makeId(),
      message: msg,
      createdAt: Date.now(),
      answered: false,
      answer: null,
      answeredAt: null,
    };

    await redis("LPUSH", "letters:pending", JSON.stringify(item));
    await redis("LTRIM", "letters:pending", 0, 200);

    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error("[submit] error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ ok: false, error: "server_error" }));
  }
}
