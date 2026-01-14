(() => {
  "use strict";

  const TZ = "Asia/Yekaterinburg";
  const BIRTH = new Date("2010-08-05T00:00:00+05:00").getTime();

  const SPOTIFY_POLL_MS = 15000;
  const LETTERS_POLL_MS = 30000;

  const HISTORY_KEY = "spotify_history_tiles_v2";
  const HISTORY_LIMIT = 80;
  const PAGE_SIZE = 8;

  const GIF_WHITELIST = new Set([
    "https://media.tenor.com/nVWK_eK2DUAAAAAi/hiiragi-kagami-kagami-hiiragi.gif",
    "https://media1.tenor.com/m/j-_mdt1JfEIAAAAd/anime-wow.gif",
    "https://media.tenor.com/119A2x7NLDIAAAAi/anime.gif",
    "https://media.tenor.com/uEF6PGuX_p8AAAA1/nyaa-cat.webp",
  ]);

  const $ = (id) => document.getElementById(id);

  async function fetchJson(url, opts = {}, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { ...opts, cache:"no-store", signal: ctrl.signal });
      let data = null;
      try { data = await r.json(); } catch { data = null; }
      return { ok: r.ok, status: r.status, data };
    } catch {
      return { ok:false, status:0, data:null };
    } finally {
      clearTimeout(t);
    }
  }

  function fmtClock(ms){
    const s = Math.max(0, Math.floor(Number(ms||0)/1000));
    const m = Math.floor(s/60);
    const r = s%60;
    return `${m}:${String(r).padStart(2,"0")}`;
  }

  function fmtAgo(ts){
    const diff = Math.floor((Date.now()-ts)/1000);
    if(diff < 60) return `${diff}s`;
    const m = Math.floor(diff/60);
    if(m < 60) return `${m}m`;
    const h = Math.floor(m/60);
    if(h < 24) return `${h}h`;
    const d = Math.floor(h/24);
    return `${d}d`;
  }

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
        timeZone: TZ, hour:"2-digit", minute:"2-digit", second:"2-digit"
      }).format(new Date());
    }
  }

  // ---------- history persistent ----------
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

    // dedupe by track_id on top
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

  function renderHistoryRow() {
    const row = $("historyRow");
    if (!row) return;

    const h = getHistory();
    row.innerHTML = "";
    if (!h.length) return;

    const frag = document.createDocumentFragment();

    h.slice(0, HISTORY_LIMIT).forEach(t => {
      const tile = document.createElement("div");
      tile.className = "history-tile";

      const img = document.createElement("img");
      img.loading = "lazy";
      img.decoding = "async";
      img.src = t.cover || "";
      img.alt = t.title || "track";

      const overlay = document.createElement("div");
      overlay.className = "history-overlay";

      const name = document.createElement("div");
      name.className = "history-name";
      name.textContent = t.title || "Unknown";

      const artist = document.createElement("div");
      artist.className = "history-artist";
      artist.textContent = t.artist || "";

      const when = document.createElement("div");
      when.className = "history-when";
      when.textContent = `${fmtAgo(t.ts)} ago`;

      overlay.appendChild(name);
      overlay.appendChild(artist);
      overlay.appendChild(when);

      tile.appendChild(img);
      tile.appendChild(overlay);

      if (t.url) {
        tile.style.cursor = "pointer";
        tile.addEventListener("click", () => {
          window.open(t.url, "_blank", "noopener,noreferrer");
        });
      }

      frag.appendChild(tile);
    });

    row.appendChild(frag);
  }

  // ---------- spotify ----------
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

    card.classList.remove("hidden");
    empty.classList.add("hidden");

    const coverUrl = data.cover || "";
    if (bg) bg.style.backgroundImage = `url(${coverUrl})`;
    if (cover) cover.src = coverUrl;

    if (title) title.textContent = data.title || "Unknown";
    if (artist) artist.textContent = data.artists || "";

    const curMs = Number(data.progress_ms || 0);
    const durMs = Number(data.duration_ms || 0);
    const pct = durMs > 0 ? Math.min(100, Math.max(0, (curMs / durMs) * 100)) : 0;

    if (tCur) tCur.textContent = fmtClock(curMs);
    if (tDur) tDur.textContent = fmtClock(durMs);
    if (fill) fill.style.width = `${pct}%`;

    if (data.track_id) {
      pushHistory({
        id: data.track_id,
        cover: coverUrl,
        title: data.title,
        artist: data.artists,
        url: data.track_url || ""
      });
      renderHistoryRow();
    }
  }

  // ---------- letterbox ----------
  async function submitLetter() {
    const ta = $("letterInput");
    const btn = $("sendLetter");
    const st = $("letterStatus");

    if (!ta || !btn) return;
    const msg = ta.value.trim();
    if (msg.length < 2) return;

    btn.disabled = true;
    if (st) st.textContent = "sending…";

    const { ok, data } = await fetchJson("/api/letters/submit", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ message: msg })
    });

    if (ok && data && data.ok) {
      ta.value = "";
      if (st) st.textContent = "sent for moderation.";
    } else {
      if (st) st.textContent = "error sending message.";
    }

    setTimeout(() => {
      btn.disabled = false;
    }, 600);
  }

  function initGifPicker() {
    const ta = $("letterInput");
    if (!ta) return;

    document.querySelectorAll(".gif-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const url = btn.getAttribute("data-gif");
        if (!url) return;
        ta.value = (ta.value + "\n" + url + "\n").trimStart();
        ta.focus();
      });
    });
  }

  // ---------- shoutbox ----------
  let approvedCache = [];
  let currentPage = 1;

  function clearNode(n){ while(n && n.firstChild) n.removeChild(n.firstChild); }

  function parseMessageToNodes(text) {
    // Safe rendering:
    // - plain text lines -> text nodes
    // - if line is a whitelisted gif URL -> img
    const frag = document.createDocumentFragment();
    const lines = String(text || "").split(/\n+/);

    lines.forEach((line, idx) => {
      const l = line.trim();

      if (l && GIF_WHITELIST.has(l)) {
        const img = document.createElement("img");
        img.className = "msg-gif";
        img.loading = "lazy";
        img.decoding = "async";
        img.src = l;
        img.alt = "gif";
        frag.appendChild(img);
      } else if (l) {
        const div = document.createElement("div");
        div.textContent = l;
        frag.appendChild(div);
      }

      if (idx !== lines.length - 1) {
        // keep spacing minimal
      }
    });

    return frag;
  }

  function makeLetterRow(it){
    const row = document.createElement("div");
    row.className = "letter-item";

    const msgWrap = document.createElement("div");
    msgWrap.className = "letter-msg";
    msgWrap.appendChild(parseMessageToNodes(it.message));

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

  // ---------- api status (public only) ----------
  async function renderApiStatus(){
    const box = $("apiStatusText");
    if (!box) return;

    const h = await fetchJson("/api/health");
    const l = await fetchJson("/api/letters/list");
    const s = await fetchJson("/api/now-playing");

    const online = h.ok && h.data && h.data.ok;

    box.textContent =
`health: ${online ? "online" : "offline"} (${h.status})
letters/list: ${l.status}
now-playing: ${s.status}

note:
- private admin endpoints are not checked here`;
  }

  // ---------- init ----------
  function init() {
    tickTime();
    setInterval(tickTime,1000);

    renderHistoryRow();
    renderSpotify();
    setInterval(() => {
      if (document.visibilityState === "visible") renderSpotify();
    }, SPOTIFY_POLL_MS);

    initGifPicker();
    $("sendLetter")?.addEventListener("click", submitLetter);

    loadApproved();
    setInterval(() => {
      if (document.visibilityState === "visible") loadApproved();
    }, LETTERS_POLL_MS);

    renderApiStatus();
    setInterval(() => {
      if (document.visibilityState === "visible") renderApiStatus();
    }, 60000);
  }

  document.addEventListener("DOMContentLoaded", init, { once:true });
})();
