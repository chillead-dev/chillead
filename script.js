"use strict";

/* ===== alive timer ===== */
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
  aliveEl.textContent = `${d}d, ${h}h, ${m}m, ${s}s`;
}
updateAlive();
setInterval(updateAlive, 1000);

/* ===== local time ===== */
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

/* ===== visits ===== */
async function loadVisits() {
  try {
    const r = await fetch("/api/visit", { cache: "no-store" });
    const d = await r.json();
    document.getElementById("visits").textContent = d.count;
  } catch {
    document.getElementById("visits").textContent = "?";
  }
}
loadVisits();

/* ===== spotify ===== */
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
    if (!d || d.playing !== true) return setText("not listening now");
    renderTrack(d);
  } catch {
    setText("error");
  }
}
loadTrack();
setInterval(loadTrack, 15000);

/* ===== reactions ===== */
async function loadReactions() {
  const r = await fetch("/api/react", { cache: "no-store" });
  const d = await r.json();
  document.querySelectorAll(".reactions button").forEach(b => {
    b.querySelector("span").textContent = d[b.dataset.r];
  });
}

document.querySelectorAll(".reactions button").forEach(btn => {
  btn.onclick = async () => {
    await fetch("/api/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: btn.dataset.r })
    });
    loadReactions();
  };
});

loadReactions();
