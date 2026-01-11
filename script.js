const lettersList = document.getElementById("letters-list");

/* =========================
   UTILS
========================= */

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/* =========================
   LOAD APPROVED LETTERS
========================= */

async function loadApprovedLetters() {
  if (!lettersList) return;

  try {
    const r = await fetch("/api/letters/list", {
      cache: "no-store"
    });

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

    // очистка
    lettersList.innerHTML = "";

    for (const it of items) {
      const row = document.createElement("div");
      row.className = "letter-item";

      /* ===== LEFT ===== */
      const left = document.createElement("div");
      left.className = "letter-left";

      // сообщение пользователя
      const msg = document.createElement("div");
      msg.className = "letter-message";
      msg.textContent = it.message;
      left.appendChild(msg);

      // ответ администратора
      if (it.answered && it.answer) {
        const answer = document.createElement("div");
        answer.className = "letter-answer";
        answer.innerHTML = `<span class="letter-answer-label">answer:</span> ${it.answer}`;
        left.appendChild(answer);
      }

      /* ===== RIGHT ===== */
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

  } catch (e) {
    lettersList.textContent = "failed to load.";
  }
}

/* =========================
   INIT
========================= */

loadApprovedLetters();
setInterval(loadApprovedLetters, 15000);
