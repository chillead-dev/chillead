"use strict";

/* ===== alive timer ===== */
const born = new Date("2010-08-05T00:00:00Z");

function updateAlive() {
  const el = document.getElementById("alive");
  if (!el) return;

  let diff = Math.floor((Date.now() - born.getTime()) / 1000);
  const days = Math.floor(diff / 86400);
  diff -= days * 86400;
  const hours = Math.floor(diff / 3600);
  diff -= hours * 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;

  el.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

updateAlive();
setInterval(updateAlive, 1000);

/* ===== local time ===== */

function updateTime() {
  const t = document.getElementById("time");
  if (!t) return;

  t.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Yekaterinburg",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}

updateTime();
setInterval(updateTime, 1000);

/* ===== Spotify now playing + local history ===== */

const STORAGE_KEY = "__local_track_history__";
const player = document.getElementById("player");
const recentEl = document.getElementById("recent");

function safeGetHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeSetHistory(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage errors
  }
}

function timeAgo(ts) {
  const diffMinutes = Math.floor((Date.now() - ts) / 60000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const h = Math.floor(diffMinutes / 60);
  return `${h}h ago`;
}

function addToHistory(track) {
  const list = safeGetHistory();
  if (list[0] && list[0].id === track.id) return;

  const updated = [
    { ...track, played_at: Date.now() },
    ...list
  ].slice(0, 12);

  safeSetHistory(updated);
}

function renderHistory() {
  if (!recentEl) return;

  const list = safeGetHistory();
  recentEl.innerHTML = "";

  if (list.length === 0) {
    const span = document.createElement("span");
    span.className = "muted";
    span.textContent = "no history yet";
    recentEl.appendChild(span);
    return;
  }

  list.forEach(t => {
    const item = document.createElement("div");
    item.className = "recent-item";

    const img = document.createElement("img");
    img.className = "recent-cover";
    img.src = t.cover || "";
    img.alt = "cover";

    const title = document.createElement("div");
    title.className = "recent-title";
    title.textContent = t.title;

    const artist = document.createElement("div");
    artist.className = "recent-artist";
    artist.textContent = t.artist;

    const when = document.createElement("div");
    when.className = "recent-time";
    when.textContent = timeAgo(t.played_at);

    item.appendChild(img);
    item.appendChild(title);
    item.appendChild(artist);
    item.appendChild(when);

    recentEl.appendChild(item);
  });
}

async function loadNowPlaying() {
  try {
    const res = await fetch("/api/now-playing", { cache: "no-store" });
    if (!res.ok) {
      player.classList.add("loading");
      return;
    }

    const data = await res.json();

    if (!data || data.playing !== true) {
      player.classList.add("loading");

      const title = player.querySelector(".now-title");
      const artist = player.querySelector(".now-artist");
      const bar = player.querySelector(".now-bar-fill");
      const cover = player.querySelector(".now-cover");
      const bg = player.querySelector(".now-bg");

      title.textContent = "not listening right now";
      artist.textContent = "";
      bar.style.width = "0%";
      cover.src = "";
      bg.style.backgroundImage = "none";

      return;
    }

    player.classList.remove("loading");

    const { id, title, artist, cover, progress, duration } = data;

    const bg = player.querySelector(".now-bg");
    const img = player.querySelector(".now-cover");
    const titleEl = player.querySelector(".now-title");
    const artistEl = player.querySelector(".now-artist");
    const bar = player.querySelector(".now-bar-fill");

    if (cover) {
      bg.style.backgroundImage = `url(${cover})`;
      img.src = cover;
    } else {
      bg.style.backgroundImage = "none";
      img.src = "";
    }

    titleEl.textContent = title;
    artistEl.textContent = artist;

    const pct = Math.max(
      0,
      Math.min(100, (progress / (duration || 1)) * 100)
    );
    bar.style.width = `${pct}%`;

    addToHistory({
      id: id || `${title}-${artist}`,
      title,
      artist,
      cover
    });

    renderHistory();
  } catch (e) {
    console.error("loadNowPlaying error:", e);
    player.classList.add("loading");
  }
}

renderHistory();
loadNowPlaying();
setInterval(loadNowPlaying, 15000);
