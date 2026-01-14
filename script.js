(() => {
  "use strict";

  // ---------------------------
  // CONFIG
  // ---------------------------
  const TZ = "Asia/Yekaterinburg";
  const BIRTH = new Date("2010-08-05T00:00:00+05:00").getTime();

  const SPOTIFY_POLL_MS = 15000;
  const LETTERS_POLL_MS = 30000;

  const HISTORY_KEY = "spotify_history_v6";
  const HISTORY_LIMIT = 25;

  const PAGE_SIZE = 8; // как на скрине, удобнее

  // ---------------------------
  // DOM helpers
  // ---------------------------
  const $ = (id) => document.getElementById(id);
  const setText = (el, t) => { if (el) el.textContent = t ?? ""; };

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

  function makeBar(progress, duration, len = 30) {
    if (!duration || duration <= 0) return "░".repeat(len);
    const p = Math.floor((progress / duration) * len);
    const filled = Math.max(0, Math.min(len, p));
    return "█".repeat(filled) + "░".repeat(len - filled);
  }

  async function fetchJson(url, opts = {}, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { ...opts, cache: "no-store", signal: ctrl.signal });
      let data = null;
      try { data = await r.json(); } catch { data = null; }
      return { ok: r.ok, status: r.status, data };
    } catch (e) {
      return { ok: false, status: 0, data: null, err: e };
    } finally {
      clearTimeout(t);
    }
  }

  // ---------------------------
  // Alive + local time
  // ---------------------------
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

  // ---------------------------
  // Spotify history (local)
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
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch {}
  }

  function pushHistory(track) {
    const id = String(track?.id || "");
    if (!id) return;

    const h = getHistory();
    if (h[0]?.id === id) return;

    h.unshift({
      id,
      title: String(track.title || "Unknown"),
      artist: String(track.artist || ""),
      url: String(track.url || ""),
      playedAt: Date.now()
    });

    setHistory(h.slice(0, HISTORY_LIMIT));
  }

  function renderHistoryText() {
    const box = $("historyText");
    if (!box) return;

    const h = getHistory();
    if (!h.length) {
      box.textContent = "empty";
      return;
    }

    box.textContent = h.slice(0, HISTORY_LIMIT).map(t =>
      `- ${t.title} — ${t.artist} (${timeAgo(t.playedAt)})`
    ).join("\n");
  }

  // ---------------------------
  // Spotify now playing (REAL CONTRACT)
  // ---------------------------
  async function renderSpotifyText() {
    const box = $("spotifyText");
    if (!box) return;

    const { ok, data } = await fetchJson("/api/now-playing");

    // your backend contract:
    // { ok:true, playing:false } OR
    // { ok:true, playing:true, track_id, title, artists, cover, duration_ms, progress_ms, track_url }
    if (!ok || !data || data.ok === false) {
      box.textContent = "error: failed to load spotify";
      return;
    }

    if (!data.playing) {
      box.textContent = "status: not listening right now";
      return;
    }

    const title = data.title || "Unknown";
    const artist = data.artists || "";
    const p = Number(data.progress_ms || 0);
    const d = Number(data.duration_ms || 0);

    const bar = makeBar(p, d, 30);

    box.textContent =
`track: ${title}
artist: ${artist}
time: ${msToTime(p)} / ${msToTime(d)}
status: playing

[${bar}]`;

    // history update
    if (data.track_id) {
      pushHistory({
        id: data.track_id,
        title,
        artist,
        url: data.track_url || ""
      });
      renderHistoryText();
    }
  }

  // ---------------------------
  // Letterbox submit
  // ---------------------------
  async function submitLetter() {
    const ta = $("letterInput");
    const btn = $("sendLetter");
    if (!ta || !btn) return;

    const msg = ta.value.trim();
    if (msg.length < 2) return;

    btn.disabled = true;
    btn.textContent = "[ sending… ]";

    const { ok, data } = await fetchJson("/api/letters/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });

    if (ok && data && data.ok) {
      ta.value = "";
      btn.textContent = "[ sent ]";
    } else {
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

  // ---------------------------
  // Shoutbox list + pagination
  // ---------------------------
  let approvedCache = [];
  let currentPage = 1;

  function clearNode(n){ while(n && n.firstChild) n.removeChild(n.firstChild); }

  function renderPagination() {
    const pag = $("pagination");
    if (!pag) return;

    const pages = Math.max(1, Math.ceil(approvedCache.length / PAGE_SIZE));
    clearNode(pag);

    if (pages <= 1) return;

    // style like your screenshot: < 1 >
    const mkBtn = (label, onClick, active=false) => {
      const b = document.createElement("div");
      b.className = "page-btn" + (active ? " active" : "");
      b.textContent = label;
      b.addEventListener("click", onClick);
      return b;
    };

    pag.appendChild(mkBtn("<", () => {
      currentPage = Math.max(1, currentPage - 1);
      renderApproved();
      renderPagination();
    }));

    pag.appendChild(mkBtn(String(currentPage), () => {}, true));

    pag.appendChild(mkBtn(">", () => {
      currentPage = Math.min(pages, currentPage + 1);
      renderApproved();
      renderPagination();
    }));
  }

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

  // ---------------------------
  // Init
  // ---------------------------
  function init() {
    // time
    tickTime();
    setInterval(tickTime, 1000);

    // spotify + history
    renderHistoryText();
    renderSpotifyText();
    setInterval(() => {
      if (document.visibilityState === "visible") renderSpotifyText();
    }, SPOTIFY_POLL_MS);

    // letterbox
    const btn = $("sendLetter");
    if (btn) btn.addEventListener("click", submitLetter);
    initEmojis();

    // shoutbox
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
