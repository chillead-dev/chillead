import { redis, setHeaders } from "./_redis.js";

export default async function handler(req, res){
  setHeaders(res);

  if(req.method !== "GET"){
    return res.status(405).json({ ok:false, error:"method_not_allowed" });
  }

  try{
    const raw = (await redis("LRANGE", "letters:approved", 0, 30)) || [];
    const items = [];

    for(const s of raw){
      try{
        const o = JSON.parse(s);
        if(o?.message && o?.createdAt){
          items.push({
            id: o.id,
            message: o.message,
            createdAt: Number(o.createdAt),
            answered: !!o.answered,
            answer: o.answer || null,
            answeredAt: o.answeredAt ? Number(o.answeredAt) : null
          });
        }
      }catch{}
    }

    return res.status(200).json({ ok:true, items });
  }catch(e){
    return res.status(200).json({ ok:false, error:"server_error", message:String(e?.message||e) });
  }
}
