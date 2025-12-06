"use strict";

/* alive counter */
const born = new Date("2010-08-05T00:00:00Z");
const aliveEl = document.getElementById("alive");

function updateAlive() {
  let diff = Math.floor((Date.now() - born) / 1000);
  const d = Math.floor(diff / 86400);
  diff -= d * 86400;
  const h = Math.floor(diff / 3600);
  diff -= h * 3600;
  const m = Math.floor(diff / 60);
  const s = diff % 60;

  aliveEl.textContent = `${d}d ${h}h ${m}m ${s}s`;
}
updateAlive();
setInterval(updateAlive, 1000);

/* local time */
const timeEl = document.getElementById("time");

function updateTime() {
  timeEl.textContent = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Yekaterinburg",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date());
}
updateTime();
setInterval(updateTime, 1000);

/* spotify */
const player = document.getElementById("player");

function setText(t) {
  player.textContent = t;
}

function renderTrack(d) {
  player.innerHTML = "";

  const img = document.createElement("img");
  img.src = d.cover;
  img.className = "cover";

  const box = document.createElement("div");

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = d.title;

  const artist = document.createElement("div");
  artist.className = "artist";
  artist.textContent = d.artist;

  const progress = document.createElement("div");
  progress.className = "progress";

  const fill = document.createElement("div");
  fill.className = "fill";
  fill.style.width = Math.min(100, (d.progress / d.duration) * 100) + "%";

  progress.appendChild(fill);
  box.append(title, artist, progress);

  player.append(img, box);
}

async function loadTrack() {
  try {
    const r = await fetch("/api/now-playing", { cache: "no-store" });
    if (!r.ok) return setText("offline");

    const d = await r.json();
    if (!d || d.playing !== true) {
      setText("not listening now");
      return;
    }

    renderTrack(d);
  } catch {
    setText("error");
  }
}

loadTrack();
setInterval(loadTrack, 15000);
