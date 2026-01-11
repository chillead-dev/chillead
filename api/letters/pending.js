import { redis, setSecHeaders, requireAdmin } from "./_redis.js";

export default async function handler(req, res){
  setSecHeaders(res);

  if(req.method !== "GET") return res.status(405).json({ ok:false, error:"method_not_allowed" });
  if(!requireAdmin(req)) return res.status(403).json({ ok:false, error:"forbidden" });

  try{
    const raw = (await redis("LRANGE", "letters:pending", 0, 50)) || [];
    const items = [];
    for(const s of raw){
      try{
        const o = JSON.parse(s);
        if(o?.id && o?.message){
          items.push({ id:o.id, message:o.message, createdAt:o.createdAt });
        }
      }catch{}
    }
    return res.status(200).json({ ok:true, items });
  }catch{
    return res.status(200).json({ ok:false, error:"server_error" });
  }
}
