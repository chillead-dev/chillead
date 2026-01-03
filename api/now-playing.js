const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token";
const NOW_PLAYING_ENDPOINT = "https://api.spotify.com/v1/me/player/currently-playing";

const bucket = new Map(); // ip -> {count, ts}

function rateLimit(req, limit = 30, windowMs = 60_000) {
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
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  // CORS не открываем
  res.setHeader("Access-Control-Allow-Origin", "null");
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

  if (!rateLimit(req, 30, 60_000)) {
    return res.status(429).json({ ok: false, error: "rate_limited" });
  }

  try {
    const accessToken = await getAccessToken();

    const r = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (r.status === 204) {
      return res.status(200).json({ ok: true, playing: false });
    }

    if (!r.ok) {
      return res.status(200).json({ ok: false, error: "spotify_error", status: r.status });
    }

    const data = await r.json();
    const item = data?.item;

    if (!item) return res.status(200).json({ ok: true, playing: false });

    const artists = (item.artists || []).map(a => a.name).filter(Boolean).join(", ");
    const cover = item.album?.images?.[0]?.url || null;

    return res.status(200).json({
      ok: true,
      playing: true,
      track_id: item.id || null,
      title: item.name || "Unknown",
      artists,
      cover,
      duration_ms: item.duration_ms || 0,
      progress_ms: data.progress_ms || 0,
      track_url: item.external_urls?.spotify || null,
    });
  } catch (e) {
    return res.status(200).json({ ok: false, error: "server_error" });
  }
}
