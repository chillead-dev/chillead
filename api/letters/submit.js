import { redis, setHeaders, cleanMessage, makeId } from "./_redis.js";

export default async function handler(req, res){
  setHeaders(res);

  if(req.method !== "POST"){
    return res.status(405).json({ ok:false, error:"method_not_allowed" });
  }

  try{
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const msg = cleanMessage(body?.message || "");

    if(msg.length < 2){
      return res.status(200).json({ ok:false, error:"too_short" });
    }

    const item = { id: makeId(), message: msg, createdAt: Date.now() };

    await redis("LPUSH", "letters:pending", JSON.stringify(item));
    await redis("LTRIM", "letters:pending", 0, 200);

    return res.status(200).json({ ok:true });
  }catch(e){
    return res.status(200).json({ ok:false, error:"server_error", message:String(e?.message||e) });
  }
}
