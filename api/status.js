import { redis, setHeaders } from "./letters/_redis.js";

export default async function handler(req, res){
  setHeaders(res);

  try{
    const ping = await redis("PING");
    const pending = await redis("LLEN","letters:pending");
    const approved = await redis("LLEN","letters:approved");
    res.status(200).json({
      ok:true,
      redis: ping || "ok",
      letters:{ pending:Number(pending||0), approved:Number(approved||0) },
      time: Date.now()
    });
  }catch(e){
    res.status(200).json({ ok:false, error:"status_failed", message:String(e?.message||e) });
  }
}
