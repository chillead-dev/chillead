(() => {
  "use strict";

  // ---------------------------
  // Config
  // ---------------------------
  const TZ = "Asia/Yekaterinburg";
  const BIRTH = new Date("2010-08-05T00:00:00+05:00"); // for alive timer
  const SPOTIFY_POLL_MS = 15000;
  const LETTERS_POLL_MS = 30000;
  const HISTORY_KEY = "spotify_history_v4";
  const HISTORY_LIMIT = 20;

  // ---------------------------
  // Helpers
  // ---------------------------
  const $ = (id) => document.getElementById(id);

  function safeText(el, text) {
    if (!el) return;
    el.textContent = text ?? "";
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

  async function fetchJson(url, options = {}, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const r = await fetch(url, {
        ...options,
        cache: "no-store",
        signal: ctrl.signal,
        headers: {
          ...(options.headers || {}),
        },
      });

      // Even for non-200 we try to parse JSON for better diagnostics
      let data = null;
      try {
        data = await r.json();
      } catch {
        data = null;
      }

      return { ok: r.ok, status: r.status, data };
    } finally {
      clearTimeout(t);
    }
  }

  function isPageVisible() {
    return document.visibilityState === "visible";
  }

  // ---------------------------
  // DOM refs
  // ---------------------------
  const aliveInline = $("aliveInline");
  const localTimeEl = $("localTime");

  // Spotify now playing
  const npCard = $("nowPlayingCard");
  const npEmpty = $("nowPlayingEmpty");
  const npCover = $("npCover");
  const npTitle = $("npTitle");
  const npArtist = $("npArtist");
  const npCur = $("npCur");
  const npTot = $("npTot");
  const npFill = $("npFill");

  // Spotify history
  const historyWrap = $("history");

  // Letterbox
  const hp = $("lb_hp");
  const letterText = $("letterText");
  const sendLetter = $("sendLetter");
  const letterStatus = $("letterStatus");
  const lettersList = $("lettersList");

  // Emoji bar
  const emojiSpans = document.querySelectorAll(".emojis span");

  // ---------------------------
  // Alive + local time
  // ---------------------------
  function updateAliveAndTime() {
    if (aliveInline) {
      const diff = Math.floor((Date.now() - BIRTH.getTime()) / 1000);
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      aliveInline.textContent = `${d}d ${h}h ${m}m ${s}s`;
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

  // ---------------------------
  // History storage/render
  // ---------------------------
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
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
    } catch {
      // ignore storage quota errors
    }
  }

  function pushHistory(item) {
    const h = getHistory();
    const id = String(item?.id || "");
    if (!id) return;

    if (h[0]?.id === id) return;

    h.unshift({
      id,
      title: String(item.title || "Unknown"),
      artist: String(item.artist || ""),
      cover: item.cover ? String(item.cover) : null,
      url: item.url ? String(item.url) : null,
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
      title.textContent = t.title || "Unknown";

      const artist = document.createElement("div");
      artist.className = "track-artist";
      artist.textContent = t.artist || "";

      meta.appendChild(title);
      meta.appendChild(artist);

      const ago = document.createElement("div");
      ago.className = "track-ago";
      ago.textContent = timeAgo(t.playedAt);

      card.appendChild(meta);
      card.appendChild(ago);

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

  // ---------------------------
  // Spotify now playing
  // ---------------------------
  function showNowPlaying(playing) {
    if (!npCard || !npEmpty) return;
    if (playing) {
      npCard.classList.remove("hidden");
      npEmpty.classList.add("hidden");
    } else {
      npCard.classList.add("hidden");
      npEmpty.classList.remove("hidden");
    }
  }

  async function updateSpotify() {
    if (!npCard || !npEmpty) return;

    // Avoid wasting requests when tab is hidden
    if (!isPageVisible()) return;

    const { ok, data } = await fetchJson("/api/now-playing", {}, 12000);

    // Expected API contract (from your backend):
    // { ok:true, playing:true/false, track_id, title, artists, cover, duration_ms, progress_ms, track_url }
    if (!ok || !data || data.ok === false) {
      // API error; do not hard-break UI
      showNowPlaying(false);
      return;
    }

    if (!data.playing) {
      showNowPlaying(false);
      return;
    }

    showNowPlaying(true);

    if (npCover) npCover.src = data.cover || "";
    if (npTitle) {
      npTitle.textContent = data.title || "Unknown";
      npTitle.href = data.track_url || "#";
    }
    safeText(npArtist, data.artists || "");

    const p = Number(data.progress_ms || 0);
    const d = Number(data.duration_ms || 0);

    safeText(npCur, msToTime(p));
    safeText(npTot, msToTime(d));

    if (npFill) {
      const percent = d > 0 ? clamp((p / d) * 100, 0, 100) : 0;
      npFill.style.width = `${percent}%`;
    }

    // Push to local history
    if (data.track_id) {
      pushHistory({
        id: data.track_id,
        title: data.title,
        artist: data.artists,
        cover: data.cover,
        url: data.track_url,
      });
      renderHistory();
    }
  }

  // ---------------------------
  // Letterbox: submit + list
  // ---------------------------
  function setLetterStatus(text) {
    if (!letterStatus) return;
    letterStatus.textContent = text || "";
  }

  async function submitLetter() {
    if (!letterText) return;

    // honeypot
    if (hp && hp.value.trim().length > 0) {
      setLetterStatus("sent.");
      letterText.value = "";
      return;
    }

    const msg = letterText.value.trim();
    if (msg.length < 2) {
      setLetterStatus("too short.");
      return;
    }

    setLetterStatus("sending…");
    const { ok, data } = await fetchJson(
      "/api/letters/submit",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      },
      12000
    );

    if (!ok || !data) {
      setLetterStatus("error.");
      return;
    }

    if (data.ok) {
      setLetterStatus("sent for moderation.");
      letterText.value = "";
      // optional: don't auto-refresh approved immediately (it won't appear until approved)
      return;
    }

    setLetterStatus(data.error ? `error: ${data.error}` : "error.");
  }

  function clearNode(n) {
    while (n && n.firstChild) n.removeChild(n.firstChild);
  }

  async function loadApprovedLetters() {
    if (!lettersList) return;
    if (!isPageVisible()) return;

    const { ok, data } = await fetchJson("/api/letters/list", {}, 12000);

    if (!ok || !data || data.ok === false) {
      lettersList.textContent = "failed to load.";
      return;
    }

    const items = Array.isArray(data.items) ? data.items : [];
    if (items.length === 0) {
      lettersList.textContent = "no approved messages yet.";
      return;
    }

    clearNode(lettersList);

    const frag = document.createDocumentFragment();

    for (const it of items) {
      const row = document.createElement("div");
      row.className = "letter-item";

      const msgWrap = document.createElement("div");
      msgWrap.className = "letter-msg";

      const userMsg = document.createElement("div");
      userMsg.textContent = String(it.message || "");
      msgWrap.appendChild(userMsg);

      if (it.answered && it.answer) {
        const ans = document.createElement("div");
        ans.style.marginTop = "8px";
        ans.style.paddingTop = "8px";
        ans.style.borderTop = "1px solid rgba(255,255,255,.08)";

        const label = document.createElement("span");
        label.textContent = "answer: ";
        label.style.color = "var(--muted)";
        label.style.opacity = "0.95";

        const txt = document.createElement("span");
        txt.textContent = String(it.answer);

        ans.appendChild(label);
        ans.appendChild(txt);
        msgWrap.appendChild(ans);
      }

      const tm = document.createElement("div");
      tm.className = "letter-time";
      tm.textContent = timeAgo(it.createdAt);

      row.appendChild(msgWrap);
      row.appendChild(tm);

      frag.appendChild(row);
    }

    lettersList.appendChild(frag);
  }

  // ---------------------------
  // Init wiring
  // ---------------------------
  function init() {
    // Initial renders
    updateAliveAndTime();
    renderHistory();
    loadApprovedLetters();
    updateSpotify();

    // Timers
    setInterval(updateAliveAndTime, 1000);

    setInterval(() => {
      if (isPageVisible()) updateSpotify();
    }, SPOTIFY_POLL_MS);

    setInterval(() => {
      if (isPageVisible()) loadApprovedLetters();
    }, LETTERS_POLL_MS);

    // When tab becomes visible again, refresh instantly
    document.addEventListener("visibilitychange", () => {
      if (isPageVisible()) {
        updateAliveAndTime();
        updateSpotify();
        loadApprovedLetters();
        renderHistory();
      }
    });

    // Letterbox submit
    if (sendLetter) {
      sendLetter.addEventListener("click", submitLetter);
    }

    if (letterText) {
      letterText.addEventListener("keydown", (e) => {
        // Ctrl+Enter to send
        if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
          e.preventDefault();
          submitLetter();
        }
      });
    }

    // Emoji insert
    if (emojiSpans && emojiSpans.length && letterText) {
      emojiSpans.forEach((sp) => {
        sp.addEventListener("click", () => {
          const add = sp.textContent || "";
          const cur = letterText.value || "";
          letterText.value = (cur + " " + add).trimStart();
          letterText.focus();
        });
      });
    }
  }

  // Run after DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
