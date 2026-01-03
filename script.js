const el = (id) => document.getElementById(id);

const OBS_MODE = new URLSearchParams(location.search).has("obs");

const player = el("player");
const empty = el("empty");
const cover = el("cover");
const title = el("trackLink");
const artist = el("artist");
const current = el("current");
const total = el("total");
const fill = el("fill");
const historyEl = el("history");
const clearBtn = el("clearHistory");

const aliveInline = el("aliveInline");
const localTimeEl = el("localTime");

const TZ = "Asia/Yekaterinburg";
const BIRTH = new Date("2010-08-05T00:00:00+05:00");
const HISTORY_KEY = "spotify_history_v2";

if (OBS_MODE) {
  document.body.style.background = "transparent";
  // Оставляем только spotify блок
  document.querySelectorAll(".top, .row, pre, .foot, .empty, h1, h2, h3")
    .forEach(n => {
      // не удаляем сам player
      if (n?.id === "player") return;
      if (n?.closest?.("#player")) return;
    });
}

function msToTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function updateAliveInline() {
  let diff = Math.floor((Date.now() - BIRTH.getTime()) / 1000);
  const d = Math.floor(diff / 86400); diff %= 86400;
  const h = Math.floor(diff / 3600); diff %= 3600;
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  aliveInline.textContent = `${d}d ${h}h ${m}m ${s}s`;
}

function updateLocalTime() {
  localTimeEl.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).format(new Date());
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
}

function setHistory(arr) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
}

function renderHistory() {
  const h = getHistory();
  historyEl.textContent = h.length
    ? h.map(t => `• ${t.title} — ${t.artist}`).join("\n")
    : "empty";
}

function pushHistory(track) {
  const h = getHistory();
  if (h[0]?.id === track.id) return;
  h.unshift(track);
  setHistory(h.slice(0, 10));
}

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
    title.textContent = data.title || "Unknown";
    title.href = data.track_url || "#";
    artist.textContent = data.artists || "";

    const p = Number(data.progress_ms || 0);
    const d = Number(data.duration_ms || 0);

    current.textContent = msToTime(p);
    total.textContent = msToTime(d);

    const percent = d > 0 ? Math.min(100, Math.max(0, (p / d) * 100)) : 0;
    fill.style.width = `${percent}%`;

    // history (browser only)
    pushHistory({ id: data.track_id || `${data.title}|${data.artists}`, title: data.title, artist: data.artists });
    renderHistory();
  } catch {
    player.classList.add("hidden");
    empty.classList.remove("hidden");
  }
}

clearBtn?.addEventListener("click", () => {
  setHistory([]);
  renderHistory();
});

setInterval(updateAliveInline, 1000);
setInterval(updateLocalTime, 1000);
setInterval(updateSpotify, 15000);

updateAliveInline();
updateLocalTime();
updateSpotify();
renderHistory();
