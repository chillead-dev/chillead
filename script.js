const TZ = "Asia/Yekaterinburg";
const BIRTH = new Date("2010-08-05T00:00:00+05:00");

const aliveInline = document.getElementById("aliveInline");
const localTimeEl = document.getElementById("localTime");

function updateAlive(){
  let diff = Math.floor((Date.now()-BIRTH.getTime())/1000);
  const d = Math.floor(diff/86400); diff%=86400;
  const h = Math.floor(diff/3600); diff%=3600;
  const m = Math.floor(diff/60);
  const s = diff%60;
  aliveInline.textContent = `${d}d ${h}h ${m}m ${s}s`;
}

function updateLocalTime(){
  localTimeEl.textContent = new Intl.DateTimeFormat("en-GB",{
    timeZone:TZ, hour:"2-digit", minute:"2-digit", second:"2-digit"
  }).format(new Date());
}

function msToTime(ms){
  const s = Math.max(0, Math.floor(ms/1000));
  const m = Math.floor(s/60);
  return `${m}:${String(s%60).padStart(2,"0")}`;
}

function timeAgo(ts){
  const sec = Math.floor((Date.now()-ts)/1000);
  if(sec < 60) return `${sec}s ago`;
  const m = Math.floor(sec/60);
  if(m < 60) return `${m}m ago`;
  const h = Math.floor(m/60);
  if(h < 24) return `${h}h ago`;
  const d = Math.floor(h/24);
  return `${d}d ago`;
}

/* ===== Spotify now playing ===== */
const npCard = document.getElementById("nowPlayingCard");
const npEmpty = document.getElementById("nowPlayingEmpty");
const npCover = document.getElementById("npCover");
const npTitle = document.getElementById("npTitle");
const npArtist = document.getElementById("npArtist");
const npCur = document.getElementById("npCur");
const npTot = document.getElementById("npTot");
const npFill = document.getElementById("npFill");

/* ===== History (local) ===== */
const HISTORY_KEY = "spotify_history_v3";
const historyWrap = document.getElementById("history");

function getHistory(){
  try{ return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch{ return []; }
}

function setHistory(items){
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
}

function pushHistory(track){
  const h = getHistory();
  if(h[0]?.id === track.id) return;
  h.unshift({ ...track, playedAt: Date.now() });
  setHistory(h.slice(0, 20));
}

function renderHistory(){
  const h = getHistory();
  historyWrap.innerHTML = "";

  if(h.length === 0){
    return;
  }

  for(const t of h){
    const card = document.createElement("div");
    card.className = "track-card";

    const img = document.createElement("img");
    img.src = t.cover || "";
    img.alt = "cover";

    const meta = document.createElement("div");
    meta.className = "track-meta";

    const title = document.createElement("div");
    title.className = "track-title";
    title.textContent = t.title || "Unknown";

    const artist = document.createElement("div");
    artist.className = "track-artist";
    artist.textContent = t.artist || "";

    meta.appendChild(title);
    meta.appendChild(artist);

    const ago = document.createElement("div");
    ago.className = "track-ago";
    ago.textContent = timeAgo(t.playedAt);

    card.appendChild(img);
    card.appendChild(meta);
    card.appendChild(ago);

    // optional: open spotify link on click
    if(t.url){
      card.style.cursor = "pointer";
      card.onclick = () => window.open(t.url, "_blank", "noopener,noreferrer");
    }

    historyWrap.appendChild(card);
  }
}

async function updateSpotify(){
  try{
    const r = await fetch("/api/now-playing", { cache:"no-store" });
    const data = await r.json();

    if(!data.ok || !data.playing){
      npCard.classList.add("hidden");
      npEmpty.classList.remove("hidden");
      return;
    }

    npEmpty.classList.add("hidden");
    npCard.classList.remove("hidden");

    npCover.src = data.cover || "";
    npTitle.textContent = data.title || "Unknown";
    npTitle.href = data.track_url || "#";
    npArtist.textContent = data.artists || "";

    const p = Number(data.progress_ms || 0);
    const d = Number(data.duration_ms || 0);

    npCur.textContent = msToTime(p);
    npTot.textContent = msToTime(d);
    npFill.style.width = d > 0 ? `${Math.min(100, Math.max(0, (p/d)*100))}%` : "0%";

    if(data.track_id){
      pushHistory({
        id: data.track_id,
        title: data.title,
        artist: data.artists,
        cover: data.cover,
        url: data.track_url
      });
      renderHistory();
    }
  }catch{
    npCard.classList.add("hidden");
    npEmpty.classList.remove("hidden");
  }
}

/* ===== Letterbox ===== */
const letterText = document.getElementById("letterText");
const sendLetter = document.getElementById("sendLetter");
const letterStatus = document.getElementById("letterStatus");
const hp = document.getElementById("lb_hp");

document.querySelectorAll(".emojis span").forEach(e=>{
  e.onclick = ()=> {
    letterText.value = (letterText.value + " " + e.textContent).trimStart();
    letterText.focus();
  };
});

sendLetter.onclick = async ()=>{
  letterStatus.textContent = "";

  // honeypot
  if(hp && hp.value.trim().length > 0){
    letterStatus.textContent = "sent.";
    letterText.value = "";
    return;
  }

  const msg = (letterText.value || "").trim();
  if(msg.length < 2){
    letterStatus.textContent = "too short.";
    return;
  }

  try{
    const r = await fetch("/api/letters/submit", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ message: msg })
    });
    const j = await r.json();
    if(j.ok){
      letterStatus.textContent = "sent for moderation.";
      letterText.value = "";
    }else{
      letterStatus.textContent = j.error || "error.";
    }
  }catch{
    letterStatus.textContent = "error.";
  }
};

/* ===== Approved letters list ===== */
const lettersList = document.getElementById("lettersList");

function clearNode(n){ while(n.firstChild) n.removeChild(n.firstChild); }

async function loadApprovedLetters(){
  try{
    const r = await fetch("/api/letters/list", { cache:"no-store" });
    const j = await r.json();

    if(!j.ok){
      lettersList.textContent = "failed to load.";
      return;
    }

    const items = j.items || [];
    if(items.length === 0){
      lettersList.textContent = "no approved messages yet.";
      return;
    }

    clearNode(lettersList);

    for(const it of items){
      const row = document.createElement("div");
      row.className = "letter-item";

      const msg = document.createElement("div");
      msg.className = "letter-msg";
      msg.textContent = it.message; // safe

      const tm = document.createElement("div");
      tm.className = "letter-time";
      tm.textContent = timeAgo(it.createdAt);

      row.appendChild(msg);
      row.appendChild(tm);
      lettersList.appendChild(row);
    }
  }catch{
    lettersList.textContent = "failed to load.";
  }
}

/* ===== init loops ===== */
setInterval(updateAlive, 1000);
setInterval(updateLocalTime, 1000);
setInterval(updateSpotify, 15000);

updateAlive();
updateLocalTime();
renderHistory();
updateSpotify();

loadApprovedLetters();
setInterval(loadApprovedLetters, 60000);
