export default function handler(req, res){
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).json({
    ok: true,
    service: "hatesocial-api",
    time: Date.now()
  });
}
