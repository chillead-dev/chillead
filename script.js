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

/* visits */
fetch("/api/visit", { cache: "no-store" })
  .then(r => r.json())
  .then(d => document.getElementById("visits").textContent = d.count)
  .catch(() => document.getElementById("visits").textContent = "?");

/* spotify */
const player = document.getElementById("player");

function renderTrack(d) {
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

async function loadTrack() {
  try {
    const r = await fetch("/api/now-playing", { cache: "no-store" });
    if (!r.ok) return player.textContent = "offline";
    const d = await r.json();
    if (!d || d.playing !== true) return player.textContent = "not listening now";
    renderTrack(d);
  } catch {
    player.textContent = "error";
  }
}
loadTrack();
setInterval(loadTrack, 15000);

/* reactions */
fetch("/api/react").then(r => r.json()).then(d => {
  document.querySelectorAll(".reactions button").forEach(b => {
    b.querySelector("span").textContent = d[b.dataset.r];
  });
});

document.querySelectorAll(".reactions button").forEach(btn => {
  btn.onclick = async () => {
    await fetch("/api/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: btn.dataset.r })
    });
    btn.disabled = true;
  };
});
