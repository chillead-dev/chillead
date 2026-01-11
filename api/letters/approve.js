import { redis, setSecHeaders, requireAdmin } from "./_redis.js";

export default async function handler(req, res){
  setSecHeaders(res);

  if(req.method !== "POST") return res.status(405).json({ ok:false, error:"method_not_allowed" });
  if(!requireAdmin(req)) return res.status(403).json({ ok:false, error:"forbidden" });

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const id = String(body?.id || "").trim();
    if(!id) return res.status(200).json({ ok:false, error:"missing_id" });

    const raw = (await redis("LRANGE", "letters:pending", 0, 200)) || [];
    let foundStr = null;
    let foundObj = null;

    for(const s of raw){
      try{
        const o = JSON.parse(s);
        if(o?.id === id){
          foundStr = s;
          foundObj = o;
          break;
        }
      }catch{}
    }

    if(!foundStr || !foundObj){
      return res.status(200).json({ ok:false, error:"not_found" });
    }

    // push to approved (keep createdAt)
    await redis("LPUSH", "letters:approved", JSON.stringify(foundObj));
    await redis("LTRIM", "letters:approved", 0, 200);

    // remove from pending by exact string match
    await redis("LREM", "letters:pending", 1, foundStr);

    return res.status(200).json({ ok:true });
  }catch{
    return res.status(200).json({ ok:false, error:"server_error" });
  }
}
