import crypto from "crypto";

const used = new Set();
const reactions = { like: 0, love: 0, fire: 0, skull: 0 };

export default function handler(req, res) {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || "x";
  const hash = crypto.createHash("sha256").update(ip).digest("hex");

  if (req.method === "POST") {
    if (!used.has(hash)) {
      const { type } = req.body || {};
      if (reactions[type] !== undefined) {
        reactions[type]++;
        used.add(hash);
      }
    }
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json(reactions);
}
