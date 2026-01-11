import { redis, setSecHeaders, originOk, rateLimit, cleanMessage, makeId } from "./_redis.js";

export default async function handler(req, res){
  setSecHeaders(res);

  if(req.method !== "POST") return res.status(405).json({ ok:false, error:"method_not_allowed" });
  if(!originOk(req)) return res.status(403).json({ ok:false, error:"bad_origin" });
  if(!rateLimit(req)) return res.status(429).json({ ok:false, error:"rate_limited" });

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const msg = cleanMessage(body?.message || "");

    if(msg.length < 3) return res.status(200).json({ ok:false, error:"too_short" });

    const item = { id: makeId(), message: msg, createdAt: Date.now() };

    await redis("LPUSH", "letters:pending", JSON.stringify(item));
    await redis("LTRIM", "letters:pending", 0, 200);

    return res.status(200).json({ ok:true });
  }catch{
    return res.status(200).json({ ok:false, error:"server_error" });
  }
}
