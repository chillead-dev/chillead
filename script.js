(() => {
  "use strict";

  const TZ = "Asia/Yekaterinburg";
  const BIRTH = new Date("2010-08-05T00:00:00+05:00").getTime();

  const SPOTIFY_POLL_MS = 15000;
  const LETTERS_POLL_MS = 30000;

  const HISTORY_KEY = "spotify_history_visual_v1";
  const HISTORY_LIMIT = 36;
  const PAGE_SIZE = 8;

  const $ = (id) => document.getElementById(id);

  function msToTime(ms) {
    const s = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${m}:${String(r).padStart(2, "0")}`;
  }

  async function fetchJson(url, opts = {}, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { ...opts, cache: "no-store", signal: ctrl.signal });
      let data = null;
      try { data = await r.json(); } catch { data = null; }
      return { ok: r.ok, status: r.status, data };
    } catch {
      return { ok: false, status: 0, data: null };
    } finally {
      clearTimeout(t);
    }
  }

  // -------------------
  // Alive + local time
  // -------------------
  function tickTime() {
    const aliveEl = $("alive");
    const localEl = $("localTime");

    const now = Date.now();
    const diff = Math.floor((now - BIRTH) / 1000);

    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    if (aliveEl) aliveEl.textContent = `${d}d ${h}h ${m}m ${s}s`;

    if (localEl) {
      localEl.textContent = new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date());
    }
  }

  // -------------------
  // History (covers grid)
  // -------------------
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

  function pushHistory(track) {
    const h = getHistory();
    if (!track?.id) return;

    if (h[0]?.id === track.id) return;

    h.unshift({
      id: String(track.id),
      cover: String(track.cover || ""),
      title: String(track.title || ""),
      artist: String(track.artist || ""),
      url: String(track.url || ""),
      ts: Date.now()
    });

    setHistory(h.slice(0, HISTORY_LIMIT));
  }

  function renderHistoryGrid() {
    const grid = $("historyGrid");
    if (!grid) return;

    const h = getHistory();
    grid.innerHTML = "";

    if (!h.length) return;

    const frag = document.createDocumentFragment();

    h.slice(0, HISTORY_LIMIT).forEach(t => {
      const d = document.createElement("div");
      d.className = "history-item";

      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = t.cover || "";
      img.alt = t.title || "track";

      d.appendChild(img);

      if (t.url) {
        d.style.cursor = "pointer";
        d.addEventListener("click", () => {
          window.open(t.url, "_blank", "noopener,noreferrer");
        });
      }

      frag.appendChild(d);
    });

    grid.appendChild(frag);
  }

  // -------------------
  // Spotify (uses your real API)
  // -------------------
  async function renderSpotify() {
    const card = $("spotifyCard");
    const empty = $("spotifyEmpty");

    const bg = $("spotifyBg");
    const cover = $("spotifyCover");
    const title = $("spotifyTitle");
    const artist = $("spotifyArtist");
    const fill = $("spotifyFill");
    const tCur = $("spotifyTimeCur");
    const tDur = $("spotifyTimeDur");

    if (!card || !empty) return;

    const { ok, data } = await fetchJson("/api/now-playing");

    if (!ok || !data || data.ok === false) {
      card.classList.add("hidden");
      empty.textContent = "error loading spotify";
      empty.classList.remove("hidden");
      return;
    }

    if (!data.playing) {
      card.classList.add("hidden");
      empty.textContent = "not listening right now";
      empty.classList.remove("hidden");
      return;
    }

    // show
    card.classList.remove("hidden");
    empty.classList.add("hidden");

    const coverUrl = data.cover || "";
    if (bg) bg.style.backgroundImage = `url(${coverUrl})`;
    if (cover) cover.src = coverUrl;

    if (title) title.textContent = data.title || "Unknown";
    if (artist) artist.textContent = data.artists || "";

    const cur = Math.floor((data.progress_ms || 0) / 1000);
    const dur = Math.floor((data.duration_ms || 0) / 1000);
    const pct = dur > 0 ? Math.min(100, Math.max(0, (cur / dur) * 100)) : 0;

    if (tCur) tCur.textContent = `${Math.floor(cur / 60)}:${String(cur % 60).padStart(2, "0")}`;
    if (tDur) tDur.textContent = `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, "0")}`;
    if (fill) fill.style.width = `${pct}%`;

    // history
    if (data.track_id) {
      pushHistory({
        id: data.track_id,
        cover: coverUrl,
        title: data.title,
        artist: data.artists,
        url: data.track_url || ""
      });
      renderHistoryGrid();
    }
  }

  // -------------------
  // Letterbox submit
  // -------------------
  async function submitLetter() {
    const ta = $("letterInput");
    const btn = $("sendLetter");
    const st = $("letterStatus");
    if (!ta || !btn) return;

    const msg = ta.value.trim();
    if (msg.length < 2) return;

    btn.disabled = true;
    btn.textContent = "[ sending… ]";
    if (st) st.textContent = "";

    const { ok, data } = await fetchJson("/api/letters/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });

    if (ok && data && data.ok) {
      ta.value = "";
      if (st) st.textContent = "sent for moderation.";
      btn.textContent = "[ sent ]";
    } else {
      if (st) st.textContent = "error sending message.";
      btn.textContent = "[ error ]";
    }

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = "[ send ]";
    }, 900);
  }

  function initEmojis() {
    const ta = $("letterInput");
    if (!ta) return;
    document.querySelectorAll(".emojis span").forEach(sp => {
      sp.addEventListener("click", () => {
        ta.value = (ta.value + " " + (sp.textContent || "")).trimStart();
        ta.focus();
      });
    });
  }

  // -------------------
  // Shoutbox list + pagination
  // -------------------
  let approvedCache = [];
  let currentPage = 1;

  function clearNode(n){ while(n && n.firstChild) n.removeChild(n.firstChild); }

  function makeLetterRow(it){
    const row = document.createElement("div");
    row.className = "letter-item";

    const msgWrap = document.createElement("div");
    msgWrap.className = "letter-msg";

    const userMsg = document.createElement("div");
    userMsg.textContent = String(it.message || "");
    msgWrap.appendChild(userMsg);

    if (it.answered && it.answer) {
      const ans = document.createElement("div");

      const label = document.createElement("span");
      label.className = "letter-answer-label";
      label.textContent = "answer";

      const txt = document.createElement("span");
      txt.textContent = String(it.answer);

      ans.appendChild(label);
      ans.appendChild(txt);
      msgWrap.appendChild(ans);
    }

    const tm = document.createElement("div");
    tm.className = "letter-time";
    tm.textContent = new Date(Number(it.createdAt)).toLocaleString();

    row.appendChild(msgWrap);
    row.appendChild(tm);
    return row;
  }

  function renderApproved(){
    const list = $("lettersList");
    if (!list) return;

    clearNode(list);

    if (!approvedCache.length) {
      list.textContent = "no messages yet.";
      return;
    }

    const pages = Math.max(1, Math.ceil(approvedCache.length / PAGE_SIZE));
    currentPage = Math.max(1, Math.min(currentPage, pages));

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const slice = approvedCache.slice(start, end);

    const frag = document.createDocumentFragment();
    for (const it of slice) frag.appendChild(makeLetterRow(it));
    list.appendChild(frag);
  }

  function renderPagination() {
    const pag = $("pagination");
    if (!pag) return;

    const pages = Math.max(1, Math.ceil(approvedCache.length / PAGE_SIZE));
    clearNode(pag);

    if (pages <= 1) return;

    const mk = (label, onClick, active=false) => {
      const b = document.createElement("div");
      b.className = "page-btn" + (active ? " active" : "");
      b.textContent = label;
      b.addEventListener("click", onClick);
      return b;
    };

    pag.appendChild(mk("<", () => {
      currentPage = Math.max(1, currentPage - 1);
      renderApproved();
      renderPagination();
    }));

    pag.appendChild(mk(String(currentPage), () => {}, true));

    pag.appendChild(mk(">", () => {
      currentPage = Math.min(pages, currentPage + 1);
      renderApproved();
      renderPagination();
    }));
  }

  async function loadApproved() {
    const list = $("lettersList");
    if (!list) return;

    const { ok, data } = await fetchJson("/api/letters/list");
    if (!ok || !data || data.ok === false) {
      list.textContent = "failed to load.";
      return;
    }

    approvedCache = Array.isArray(data.items) ? data.items : [];
    renderApproved();
    renderPagination();
  }

  // -------------------
  // Init
  // -------------------
  function init() {
    tickTime();
    setInterval(tickTime, 1000);

    renderHistoryGrid();
    renderSpotify();
    setInterval(() => {
      if (document.visibilityState === "visible") renderSpotify();
    }, SPOTIFY_POLL_MS);

    initEmojis();
    const btn = $("sendLetter");
    if (btn) btn.addEventListener("click", submitLetter);

    loadApproved();
    setInterval(() => {
      if (document.visibilityState === "visible") loadApproved();
    }, LETTERS_POLL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
