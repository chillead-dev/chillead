/* ======================================================
   GLOBALS
====================================================== */

const lettersList = document.getElementById("letters-list");
const letterForm = document.getElementById("letter-form");
const letterInput = document.getElementById("letter-input");

const nowPlayingEl = document.getElementById("now-playing");
const historyEl = document.getElementById("listening-history");

/* ======================================================
   UTILS
====================================================== */

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ======================================================
   SPOTIFY — NOW PLAYING
====================================================== */

async function loadNowPlaying() {
  if (!nowPlayingEl) return;

  try {
    const r = await fetch("/api/now-playing", { cache: "no-store" });
    const j = await r.json();

    if (!j || !j.playing) {
      nowPlayingEl.textContent = "not listening right now.";
      return;
    }

    nowPlayingEl.textContent = `${j.artist} — ${j.title}`;
    addToHistory(j.artist, j.title);

  } catch {
    nowPlayingEl.textContent = "failed to load.";
  }
}

/* ======================================================
   SPOTIFY — HISTORY (LOCAL)
====================================================== */

let history = [];

function addToHistory(artist, title) {
  const key = `${artist} — ${title}`;

  if (history.length && history[0].key === key) return;

  history.unshift({
    key,
    artist,
    title,
    time: Date.now()
  });

  history = history.slice(0, 20);
  renderHistory();
}

function renderHistory() {
  if (!historyEl) return;

  historyEl.innerHTML = "";

  for (const item of history) {
    const row = document.createElement("div");
    row.className = "history-item";

    row.innerHTML = `
      <span class="history-track">${escapeHtml(item.artist)} — ${escapeHtml(item.title)}</span>
      <span class="history-time">${timeAgo(item.time)}</span>
    `;

    historyEl.appendChild(row);
  }
}

/* ======================================================
   LETTERBOX — SUBMIT
====================================================== */

if (letterForm && letterInput) {
  letterForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const text = letterInput.value.trim();
    if (!text) return;

    letterInput.value = "";

    try {
      const r = await fetch("/api/letters/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text })
      });

      const j = await r.json();

      if (!j.ok) {
        alert("failed to send message.");
      }
    } catch {
      alert("failed to send message.");
    }
  });
}

/* ======================================================
   LETTERBOX — LOAD APPROVED + ANSWERS
====================================================== */

async function loadApprovedLetters() {
  if (!lettersList) return;

  try {
    const r = await fetch("/api/letters/list", { cache: "no-store" });
    const j = await r.json();

    if (!j.ok) {
      lettersList.textContent = "failed to load messages.";
      return;
    }

    const items = j.items || [];

    if (items.length === 0) {
      lettersList.textContent = "no messages yet.";
      return;
    }

    lettersList.innerHTML = "";

    for (const it of items) {
      const row = document.createElement("div");
      row.className = "letter-item";

      /* LEFT */
      const left = document.createElement("div");
      left.className = "letter-left";

      const msg = document.createElement("div");
      msg.className = "letter-message";
      msg.textContent = it.message;
      left.appendChild(msg);

      if (it.answered && it.answer) {
        const ans = document.createElement("div");
        ans.className = "letter-answer";
        ans.innerHTML = `<span class="letter-answer-label">answer:</span> ${escapeHtml(it.answer)}`;
        left.appendChild(ans);
      }

      /* RIGHT */
      const right = document.createElement("div");
      right.className = "letter-right";

      const time = document.createElement("div");
      time.className = "letter-time";
      time.textContent = timeAgo(it.createdAt);
      right.appendChild(time);

      if (it.answered) {
        const badge = document.createElement("div");
        badge.className = "letter-badge";
        badge.textContent = "answered";
        right.appendChild(badge);
      }

      row.appendChild(left);
      row.appendChild(right);

      lettersList.appendChild(row);
    }

  } catch {
    lettersList.textContent = "failed to load.";
  }
}

/* ======================================================
   INIT / INTERVALS
====================================================== */

loadNowPlaying();
loadApprovedLetters();

setInterval(loadNowPlaying, 15000);
setInterval(loadApprovedLetters, 15000);
