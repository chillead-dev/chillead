const el = id => document.getElementById(id);

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
  try{
    return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
  }catch{
    return [];
  }
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

function saveHistory(track){
  const h = getHistory();
  if(h[0]?.id === track.id) return;
  h.unshift({...track, playedAt: Date.now()});
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0,10)));
}

function renderHistory(){
  const h = getHistory();
  historyEl.innerHTML = h.length
    ? h.map(t => `
        <div class="history-line">
          <span>${t.title} — ${t.artist}</span>
          <span class="history-time">${timeAgo(t.playedAt)}</span>
        </div>
      `).join("")
    : "empty";
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

    cover.src = data.cover;
    title.textContent = data.title;
    title.href = data.track_url;
    artist.textContent = data.artists;

    current.textContent = msToTime(data.progress_ms);
    total.textContent = msToTime(data.duration_ms);
    fill.style.width = `${(data.progress_ms/data.duration_ms)*100}%`;

    saveHistory({ id:data.track_id, title:data.title, artist:data.artists });
    renderHistory();
  }catch{
    player.classList.add("hidden");
    empty.classList.remove("hidden");
  }
}

setInterval(updateAlive,1000);
setInterval(updateLocalTime,1000);
setInterval(updateSpotify,15000);

updateAlive();
updateLocalTime();
updateSpotify();
renderHistory();
