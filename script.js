const el = id => document.getElementById(id);

/* ===== spotify now playing + history ===== */
const player = el("player");
const empty = el("empty");
const cover = el("cover");
const title = el("trackLink");
const artist = el("artist");
const current = el("current");
const total = el("total");
const fill = el("fill");
const historyEl = el("history");

const aliveInline = el("aliveInline");
const localTimeEl = el("localTime");

const TZ = "Asia/Yekaterinburg";
const BIRTH = new Date("2010-08-05T00:00:00+05:00");
const HISTORY_KEY = "spotify_history";

function msToTime(ms){
  const s = Math.floor(ms/1000);
  const m = Math.floor(s/60);
  return `${m}:${String(s%60).padStart(2,"0")}`;
}

function timeAgo(ts){
  const s = Math.floor((Date.now()-ts)/1000);
  if(s < 60) return `${s}s ago`;
  const m = Math.floor(s/60);
  if(m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if(h < 24) return `${h}h ago`;
  const d = Math.floor(h/24);
  return `${d}d ago`;
}

function updateAlive(){
  let diff = Math.floor((Date.now()-BIRTH)/1000);
  const d = Math.floor(diff/86400); diff%=86400;
  const h = Math.floor(diff/3600); diff%=3600;
  const m = Math.floor(diff/60);
  const s = diff%60;
  aliveInline.textContent = `${d}d ${h}h ${m}m ${s}s`;
}

function updateLocalTime(){
  localTimeEl.textContent = new Intl.DateTimeFormat("en-GB",{
    timeZone:TZ,hour:"2-digit",minute:"2-digit",second:"2-digit"
  }).format(new Date());
}

function getHistory(){
  try{ return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]"); }
  catch{ return []; }
}

function saveHistory(track){
  const h = getHistory();
  if(h[0]?.id === track.id) return;
  h.unshift({ ...track, playedAt: Date.now() });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0,10)));
}

function clearNode(node){
  while(node.firstChild) node.removeChild(node.firstChild);
}

function renderHistory(){
  const h = getHistory();
  if(!historyEl) return;

  if(h.length === 0){
    historyEl.textContent = "empty";
    return;
  }

  clearNode(historyEl);

  for(const t of h){
    const row = document.createElement("div");
    row.className = "history-line";

    const left = document.createElement("span");
    left.textContent = `${t.title} — ${t.artist}`;

    const right = document.createElement("span");
    right.className = "history-time";
    right.textContent = timeAgo(t.playedAt);

    row.appendChild(left);
    row.appendChild(right);
    historyEl.appendChild(row);
  }
}

async function updateSpotify(){
  try{
    const r = await fetch("/api/now-playing",{cache:"no-store"});
    const data = await r.json();

    if(!data.ok || !data.playing){
      player.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    player.classList.remove("hidden");

    cover.src = data.cover || "";
    title.textContent = data.title || "Unknown";
    title.href = data.track_url || "#";
    artist.textContent = data.artists || "";

    current.textContent = msToTime(data.progress_ms || 0);
    total.textContent = msToTime(data.duration_ms || 0);

    const d = Number(data.duration_ms || 0);
    const p = Number(data.progress_ms || 0);
    fill.style.width = d > 0 ? `${Math.min(100, Math.max(0, (p/d)*100))}%` : "0%";

    if(data.track_id){
      saveHistory({ id: data.track_id, title: data.title, artist: data.artists });
      renderHistory();
    }
  }catch{
    player.classList.add("hidden");
    empty.classList.remove("hidden");
  }
}

/* ===== letterbox client ===== */
const lettersList = document.getElementById("lettersList");
const letterForm = document.getElementById("letterForm");
const letterText = document.getElementById("letterText");
const lbCount = document.getElementById("lbCount");
const lbStatus = document.getElementById("lbStatus");
const lbWebsite = document.getElementById("lb_website");

function timeAgoShort(ts){
  const s = Math.floor((Date.now()-ts)/1000);
  if(s < 60) return `${s}s`;
  const m = Math.floor(s/60);
  if(m < 60) return `${m}m`;
  const h = Math.floor(m/60);
  if(h < 24) return `${h}h`;
  const d = Math.floor(h/24);
  return `${d}d`;
}

function clearLetters(){
  if(!lettersList) return;
  while(lettersList.firstChild) lettersList.removeChild(lettersList.firstChild);
}

async function loadApprovedLetters(){
  if(!lettersList) return;

  try{
    const r = await fetch("/api/letters/list", { cache:"no-store" });
    const data = await r.json();

    if(!data.ok){
      lettersList.textContent = "failed to load.";
      return;
    }

    const items = data.items || [];
    if(items.length === 0){
      lettersList.textContent = "no approved messages yet.";
      return;
    }

    clearLetters();

    for(const it of items){
      const row = document.createElement("div");
      row.className = "letter-item";

      const msg = document.createElement("div");
      msg.className = "letter-msg";
      msg.textContent = it.message; // textContent = safe (no HTML)

      const tm = document.createElement("div");
      tm.className = "letter-time";
      tm.textContent = `${timeAgoShort(it.createdAt)} ago`;

      row.appendChild(msg);
      row.appendChild(tm);
      lettersList.appendChild(row);
    }
  }catch{
    lettersList.textContent = "failed to load.";
  }
}

if(letterText && lbCount){
  const updateCount = () => lbCount.textContent = String(letterText.value.length);
  letterText.addEventListener("input", updateCount);
  updateCount();
}

if(letterForm){
  letterForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if(lbStatus) lbStatus.textContent = "";

    // honeypot
    if(lbWebsite && lbWebsite.value.trim().length > 0){
      if(lbStatus) lbStatus.textContent = "submitted.";
      letterForm.reset();
      if(lbCount) lbCount.textContent = "0";
      return;
    }

    const msg = (letterText?.value || "").trim();
    if(msg.length < 3){
      if(lbStatus) lbStatus.textContent = "message is too short.";
      return;
    }

    try{
      const r = await fetch("/api/letters/submit", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ message: msg })
      });

      const data = await r.json();
      if(data.ok){
        if(lbStatus) lbStatus.textContent = "submitted. will appear after moderation.";
        letterForm.reset();
        if(lbCount) lbCount.textContent = "0";
      }else{
        if(lbStatus) lbStatus.textContent = data.error || "failed.";
      }
    }catch{
      if(lbStatus) lbStatus.textContent = "failed.";
    }
  });
}

/* ===== loops ===== */
setInterval(updateAlive, 1000);
setInterval(updateLocalTime, 1000);
setInterval(updateSpotify, 15000);

updateAlive();
updateLocalTime();
updateSpotify();
renderHistory();

loadApprovedLetters();
setInterval(loadApprovedLetters, 60000);
