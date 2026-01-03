const el = (id) => document.getElementById(id);

const player = el("player");
const empty = el("empty");
const cover = el("cover");
const title = el("trackLink");
const artist = el("artist");
const current = el("current");
const total = el("total");
const fill = el("fill");

function msToTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

async function fetchNowPlaying() {
  const r = await fetch("/api/now-playing", { cache: "no-store" });
  return r.json();
}

async function tick() {
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
  } catch (e) {
    // если что-то упало — просто показываем пустое
    player.classList.add("hidden");
    empty.classList.remove("hidden");
  }
}

// обновление раз в 3 секунды — нормально и не душит API
tick();
setInterval(tick, 3000);
