function endpoint(){
  const base = process.env.UPSTASH_REDIS_REST_URL;
  if(!base) return null;
  const clean = base.replace(/\/+$/, "");
  return clean.endsWith("/pipeline") ? clean : `${clean}/pipeline`;
}

async function redis(cmd, ...args){
  const url = endpoint();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url || !token) throw new Error("missing_upstash_env");

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type":"application/json"
    },
    body: JSON.stringify([[cmd, ...args]])
  });

  const data = await r.json();
  return data?.[0]?.result;
}

function setSecHeaders(res){
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "null");
}

function originOk(req){
  const origin = req.headers.origin || "";
  const host = req.headers.host || "";
  if(!origin) return true;
  try{
    const o = new URL(origin);
    return o.host === host;
  }catch{
    return false;
  }
}

const bucket = new Map();
function rateLimit(req, limit = 8, windowMs = 60_000){
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const cur = bucket.get(ip) || { c:0, ts: now };
  if(now - cur.ts > windowMs){ cur.c = 0; cur.ts = now; }
  cur.c += 1;
  bucket.set(ip, cur);
  return cur.c <= limit;
}

function cleanMessage(s){
  const t = String(s || "").replace(/\r/g, "").trim();
  const safe = t.replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E]/g, "");
  return safe.slice(0, 500);
}

function makeId(){
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function requireAdmin(req){
  const expected = process.env.ADMIN_TOKEN;
  const auth = req.headers.authorization || "";
  if(!expected) return false;
  return auth === `Bearer ${expected}`;
}

export { redis, setSecHeaders, originOk, rateLimit, cleanMessage, makeId, requireAdmin };
