(() => {
  "use strict";

  const TZ               = "Asia/Yekaterinburg";
  const BIRTH            = new Date("2010-08-05T00:00:00+05:00").getTime();
  const LETTERS_POLL     = 30_000;
  const LETTERS_PER_PAGE = 6;
  const MAX_INPUT_LEN    = 500;

  const GIFS = {
    "1": "https://media.tenor.com/nVWK_eK2DUAAAAAi/hiiragi-kagami-kagami-hiiragi.gif",
    "2": "https://media1.tenor.com/m/j-_mdt1JfEIAAAAd/anime-wow.gif",
    "3": "https://media.tenor.com/119A2x7NLDIAAAAi/anime.gif",
    "4": "https://media.tenor.com/uEF6PGuX_p8AAAA1/nyaa-cat.webp",
  };

  const ALLOWED_GIF_HOSTS = new Set([
    "media.tenor.com", "media1.tenor.com",
  ]);

  function $(id) {
    return document.getElementById(id);
  }

  function safeText(s) {
    return document.createTextNode(s);
  }

  let lettersPage = 1;
  let selectedGif = null;

  async function fetchJson(url, opts = {}, timeout = 12_000) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { ...opts, cache: "no-store", signal: ctrl.signal });
      const j = await r.json().catch(() => null);
      return { ok: r.ok, data: j };
    } catch {
      return { ok: false, data: null };
    } finally {
      clearTimeout(timer);
    }
  }

  function sanitizeGifUrl(url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") return null;
      if (!ALLOWED_GIF_HOSTS.has(u.hostname)) return null;
      return u.href;
    } catch { return null; }
  }

  function sanitizeInput(s) {
    return s
      .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
      .trim()
      .slice(0, MAX_INPUT_LEN);
  }

  function calcAge(birth) {
    const now      = new Date();
    const birthDay = new Date(birth);
    let age        = now.getFullYear() - birthDay.getFullYear();
    const hadBirthday =
      now.getMonth() > birthDay.getMonth() ||
      (now.getMonth() === birthDay.getMonth() && now.getDate() >= birthDay.getDate());
    if (!hadBirthday) age--;
    return age;
  }

  function tickTime() {
    const now  = Date.now();
    const diff = Math.floor((now - BIRTH) / 1000);
    if (diff < 0) return;

    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    const alive = $("alive");
    if (alive) alive.textContent = `${d}d ${h}h ${m}m ${s}s`;

    const localTime = $("localTime");
    if (localTime) {
      localTime.textContent = new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date());
    }

    const age    = calcAge(BIRTH);
    const ageEl  = $("ageDisplay");
    const ageEl2 = $("ageDisplay2");
    if (ageEl)  ageEl.textContent  = String(age);
    if (ageEl2) ageEl2.textContent = String(age);
  }

  function initGifPicker() {
    document.querySelectorAll(".gif-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const g = btn.dataset["g"] ?? null;
        if (!g || !(g in GIFS)) return;
        selectedGif = g;
        document.querySelectorAll(".gif-btn")
          .forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
  }

  function buildMessage(text, gifId) {
    const t = sanitizeInput(text);
    if (!gifId) return t;
    return (t ? t + "\n" : "") + `[g${gifId}]`;
  }

  function parseMessage(msg) {
    const rawLines = String(msg ?? "").split("\n").map(l => l.trim());
    let gifUrl = null;
    const textLines = [];

    for (const l of rawLines) {
      const m1 = l.match(/^\[g([1-4])\]$/);
      const m2 = l.match(/^g\s*([1-4])$/i);

      if (m1?.[1] && GIFS[m1[1]]) { gifUrl = GIFS[m1[1]]; continue; }
      if (m2?.[1] && GIFS[m2[1]]) { gifUrl = GIFS[m2[1]]; continue; }

      let legacy = false;
      for (const id in GIFS) {
        if (l === GIFS[id]) { gifUrl = GIFS[id]; legacy = true; break; }
      }
      if (legacy) continue;
      if (l) textLines.push(l);
    }

    if (gifUrl) gifUrl = sanitizeGifUrl(gifUrl);
    return { text: textLines.join("\n").trim(), gifUrl };
  }

  function renderMessage(container, msg) {
    const { text, gifUrl } = parseMessage(msg);
    const hasText = text.length > 0;

    if (hasText) {
      const t = document.createElement("div");
      t.appendChild(safeText(text));
      container.appendChild(t);
    }

    if (gifUrl) {
      const img     = document.createElement("img");
      img.src       = gifUrl;
      img.loading   = "lazy";
      img.decoding  = "async";
      img.alt       = "";
      img.className = hasText ? "msg-gif-inline" : "msg-gif-big";

      if (hasText && container.firstChild instanceof HTMLElement) {
        container.firstChild.appendChild(img);
      } else {
        container.appendChild(img);
      }
    }
  }

  function renderPagination(total) {
    const box = $("pagination");
    if (!box) return;
    const pages = Math.max(1, Math.ceil(total / LETTERS_PER_PAGE));
    if (lettersPage > pages) lettersPage = pages;
    box.innerHTML = "";
    if (pages <= 1) return;

    const frag = document.createDocumentFragment();
    for (let p = 1; p <= pages; p++) {
      const btn     = document.createElement("button");
      btn.type      = "button";
      btn.className = `page-btn${p === lettersPage ? " is-active" : ""}`;
      btn.appendChild(safeText(String(p)));
      const page = p;
      btn.addEventListener("click", () => { lettersPage = page; void loadLetters(); });
      frag.appendChild(btn);
    }
    box.appendChild(frag);
  }

  async function loadLetters() {
    const list = $("lettersList");
    if (!list) return;

    const { ok, data } = await fetchJson("/api/letters/list");
    list.innerHTML = "";

    if (!ok || !data?.ok) {
      list.appendChild(safeText("failed to load"));
      renderPagination(0);
      return;
    }

    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) {
      list.appendChild(safeText("no messages yet."));
      renderPagination(0);
      return;
    }

    const offset    = (lettersPage - 1) * LETTERS_PER_PAGE;
    const pageItems = items.slice(offset, offset + LETTERS_PER_PAGE);
    const frag      = document.createDocumentFragment();

    for (const it of pageItems) {
      const row = document.createElement("div");
      row.className = "letter-item";

      const msg = document.createElement("div");
      msg.className = "letter-msg";
      renderMessage(msg, it.message);

      if (it.answered && it.answer) {
        const ans   = document.createElement("div");
        const label = document.createElement("span");
        label.className = "letter-answer-label";
        label.appendChild(safeText("answer"));
        const ansText = document.createElement("span");
        ansText.appendChild(safeText(" " + it.answer));
        ans.appendChild(label);
        ans.appendChild(ansText);
        msg.appendChild(ans);
      }

      const tm = document.createElement("div");
      tm.className = "letter-time";
      const dt = Number(it.createdAt);
      tm.appendChild(safeText(
        Number.isFinite(dt) ? new Date(dt).toLocaleString() : "unknown"
      ));

      row.appendChild(msg);
      row.appendChild(tm);
      frag.appendChild(row);
    }

    list.appendChild(frag);
    renderPagination(items.length);
  }

  async function submitLetter() {
    const ta  = $("letterInput");
    const btn = $("sendBtn");
    const st  = $("letterStatus");

    const text = sanitizeInput(ta?.value ?? "");
    if (text.length < 1 && !selectedGif) return;

    if (btn) btn.disabled = true;
    if (st)  st.textContent = "sending…";

    const { ok, data } = await fetchJson("/api/letters/submit", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ message: buildMessage(text, selectedGif) }),
    });

    if (ok && data?.ok) {
      if (ta) ta.value = "";
      selectedGif = null;
      document.querySelectorAll(".gif-btn").forEach(b => b.classList.remove("selected"));
      if (st) st.textContent = "sent for moderation.";
      await loadLetters();
    } else {
      if (st) st.textContent = "error sending. try again.";
    }

    setTimeout(() => { if (btn) btn.disabled = false; }, 500);
  }

  function init() {
    tickTime();
    setInterval(tickTime, 1000);
    initGifPicker();
    $("sendBtn")?.addEventListener("click", () => void submitLetter());
    void loadLetters();
    setInterval(() => void loadLetters(), LETTERS_POLL);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
