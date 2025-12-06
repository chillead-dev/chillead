"use strict";

const player = document.getElementById("player");

function setText(text) {
  player.textContent = text;
}

function renderTrack(data) {
  player.innerHTML = "";

  const img = document.createElement("img");
  img.src = data.cover;
  img.className = "cover";
  img.alt = "cover";

  const box = document.createElement("div");

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

  const percent = Math.min(
    100,
    Math.max(2, (data.progress / data.duration) * 100)
  );
  fill.style.width = percent + "%";

  progress.appendChild(fill);
  box.append(title, artist, progress);

  player.append(img, box);
}

async function loadTrack() {
  try {
    const res = await fetch("/api/now-playing", { cache: "no-store" });
    if (!res.ok) return setText("offline");

    const data = await res.json();
    if (!data || data.playing !== true) {
      setText("not listening now");
      return;
    }

    renderTrack(data);
  } catch {
    setText("error");
  }
}

loadTrack();
setInterval(loadTrack, 15000);
