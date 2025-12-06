"use strict";

/* === alive timer === */
const born = new Date("2010-08-05T00:00:00Z");
const aliveEl = document.getElementById("alive");

function updateAlive() {
  if (!aliveEl) return;
  let diff = Math.floor((Date.now() - born.getTime()) / 1000);
  const d = Math.floor(diff / 86400);
  diff -= d * 86400;
  const h = Math.floor(diff / 3600);
  diff -= h * 3600;
  const m = Math.floor(diff / 60);
  const s = diff % 60;
  aliveEl.textContent = `${d}d, ${h}h, ${m}m, ${s}s`;
}
updateAlive();
setInterval(updateAlive, 1000);

/* === local time === */
const timeEl = document.getElementById("time");

function updateTime() {
  if (!timeEl) return;
  timeEl.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Yekaterinburg",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}
updateTime();
setInterval(updateTime, 1000);

/* === spotify now playing === */

const player = document.getElementById("player");

function setPlayerText(text) {
  if (!player) return;
  player.textContent = text;
}

function renderTrack(data) {
  if (!player) return;

  player.innerHTML = "";

  const img = document.createElement("img");
  img.src = data.cover;
  img.alt = "album cover";
  img.className = "cover";

  const wrap = document.createElement("div");

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = data.title;

  const artist = document.createElement("div");
  artist.className = "artist";
  artist.textContent = data.artist;

  const progress = document.createElement("div");
  progress.className = "progress";

  const fill = document.createElement("div");
  fill.className = "fill";

  const duration = Number(data.duration) || 1;
  const progressMs = Number(data.progress) || 0;
  const percent = Math.min(100, Math.max(0, (progressMs / duration) * 100));

  fill.style.width = percent + "%";

  progress.appendChild(fill);
  wrap.append(title, artist, progress);

  player.append(img, wrap);
}

async function loadTrack() {
  try {
    const res = await fetch("/api/now-playing", {
      cache: "no-store",
      headers: { Accept: "application/json" }
    });

    if (!res.ok) {
      setPlayerText("offline");
      return;
    }

    const data = await res.json();

    if (
      !data ||
      typeof data !== "object" ||
      data.playing !== true ||
      typeof data.title !== "string" ||
      typeof data.artist !== "string" ||
      typeof data.cover !== "string"
    ) {
      setPlayerText("not listening now");
      return;
    }

    renderTrack(data);
  } catch {
    setPlayerText("error");
  }
}

loadTrack();
setInterval(loadTrack, 15000);
