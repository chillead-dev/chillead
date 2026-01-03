const el = (id) => document.getElementById(id);

const player = el("player");
const empty = el("empty");
const cover = el("cover");
const title = el("trackLink");
const artist = el("artist");
const current = el("current");
const total = el("total");
const fill = el("fill");
const historyEl = el("history");
const aliveEl = el("alive");
const localTimeEl = el("localTime");

const BIRTH = new Date("2010-08-05T00:00:00+05:00");
const TZ = "Asia/Yekaterinburg";
const HISTORY_KEY = "spotify_history_v1";

function msToTime(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

/* ===== alive timer ===== */
function updateAlive() {
  const now = new Date();
  let diff = Math.floor((now - BIRTH) / 1000);

  const d = Math.floor(diff / 86400); diff %= 86400;
  const h = Math.floor(diff / 3600); diff %= 3600;
  const m = Math.floor(diff / 60);
  const s = diff % 60;

  aliveEl.textContent = `since: 05.08.2010
format: ${d}d ${h}h ${m}m ${s}s`;
}

/* ===== local time ===== */
function updateLocalTime() {
  localTimeEl.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

/* ===== history ===== */
function getHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
}

function saveHistory(track) {
  const h = getHistory();
  if (h[0]?.title === track.title) return;
  h.unshift(track);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 10)));
}

function renderHistory() {
  const h = getHistory();
  historyEl.textContent = h.length
    ? h.map(t => `- ${t.title} — ${t.artist}`).join("\n")
    : "empty";
}

/* ===== spotify ===== */
async function fetchNowPlaying() {
  const r = await fetch("/api/now-playing", { cache: "no-store" });
  return r.json();
}

async function updateSpotify() {
  try {
    const data = await fetchNowPlaying();

    if (!data.ok || !data.playing) {
      player.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }

    empty.classList.add("hidden");
    player.classList.remove("hidden");

    cover.src = data.cover || "";
    title.textContent = data.title;
    title.href = data.track_url || "#";
    artist.textContent = data.artists;

    current.textContent = msToTime(data.progress_ms);
    total.textContent = msToTime(data.duration_ms);
    fill.style.width = `${(data.progress_ms / data.duration_ms) * 100}%`;

    saveHistory({ title: data.title, artist: data.artists });
    renderHistory();

  } catch {
    player.classList.add("hidden");
    empty.classList.remove("hidden");
  }
}

/* ===== loops ===== */
setInterval(updateAlive, 1000);
setInterval(updateLocalTime, 1000);
setInterval(updateSpotify, 15000);

updateAlive();
updateLocalTime();
updateSpotify();
renderHistory();
