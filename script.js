"use strict";

/* alive */
const born = new Date("2010-08-05T00:00:00Z");
setInterval(() => {
  const el = document.getElementById("alive");
  let d = Math.floor((Date.now() - born) / 1000);
  const days = Math.floor(d / 86400);
  d %= 86400;
  const h = Math.floor(d / 3600);
  d %= 3600;
  const m = Math.floor(d / 60);
  const s = d % 60;
  el.textContent = `${days}d ${h}h ${m}m ${s}s`;
}, 1000);

/* time */
setInterval(() => {
  document.getElementById("time").textContent =
    new Intl.DateTimeFormat("en-GB", {
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
  try {
    const r = await fetch("/api/now-playing");
    const d = await r.json();
    if (!d.playing) return player.textContent = "not listening now";
    renderNow(d);
  } catch {
    player.textContent = "error";
  }
}

loadNow();
setInterval(loadNow, 15000);

/* ✅ recently played */
const recentBox = document.getElementById("recent");

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff} min ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

async function loadRecent() {
  try {
    const r = await fetch("/api/recently-played");
    const list = await r.json();

    recentBox.innerHTML = "";

    list.forEach(t => {
      const div = document.createElement("div");
      div.className = "recent-item";
      div.innerHTML = `
        <img src="${t.cover}" class="recent-cover">
        <div class="recent-title">${t.title}</div>
        <div class="recent-artist">${t.artist}</div>
        <div class="recent-time">${timeAgo(t.played_at)}</div>
      `;
      recentBox.appendChild(div);
    });
  } catch {
    recentBox.textContent = "failed to load history";
  }
}

loadRecent();
