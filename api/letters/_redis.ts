// ============================================================
//  api/letters/_redis.ts  —  Redis client + security helpers
// ============================================================

import type { IncomingMessage, ServerResponse } from "node:http";
import type { RateLimitEntry } from "../../src/types";

// ─── Upstash / Redis ────────────────────────────────────────

function pipelineUrl(): string {
  const base = process.env["UPSTASH_REDIS_REST_URL"];
  if (!base) throw new Error("missing_env: UPSTASH_REDIS_REST_URL");
  const clean = base.replace(/\/+$/, "");
  return clean.endsWith("/pipeline") ? clean : `${clean}/pipeline`;
}

export async function redis(cmd: string, ...args: (string | number)[]): Promise<unknown> {
  const url   = pipelineUrl();
  const token = process.env["UPSTASH_REDIS_REST_TOKEN"];
  if (!token) throw new Error("missing_env: UPSTASH_REDIS_REST_TOKEN");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([[cmd, ...args]]),
  });

  if (!res.ok) throw new Error(`upstash_http_error: ${res.status}`);

  const data: unknown = await res.json().catch(() => null);
  if (!Array.isArray(data)) throw new Error("bad_upstash_response");

  const first = (data as { result?: unknown }[])[0];
  return first?.result ?? null;
}

// ─── Security headers ───────────────────────────────────────

export function setSecurityHeaders(res: ServerResponse): void {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'none'");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("Access-Control-Allow-Origin", process.env["SITE_ORIGIN"] ?? "https://hatesocial.lol");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Vary", "Origin");
}

// ─── Input sanitisation ─────────────────────────────────────

export function sanitizeMessage(raw: unknown, maxLen = 500): string {
  const s = String(raw ?? "").replace(/\r/g, "").trim();
  return s
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
    .slice(0, maxLen);
}

export function isValidMessage(msg: string): boolean {
  return msg.length >= 2 && msg.length <= 500;
}

// ─── Cryptographically secure ID ────────────────────────────

export function makeId(): string {
  const rand = crypto.getRandomValues(new Uint8Array(12));
  const hex  = Array.from(rand, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex}_${Date.now().toString(36)}`;
}

// ─── Admin auth ─────────────────────────────────────────────

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

export function requireAdmin(req: IncomingMessage): boolean {
  const expected = process.env["ADMIN_TOKEN"];
  if (!expected || expected.length < 32) return false;
  const auth = (req.headers["authorization"] as string | undefined) ?? "";
  return safeCompare(auth, `Bearer ${expected}`);
}

// ─── In-memory rate limiter ──────────────────────────────────

const RL_WINDOW_MS  = 60_000;
const RL_MAX_HITS   = 10;

const rateLimitStore = new Map<string, RateLimitEntry>();

export function isRateLimited(ip: string): boolean {
  const now   = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RL_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  if (entry.count > RL_MAX_HITS) return true;

  return false;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, RL_WINDOW_MS * 5);

// ─── Parse request body safely ──────────────────────────────

export async function parseJsonBody<T = Record<string, unknown>>(
  req: IncomingMessage,
  maxBytes = 4096
): Promise<T | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;

    req.on("data", (chunk: Buffer) => {
      totalBytes += chunk.length;
      if (totalBytes > maxBytes) {
        req.destroy();
        resolve(null);
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
        resolve(body as T);
      } catch {
        resolve(null);
      }
    });

    req.on("error", () => resolve(null));
  });
}

// ─── Get real IP (behind Vercel / proxies) ──────────────────

export function getClientIp(req: IncomingMessage): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string") return xff.split(",")[0]?.trim() ?? "unknown";
  return req.socket.remoteAddress ?? "unknown";
}
