// /api/now-playing.js
const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";

// простой in-memory rate limit (на один инстанс). Для базовой защиты хватает.
const bucket = new Map(); // ip -> {count, ts}

function rateLimit(req, limit = 60, windowMs = 60_000) {
  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
    req.socket?.remoteAddress ||
    "unknown";

  const now = Date.now();
  const cur = bucket.get(ip) || { count: 0, ts: now };
  if (now - cur.ts > windowMs) {
    cur.count = 0;
    cur.ts = now;
  }
  cur.count += 1;
  bucket.set(ip, cur);
  return cur.count <= limit;
}

function setSecurityHeaders(res) {
  // Базовые хедеры (не “панацея”, но must-have)
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
}

async function getAccessToken() {
  const { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } = process.env;
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REFRESH_TOKEN) {
    throw new Error("Missing Spotify env vars");
  }

  const basic = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: SPOTIFY_REFRESH_TOKEN,
  });

  const r = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`Token refresh failed: ${r.status} ${txt}`);
  }
  const data = await r.json();
  return data.access_token;
}

export default async function handler(req, res) {
  setSecurityHeaders(res);

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, error: "method_not_allowed" });
  }

  if (!rateLimit(req, 60, 60_000)) {
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }

  try {
    const accessToken = await getAccessToken();

    const r = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // 204 = ничего не играет
    if (r.status === 204) return res.status(200).json({ ok: true, playing: false });

    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return res.status(200).json({ ok: false, error: "spotify_error", status: r.status, details: txt });
    }

    const data = await r.json();

    // Валидация нужного минимума, чтобы не сломать фронт
    const item = data?.item;
    if (!item) return res.status(200).json({ ok: true, playing: false });

    const artists = (item.artists || []).map(a => a.name).filter(Boolean).join(", ");
    const cover = item.album?.images?.[0]?.url || null;

    return res.status(200).json({
      ok: true,
      playing: true,
      title: item.name,
      artists,
      cover,
      duration_ms: item.duration_ms,
      progress_ms: data.progress_ms,
      track_url: item.external_urls?.spotify || null,
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: "server_error", message: String(e?.message || e) });
  }
}
