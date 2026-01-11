import { redis, setHeaders, requireAdmin } from "./_redis.js";

export default async function handler(req, res){
  setHeaders(res);

  if (req.method !== "POST") {
    return res.status(405).json({ ok:false, error:"method_not_allowed" });
  }

  if (!requireAdmin(req)) {
    return res.status(403).json({ ok:false, error:"forbidden" });
  }

  try {
    const body = typeof req.body === "string"
      ? JSON.parse(req.body)
      : req.body;

    const id = body?.id;
    if (!id) {
      return res.status(200).json({ ok:false, error:"missing_id" });
    }

    const pending = await redis("LRANGE", "letters:pending", 0, -1);

    let approvedItem = null;

    for (const raw of pending) {
      if (!raw) continue;

      let item;
      try {
        item = JSON.parse(raw);
      } catch {
        continue;
      }

      if (item.id === id) {
        approvedItem = item;
        await redis("LREM", "letters:pending", 1, raw);
        break;
      }
    }

    if (!approvedItem) {
      return res.status(200).json({ ok:false, error:"not_found" });
    }

    approvedItem.approvedAt = Date.now();
    approvedItem.answered = false;

    await redis(
      "LPUSH",
      "letters:approved",
      JSON.stringify(approvedItem)
    );

    return res.status(200).json({ ok:true });

  } catch (e) {
    return res.status(200).json({
      ok:false,
      error:"server_error",
      message: String(e?.message || e)
    });
  }
}
