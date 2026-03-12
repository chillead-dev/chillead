// ============================================================
//  api/letters/list.ts
// ============================================================

import type { IncomingMessage, ServerResponse } from "node:http";
import { redis, setSecurityHeaders } from "./_redis.js";
import type { Letter, RawLetter } from "../../src/types";

function parseRawLetter(s: string): Letter | null {
  try {
    const o: unknown = JSON.parse(s);
    if (
      typeof o !== "object" ||
      o === null ||
      typeof (o as RawLetter).message !== "string" ||
      typeof (o as RawLetter).createdAt !== "number"
    ) {
      return null;
    }

    const raw = o as RawLetter;

    return {
      id:         raw.id          ?? "unknown",
      message:    raw.message     ?? "",
      createdAt:  Number(raw.createdAt),
      answered:   !!raw.answered,
      answer:     typeof raw.answer === "string" ? raw.answer : null,
      answeredAt: raw.answeredAt ? Number(raw.answeredAt) : null,
    };
  } catch {
    return null;
  }
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  setSecurityHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    res.writeHead(405);
    res.end(JSON.stringify({ ok: false, error: "method_not_allowed" }));
    return;
  }

  try {
    const raw = (await redis("LRANGE", "letters:approved", 0, 99)) as string[] | null;
    const items: Letter[] = (raw ?? [])
      .map((s) => parseRawLetter(s))
      .filter((l): l is Letter => l !== null);

    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, items }));
  } catch (err) {
    console.error("[list] error:", err);
    res.writeHead(500);
    res.end(JSON.stringify({ ok: false, error: "server_error" }));
  }
}
