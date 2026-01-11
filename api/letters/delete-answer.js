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

  const raw = await redis("GET", `letter:${id}`);
  if (!raw) return res.json({ ok:false });

  const obj = JSON.parse(raw);
  delete obj.answer;
  obj.answered = false;

  await redis("SET", `letter:${id}`, JSON.stringify(obj));
  res.json({ ok:true });
}
