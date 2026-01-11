(() => {
  "use strict";

  /* ======================================================
     CONFIG
  ====================================================== */
  const TZ = "Asia/Yekaterinburg";
  const BIRTH = new Date("2010-08-05T00:00:00+05:00").getTime();

  const SPOTIFY_POLL_MS = 15000;
  const LETTERS_POLL_MS = 30000;

  const HISTORY_KEY = "spotify_history_v5";
  const HISTORY_LIMIT = 25;

  const PAGE_SIZE = 10;

  /* ======================================================
     DOM HELPERS (SAFE)
  ====================================================== */
  const $ = (id) => document.getElementById(id);

  function pickFirstId(ids) {
    for (const id of ids) {
      const el = $(id);
      if (el) return el;
    }
    return null;
  }

  function safeText(el, text) {
    if (!el) return;
    el.textContent = text ?? "";
  }

  function safeShow(el, show) {
    if (!el) return;
    if (show) el.classList.remove("hidden");
    else el.classList.add("hidden");
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function msToTime(ms) {
    const s = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  function timeAgo(ts) {
    const diff = Math.floor((Date.now() - Number(ts || 0)) / 1000);
    if (!Number.isFinite(diff)) return "—";
    if (diff < 60) return `${diff}s ago`;
    const m = Math.floor(diff / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.floor(h / 24);
    return `${d}d ago`;
  }

  function isVisible() {
    return document.visibilityState === "visible";
  }

  async function fetchJson(url, options = {}, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const r = await fetch(url, {
        ...options,
        cache: "no-store",
        signal: ctrl.signal,
        headers: { ...(options.headers || {}) },
      });

      let data = null;
      try { data = await r.json(); } catch { data = null; }

      return { ok: r.ok, status: r.status, data };
    } catch (e) {
      return { ok: false, status: 0, data: null, err: e };
    } finally {
      clearTimeout(t);
    }
  }

  /* ======================================================
     DOM REFERENCES (FALLBACK IDS)
  ====================================================== */

  // alive + local time ids were changed multiple times:
  const aliveEl = pickFirstId(["aliveInline", "alive"]);
  const localTimeEl = pickFirstId(["localTime", "localTimeEl"]);

  // now playing container ids:
  const npCard = pickFirstId(["nowPlayingCard", "nowPlaying"]);
  const npEmpty = pickFirstId(["nowPlayingEmpty", "npEmpty"]);

  // now playing elements:
  const npCover = pickFirstId(["npCover"]);
  const npTitle = pickFirstId(["npTitle"]);
  const npArtist = pickFirstId(["npArtist"]);
  const npCur = pickFirstId(["npCur", "npTime"]);
  const npTot = pickFirstId(["npTot", "npDuration"]);
  const npFill = pickFirstId(["npFill"]);

  // history container:
  const historyWrap = pickFirstId(["history", "listening-history"]);

  // letterbox:
  const hp = pickFirstId(["lb_hp", "lb_website"]);
  const letterText = pickFirstId(["letterText", "letter-input"]);
  const sendLetter = pickFirstId(["sendLetter"]);
  const letterStatus = pickFirstId(["letterStatus"]);

  // approved list:
  const lettersList = pickFirstId(["lettersList", "letters"]);
  const paginationEl = pickFirstId(["pagination"]);

  // emoji bar:
  const emojiSpans = document.querySelectorAll(".emojis span");

  /* ======================================================
     ALIVE + LOCAL TIME
  ====================================================== */
  function tickAliveAndTime() {
    if (aliveEl) {
      const diff = Math.floor((Date.now() - BIRTH) / 1000);
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      aliveEl.textContent = `${d}d ${h}h ${m}m ${s}s`;
    }

    if (localTimeEl) {
      localTimeEl.textContent = new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date());
    }
  }

  /* ======================================================
     HISTORY STORAGE
  ====================================================== */
  function getHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = JSON.parse(raw || "[]");
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }

  function setHistory(arr) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch {}
  }

  function pushHistory(item) {
    const h = getHistory();
    if (!item?.id) return;

    if (h[0]?.id === item.id) return;

    h.unshift({
      id: String(item.id),
      title: String(item.title || "Unknown"),
      artist: String(item.artist || ""),
      cover: item.cover ? String(item.cover) : "",
      url: item.url ? String(item.url) : "",
      playedAt: Date.now(),
    });

    setHistory(h.slice(0, HISTORY_LIMIT));
  }

  function renderHistory() {
    if (!historyWrap) return;

    const h = getHistory();
    historyWrap.innerHTML = "";

    if (h.length === 0) return;

    const frag = document.createDocumentFragment();

    for (const t of h) {
      const card = document.createElement("div");
      card.className = "track-card";

      const img = document.createElement("img");
      img.alt = "cover";
      img.loading = "lazy";
      img.decoding = "async";
      img.src = t.cover || "";
      card.appendChild(img);

      const meta = document.createElement("div");
      meta.className = "track-meta";

      const title = document.createElement("div");
      title.className = "track-title";
      title.textContent = t.title;

      const artist = document.createElement("div");
      artist.className = "track-artist";
      artist.textContent = t.artist;

      const ago = document.createElement("div");
      ago.className = "track-ago";
      ago.textContent = timeAgo(t.playedAt);

      meta.appendChild(title);
      meta.appendChild(artist);
      meta.appendChild(ago);

      card.appendChild(meta);

      if (t.url) {
        card.style.cursor = "pointer";
        card.addEventListener("click", () => {
          window.open(t.url, "_blank", "noopener,noreferrer");
        });
      }

      frag.appendChild(card);
    }

    historyWrap.appendChild(frag);
  }

  /* ======================================================
     SPOTIFY NOW PLAYING (API contract: {ok, playing, ...})
  ====================================================== */
  function showNowPlaying(playing) {
    // supports both patterns:
    // - card/empty
    // - if npCard is the card itself, keep empty visible when not playing
    if (npCard) safeShow(npCard, playing);
    if (npEmpty) npEmpty.style.display = playing ? "none" : "block";
  }

  async function updateSpotify() {
    if (!npCard && !npEmpty) return;
    if (!isVisible()) return;

    const { ok, data } = await fetchJson("/api/now-playing", {}, 12000);

    if (!ok || !data || data.ok === false) {
      showNowPlaying(false);
      return;
    }

    if (!data.playing) {
      showNowPlaying(false);
      return;
    }

    showNowPlaying(true);

    // expected fields:
    // track_id, title, artists, cover, duration_ms, progress_ms, track_url
    const title = data.title || "Unknown";
    const artists = data.artists || "";
    const cover = data.cover || "";
    const url = data.track_url || "#";
    const trackId = data.track_id || "";

    if (npCover) npCover.src = cover;
    if (npTitle) { npTitle.textContent = title; npTitle.href = url; }
    if (npArtist) npArtist.textContent = artists;

    const p = Number(data.progress_ms || 0);
    const d = Number(data.duration_ms || 0);

    if (npCur) npCur.textContent = msToTime(p);
    if (npTot) npTot.textContent = msToTime(d);

    if (npFill) {
      const percent = d > 0 ? clamp((p / d) * 100, 0, 100) : 0;
      npFill.style.width = `${percent}%`;
    }

    if (trackId) {
      pushHistory({ id: trackId, title, artist: artists, cover, url });
      renderHistory();
    }
  }

  /* ======================================================
     LETTERBOX SUBMIT (safe UX)
  ====================================================== */
  function setLetterStatus(text) {
    if (!letterStatus) return;
    letterStatus.textContent = text || "";
  }

  async function submitLetter() {
    if (!letterText || !sendLetter) return;

    // honeypot
    if (hp && hp.value && hp.value.trim().length > 0) {
      setLetterStatus("sent.");
      letterText.value = "";
      return;
    }

    const msg = letterText.value.trim();
    if (msg.length < 2) {
      setLetterStatus("too short.");
      return;
    }

    sendLetter.disabled = true;
    setLetterStatus("sending…");

    const { ok, data } = await fetchJson("/api/letters/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg }),
    }, 12000);

    if (!ok || !data) {
      setLetterStatus("error.");
      sendLetter.disabled = false;
      return;
    }

    if (data.ok) {
      setLetterStatus("sent for moderation.");
      letterText.value = "";
    } else {
      setLetterStatus(data.error ? `error: ${data.error}` : "error.");
    }

    setTimeout(() => {
      sendLetter.disabled = false;
      setLetterStatus("");
    }, 900);
  }

  /* ======================================================
     APPROVED LIST + PAGINATION + ANSWERS
  ====================================================== */
  let approvedCache = [];
  let currentPage = 1;

  function clearNode(n) { while (n && n.firstChild) n.removeChild(n.firstChild); }

  function renderPagination(totalItems) {
    if (!paginationEl) return;

    const pages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    clearNode(paginationEl);

    if (pages <= 1) return;

    for (let i = 1; i <= pages; i++) {
      const b = document.createElement("div");
      b.className = "page-btn" + (i === currentPage ? " active" : "");
      b.textContent = String(i);
      b.addEventListener("click", () => {
        currentPage = i;
        renderApprovedPage();
        renderPagination(totalItems);
      });
      paginationEl.appendChild(b);
    }
  }

  function makeLetterRow(it) {
    const row = document.createElement("div");
    row.className = "letter-item";

    const left = document.createElement("div");
    left.className = "letter-msg";

    const msg = document.createElement("div");
    msg.textContent = String(it.message || "");
    left.appendChild(msg);

    if (it.answered && it.answer) {
      const ans = document.createElement("div");
      const label = document.createElement("span");
      label.className = "letter-answer-label";
      label.textContent = "answer";
      const text = document.createElement("span");
      text.textContent = String(it.answer);
      ans.appendChild(label);
      ans.appendChild(text);
      left.appendChild(ans);
    }

    const right = document.createElement("div");
    right.className = "letter-time";
    right.textContent = timeAgo(it.createdAt);

    row.appendChild(left);
    row.appendChild(right);
    return row;
  }

  function renderApprovedPage() {
    if (!lettersList) return;

    clearNode(lettersList);

    if (!approvedCache.length) {
      lettersList.textContent = "no approved messages yet.";
      return;
    }

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const slice = approvedCache.slice(start, end);

    const frag = document.createDocumentFragment();
    for (const it of slice) frag.appendChild(makeLetterRow(it));
    lettersList.appendChild(frag);
  }

  async function loadApprovedLetters() {
    if (!lettersList) return;
    if (!isVisible()) return;

    const { ok, data } = await fetchJson("/api/letters/list", {}, 12000);

    if (!ok || !data || data.ok === false) {
      // keep previous view, but show minimal info
      if (!approvedCache.length) lettersList.textContent = "failed to load.";
      return;
    }

    const items = Array.isArray(data.items) ? data.items : [];
    approvedCache = items;

    const pages = Math.max(1, Math.ceil(approvedCache.length / PAGE_SIZE));
    currentPage = clamp(currentPage, 1, pages);

    renderApprovedPage();
    renderPagination(approvedCache.length);
  }

  /* ======================================================
     EMOJIS INSERT
  ====================================================== */
  function initEmojis() {
    if (!emojiSpans || !emojiSpans.length || !letterText) return;
    emojiSpans.forEach(sp => {
      sp.addEventListener("click", () => {
        const add = sp.textContent || "";
        const cur = letterText.value || "";
        letterText.value = (cur + " " + add).trimStart();
        letterText.focus();
      });
    });
  }

  /* ======================================================
     INIT
  ====================================================== */
  function init() {
    tickAliveAndTime();
    renderHistory();
    loadApprovedLetters();
    updateSpotify();
    initEmojis();

    // timers
    setInterval(tickAliveAndTime, 1000);

    setInterval(() => {
      if (isVisible()) updateSpotify();
    }, SPOTIFY_POLL_MS);

    setInterval(() => {
      if (isVisible()) loadApprovedLetters();
    }, LETTERS_POLL_MS);

    // visibility change refresh
    document.addEventListener("visibilitychange", () => {
      if (isVisible()) {
        tickAliveAndTime();
        updateSpotify();
        renderHistory();
        loadApprovedLetters();
      }
    });

    // submit hook
    if (sendLetter) sendLetter.addEventListener("click", submitLetter);
    if (letterText) {
      letterText.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          submitLetter();
        }
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
