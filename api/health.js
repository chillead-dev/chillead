export default function handler(req, res){
  res.setHeader("Content-Type","application/json");
  res.setHeader("Cache-Control","no-store");

  res.json({
    ok: true,
    service: "letterbox",
    time: Date.now()
  });
}
