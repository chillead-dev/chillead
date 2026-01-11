import { redis, setHeaders, requireAdmin } from "./_redis.js";

export default async function handler(req, res){
  setHeaders(res);

  if (req.method !== "GET") {
    return res.status(405).json({ ok:false, error:"method_not_allowed" });
  }

  if (!requireAdmin(req)) {
    return res.status(403).json({ ok:false, error:"forbidden" });
  }

  try {
    const raw = await redis("LRANGE", "letters:pending", 0, 30);

    if (!raw || !Array.isArray(raw)) {
      return res.status(200).json({ ok:true, items: [] });
    }

    const items = [];

    for (const s of raw) {
      if (!s) continue;
      try {
        const o = JSON.parse(s);
        if (o && o.id && o.message && o.createdAt) {
          items.push({
            id: o.id,
            message: o.message,
            createdAt: Number(o.createdAt)
          });
        }
      } catch {
        // пропускаем битые записи
        continue;
      }
    }

    return res.status(200).json({ ok:true, items });

  } catch (e) {
    return res.status(200).json({
      ok:false,
      error:"server_error",
      message: String(e?.message || e)
    });
  }
}
