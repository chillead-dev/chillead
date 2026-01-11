import {
  redis,
  setHeaders,
  requireAdmin,
  cleanMessage
} from "./_redis.js";

export default async function handler(req, res){
  setHeaders(res);

  if(req.method !== "POST")
    return res.status(405).json({ ok:false, error:"method_not_allowed" });

  if(!requireAdmin(req))
    return res.status(403).json({ ok:false, error:"forbidden" });

  try{
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const id = String(body?.id || "").trim();
    const answer = cleanMessage(body?.answer || "");

    if(!id || answer.length < 1)
      return res.json({ ok:false, error:"invalid_data" });

    const raw = await redis("LRANGE", "letters:approved", 0, 200);

    let index = -1;
    let item = null;

    for(let i = 0; i < raw.length; i++){
      const o = JSON.parse(raw[i]);
      if(o.id === id){
        index = i;
        item = o;
        break;
      }
    }

    if(index === -1 || !item)
      return res.json({ ok:false, error:"not_found" });

    item.answered = true;
    item.answer = answer;
    item.answeredAt = Date.now();

    await redis(
      "LSET",
      "letters:approved",
      index,
      JSON.stringify(item)
    );

    return res.json({ ok:true });
  }catch{
    return res.json({ ok:false, error:"server_error" });
  }
}
