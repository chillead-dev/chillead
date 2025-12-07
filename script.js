"use strict";

/* ===== alive ===== */
const born = new Date("2010-08-05T00:00:00Z");
setInterval(() => {
  const el = document.getElementById("alive");
  if (!el) return;

  let d = Math.floor((Date.now() - born) / 1000);
  const days = Math.floor(d / 86400);
  d %= 86400;
  const h = Math.floor(d / 3600);
  d %= 3600;
  const m = Math.floor(d / 60);
  const s = d % 60;

  el.textContent = `${days}d ${h}h ${m}m ${s}s`;
}, 1000);

/* ===== local time ===== */
setInterval(() => {
  const t = document.getElementById("time");
  if (!t) return;

  t.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Yekaterinburg",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}, 1000);

/* ===== Spotify widget + local history ===== */

const STORAGE_KEY = "__track_history__";
const player = document.getElementById("player");
const recentEl = document.getElementById("recent");

/* helpers */

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff} min ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

function saveToHistory(track) {
  let list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

  if (list[0]?.id === track.id) return;

  list.unshift({
    ...track,
    played_at: Date.now()
  });

  list = list.slice(0, 12);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function renderHistory() {
  if (!recentEl) return;

  const list = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  recentEl.innerHTML = "";

  if (list.length === 0) {
    recentEl.textContent = "no history yet";
    return;
  }

  list.forEach(t => {
    const div = document.createElement("div");
    div.className = "recent-item";
    div.innerHTML = `
      <img src="${t.cover}" class="recent-cover">
      <div class="recent-title">${t.title}</div>
      <div class="recent-artist">${t.artist}</div>
      <div class="recent-time">${timeAgo(t.played_at)}</div>
    `;
    recentEl.appendChild(div);
  });
}

/* now playing */

async function loadNow() {
  try {
    const r = await fetch("/api/now-playing", { cache: "no-store" });
    const d = await r.json();

    if (!d || d.playing !== true) {
      player.classList.add("loading");
      return;
    }

    player.classList.remove("loading");

    const bg = player.querySelector(".now-bg");
    const cover = player.querySelector(".now-cover");
    const title = player.querySelector(".now-title");
    const artist = player.querySelector(".now-artist");
    const bar = player.querySelector(".now-bar-fill");

    bg.style.backgroundImage = `url(${d.cover})`;
    cover.src = d.cover;
    title.textContent = d.title;
    artist.textContent = d.artist;
    bar.style.width = `${(d.progress / d.duration) * 100}%`;

    saveToHistory({
      id: d.title + d.artist,
      title: d.title,
      artist: d.artist,
      cover: d.cover
    });

    renderHistory();
  } catch (e) {
    console.error("spotify error", e);
  }
}

loadNow();
renderHistory();
setInterval(loadNow, 15000);
