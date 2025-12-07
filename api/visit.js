import crypto from "crypto";

const seen = new Set();
let count = 0;

export default function handler(req, res) {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    "unknown";

  const hash = crypto.createHash("sha256").update(ip).digest("hex");

  if (!seen.has(hash)) {
    seen.add(hash);
    count++;
  }

  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ count });
}
