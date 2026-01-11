import { redis, setHeaders, requireAdmin } from "./_redis.js";

export default async function handler(req, res){
  setHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({ ok:false, error:"method_not_allowed" });
  }
  if (!requireAdmin(req)) {
    return res.status(403).json({ ok:false, error:"forbidden" });
  }

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const id = String(body?.id || "").trim();
    if(!id) return res.status(200).json({ ok:false, error:"missing_id" });

    const pending = (await redis("LRANGE", "letters:pending", 0, -1)) || [];

    let foundRaw = null;
    let foundObj = null;

    for(const raw of pending){
      if(!raw) continue;
      try{
        const o = JSON.parse(raw);
        if(o?.id === id){
          foundRaw = raw;
          foundObj = o;
          break;
        }
      }catch{}
    }

    if(!foundRaw || !foundObj){
      return res.status(200).json({ ok:false, error:"not_found" });
    }

    // remove from pending
    await redis("LREM", "letters:pending", 1, foundRaw);

    // push to approved (preserve id/message/createdAt)
    const approvedItem = {
      id: foundObj.id,
      message: foundObj.message,
      createdAt: Number(foundObj.createdAt) || Date.now(),
      approvedAt: Date.now(),
      answered: !!foundObj.answered,
      answer: foundObj.answer || null,
      answeredAt: foundObj.answeredAt || null
    };

    await redis("LPUSH", "letters:approved", JSON.stringify(approvedItem));
    await redis("LTRIM", "letters:approved", 0, 200);

    return res.status(200).json({ ok:true });
  }catch(e){
    return res.status(200).json({ ok:false, error:"server_error", message:String(e?.message||e) });
  }
}
