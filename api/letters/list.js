import { redis, setSecHeaders } from "./_redis.js";

export default async function handler(req, res){
  setSecHeaders(res);

  if(req.method !== "GET") return res.status(405).json({ ok:false, error:"method_not_allowed" });

  try{
    const raw = (await redis("LRANGE", "letters:approved", 0, 30)) || [];
    const items = [];

    for(const s of raw){
      try{
        const o = JSON.parse(s);
        if(o?.message && o?.createdAt){
          items.push({ message: String(o.message).slice(0,500), createdAt: Number(o.createdAt) });
        }
      }catch{}
    }

    return res.status(200).json({ ok:true, items });
  }catch{
    return res.status(200).json({ ok:false, error:"server_error" });
  }
}
