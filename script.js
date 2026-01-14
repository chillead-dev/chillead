/* ===== time ===== */
const startDate = new Date("2010-08-05T00:00:00Z");

function updateTime(){
  const now = new Date();
  document.getElementById("localTime").textContent =
    now.toLocaleTimeString();

  const diff = Math.floor((now - startDate) / 1000);
  const d = Math.floor(diff / 86400);
  const h = Math.floor(diff % 86400 / 3600);
  const m = Math.floor(diff % 3600 / 60);
  const s = diff % 60;

  document.getElementById("alive").textContent =
    `${d}d ${h}h ${m}m ${s}s`;
}
setInterval(updateTime,1000);
updateTime();

/* ===== spotify now playing ===== */
async function renderSpotify(){
  const box = document.getElementById("spotifyText");
  try{
    const r = await fetch("/api/now-playing");
    const d = await r.json();

    if(!d || !d.isPlaying){
      box.textContent = "status: not listening right now";
      return;
    }

    const cur = Math.floor(d.progressMs/1000);
    const dur = Math.floor(d.durationMs/1000);
    const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;

    const barLen = 30;
    const filled = Math.floor((cur/dur)*barLen);

    box.textContent =
`track: ${d.title}
artist: ${d.artist}
time: ${fmt(cur)} / ${fmt(dur)}
status: playing

[${"█".repeat(filled)}${"░".repeat(barLen-filled)}]`;
  }catch{
    box.textContent = "error: failed to load spotify";
  }
}
renderSpotify();
setInterval(renderSpotify,15000);

/* ===== history ===== */
async function renderHistory(){
  const box = document.getElementById("historyText");
  try{
    const r = await fetch("/api/history");
    const list = await r.json();

    if(!Array.isArray(list) || !list.length){
      box.textContent = "empty";
      return;
    }

    box.textContent = list.map(t =>
`- ${t.title} — ${t.artist} (${t.ago})`
    ).join("\n");
  }catch{
    box.textContent = "error: failed to load history";
  }
}
renderHistory();
