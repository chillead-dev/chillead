import { redis, setHeaders, requireAdmin } from "./_redis.js";

export default async function handler(req, res){
  setHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({ ok:false });
  }
  if (!requireAdmin(req)) {
    return res.status(403).json({ ok:false });
  }

  const { id } = req.body;
  if (!id) return res.json({ ok:false });

  await redis("DEL", `letter:${id}`);
  await redis("LREM", "letters:pending", 0, id);
  await redis("LREM", "letters:approved", 0, id);

  res.json({ ok:true });
}
