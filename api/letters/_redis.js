function pipelineUrl(){
  const base = process.env.UPSTASH_REDIS_REST_URL;
  if(!base) return null;
  const clean = base.replace(/\/+$/, "");
  return clean.endsWith("/pipeline") ? clean : `${clean}/pipeline`;
}

async function redis(cmd, ...args){
  const url = pipelineUrl();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url || !token) throw new Error("missing_upstash_env");

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify([[cmd, ...args]])
  });

  const data = await r.json().catch(() => null);
  if(!data || !Array.isArray(data)) throw new Error("bad_upstash_response");
  return data?.[0]?.result;
}

function setHeaders(res){
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Cache-Control","no-store, max-age=0");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  res.setHeader("X-Frame-Options","DENY");
  res.setHeader("Permissions-Policy","geolocation=(), microphone=(), camera=()");
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

export { redis, setHeaders, cleanMessage, makeId, requireAdmin };
