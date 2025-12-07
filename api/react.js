let reactions = {
  like: 0,
  love: 0,
  fire: 0,
  skull: 0
};

export default function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "POST") {
    const { type } = req.body || {};
    if (reactions[type] !== undefined) {
      reactions[type]++;
    }
  }

  res.status(200).json(reactions);
}
