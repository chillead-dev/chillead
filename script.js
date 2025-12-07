"use strict";

/* alive */
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

/* local time */
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

/* currently playing */
const player = document.getElementById("player");

function renderNow(d) {
  player.innerHTML = `
    <img class="cover" src="${d.cover}">
    <div>
      <div class="title">${d.title}</div>
      <div class="artist">${d.artist}</div>
      <div class="progress">
        <div class="fill" style="width:${(d.progress / d.duration) * 100}%"></div>
      </div>
    </div>
  `;
}

async function loadNow() {
  const r = await fetch("/api/now-playing", { cache: "no-store" });
  const d = await r.json();
  if (!d.playing) {
    player.textContent = "not listening now";
    return;
  }
  renderNow(d);
}

loadNow();
setInterval(loadNow, 15000);

/* 🎵 history */
const recentEl = document.getElementById("recent");

function timeAgo(ts) {
  const m = Math.floor((Date.now() - ts) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  return `${Math.floor(m / 60)}h ago`;
}

async function loadHistory() {
  const r = await fetch("/api/history", { cache: "no-store" });
  const list = await r.json();

  recentEl.innerHTML = "";

  list.forEach(t => {
    const d = document.createElement("div");
    d.className = "recent-item";
    d.innerHTML = `
      <img class="recent-cover" src="${t.cover}">
      <div class="recent-title">${t.title}</div>
      <div class="recent-artist">${t.artist}</div>
      <div class="recent-time">${timeAgo(t.played_at)}</div>
    `;
    recentEl.appendChild(d);
  });
}

loadHistory();
setInterval(loadHistory, 20000);
