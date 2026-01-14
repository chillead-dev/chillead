(() => {
  "use strict";

  const TZ = "Asia/Yekaterinburg";
  const BIRTH = new Date("2010-08-05T00:00:00+05:00").getTime();

  const SPOTIFY_POLL_MS = 15000;
  const LETTERS_POLL_MS = 30000;

  const HISTORY_KEY = "spotify_history_visual_v2";
  const HISTORY_LIMIT = 36;
  const PAGE_SIZE = 8;

  const $ = (id) => document.getElementById(id);

  async function fetchJson(url, opts = {}, timeoutMs = 12000) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const r = await fetch(url, { ...opts, cache:"no-store", signal: ctrl.signal });
      let data = null;
      try { data = await r.json(); } catch {}
      return { ok: r.ok, status: r.status, data };
    } catch {
      return { ok:false, status:0, data:null };
    } finally {
      clearTimeout(t);
    }
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

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
    catch { return []; }
  }

  function setHistory(arr) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr)); } catch {}
  }

  function pushHistory(track) {
    const h = getHistory();
    if (!track?.id) return;
    if (h[0]?.id === track.id) return;

    h.unshift(track);
    setHistory(h.slice(0, HISTORY_LIMIT));
  }

  function renderHistoryGrid() {
    const grid = $("historyGrid");
    if (!grid) return;
    grid.innerHTML = "";
    getHistory().forEach(t => {
      const d = document.createElement("div");
      d.className = "history-item";
      const img = document.createElement("img");
      img.src = t.cover;
      d.appendChild(img);
      grid.appendChild(d);
    });
  }

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

    const { ok, data } = await fetchJson("/api/now-playing");
    if (!ok || !data || !data.playing) {
      card.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }

    card.classList.remove("hidden");
    empty.classList.add("hidden");

    bg.style.backgroundImage = `url(${data.cover})`;
    cover.src = data.cover;
    title.textContent = data.title;
    artist.textContent = data.artists;

    const cur = Math.floor(data.progress_ms / 1000);
    const dur = Math.floor(data.duration_ms / 1000);
    const pct = (cur / dur) * 100;

    const fmt = s => `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`;
    tCur.textContent = fmt(cur);
    tDur.textContent = fmt(dur);
    fill.style.width = `${pct}%`;

    pushHistory({
      id: data.track_id,
      cover: data.cover,
      title: data.title
    });
    renderHistoryGrid();
  }

  async function submitLetter() {
    const ta = $("letterInput");
    const btn = $("sendLetter");
    const st = $("letterStatus");

    const msg = ta.value.trim();
    if (msg.length < 2) return;

    btn.disabled = true;
    const { ok } = await fetchJson("/api/letters/submit", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ message: msg })
    });

    if (ok) {
      ta.value = "";
      st.textContent = "sent for moderation.";
    } else {
      st.textContent = "error sending message.";
    }

    btn.disabled = false;
  }

  async function loadApproved() {
    const list = $("lettersList");
    const { ok, data } = await fetchJson("/api/letters/list");
    if (!ok) { list.textContent = "failed to load"; return; }
    list.innerHTML = "";
    data.items.forEach(it => {
      const d = document.createElement("div");
      d.className = "letter-item";
      d.innerHTML = `<div class="letter-msg">${it.message}</div>
                     <div class="letter-time">${new Date(it.createdAt).toLocaleString()}</div>`;
      list.appendChild(d);
    });
  }

  function init() {
    tickTime();
    setInterval(tickTime,1000);

    renderSpotify();
    setInterval(renderSpotify,SPOTIFY_POLL_MS);

    renderHistoryGrid();

    $("sendLetter")?.addEventListener("click",submitLetter);
    loadApproved();
    setInterval(loadApproved,LETTERS_POLL_MS);
  }

  document.addEventListener("DOMContentLoaded",init,{once:true});
})();
