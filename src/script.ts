(() => {
  "use strict";

  const TZ = "Asia/Yekaterinburg";
  const BIRTH = new Date("2010-08-05T00:00:00+05:00").getTime();
  const LETTERS_POLL = 30_000;
  const LETTERS_PER_PAGE = 6;

  const GIFS: Readonly<Record<string, string>> = {
    "1": "https://media.tenor.com/nVWK_eK2DUAAAAAi/hiiragi-kagami-kagami-hiiragi.gif",
    "2": "https://media1.tenor.com/m/j-_mdt1JfEIAAAAd/anime-wow.gif",
    "3": "https://media.tenor.com/119A2x7NLDIAAAAi/anime.gif",
    "4": "https://media.tenor.com/uEF6PGuX_p8AAAA1/nyaa-cat.webp",
  };

  const ALLOWED_GIF_HOSTS = new Set([
    "media.tenor.com", "media1.tenor.com", "media2.tenor.com", "c.tenor.com",
  ]);

  interface LetterItem {
    id: string; message: string; createdAt: number;
    answered: boolean; answer: string | null; answeredAt: number | null;
  }

  function $<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }

  function safeText(s: string): Text { return document.createTextNode(s); }

  function sanitizeImageUrl(url: string, hosts: Set<string>): string | null {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") return null;
      if (!hosts.has(u.hostname)) return null;
      return u.href;
    } catch { return null; }
  }

  let lettersPage = 1;
  let selectedGif: string | null = null;

  async function fetchJson<T>(url: string, opts: RequestInit = {}, timeout = 12_000): Promise<{ ok: boolean; data: T | null }> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { ...opts, cache: "no-store", signal: ctrl.signal });
      const j = await r.json().catch(() => null) as T | null;
      return { ok: r.ok, data: j };
    } catch { return { ok: false, data: null }; }
    finally { clearTimeout(t); }
  }

  function tickTime(): void {
    const diff = Math.floor((Date.now() - BIRTH) / 1000);
    const d = Math.floor(diff / 86400), h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60), s = diff % 60;
    const alive = $<HTMLSpanElement>("alive");
    const localTime = $<HTMLSpanElement>("localTime");
    if (alive) alive.textContent = `${d}d ${h}h ${m}m ${s}s`;
    if (localTime) localTime.textContent = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit",
    }).format(new Date());
  }

  function parseMessage(msg: string): { text: string; gifUrl: string | null } {
    const rawLines = String(msg ?? "").split("\n").map(l => l.trim());
    let gifUrl: string | null = null;
    const textLines: string[] = [];
    for (const l of rawLines) {
      const m1 = l.match(/^\[g([1-4])\]$/), m2 = l.match(/^g\s*([1-4])$/i);
      if (m1 && GIFS[m1[1] as string]) { gifUrl = GIFS[m1[1] as string] ?? null; continue; }
      if (m2 && GIFS[m2[1] as string]) { gifUrl = GIFS[m2[1] as string] ?? null; continue; }
      let legacy = false;
      for (const id in GIFS) { if (l === GIFS[id]) { gifUrl = GIFS[id] ?? null; legacy = true; break; } }
      if (legacy) continue;
      if (l) textLines.push(l);
    }
    if (gifUrl) gifUrl = sanitizeImageUrl(gifUrl, ALLOWED_GIF_HOSTS);
    return { text: textLines.join("\n").trim(), gifUrl };
  }

  function renderMessage(container: HTMLElement, msg: string): void {
    const { text, gifUrl } = parseMessage(msg);
    const hasText = text.length > 0;
    if (hasText) { const t = document.createElement("div"); t.appendChild(safeText(text)); container.appendChild(t); }
    if (gifUrl) {
      const img = document.createElement("img");
      img.src = gifUrl; img.loading = "lazy"; img.decoding = "async"; img.alt = "";
      img.className = hasText ? "msg-gif-inline" : "msg-gif-big";
      if (hasText && container.firstChild instanceof HTMLElement) container.firstChild.appendChild(img);
      else container.appendChild(img);
    }
  }

  function buildMessage(text: string, gifId: string | null): string {
    const t = text.trim();
    if (!gifId) return t;
    return (t ? t + "\n" : "") + `[g${gifId}]`;
  }

  function initGifPicker(): void {
    document.querySelectorAll<HTMLButtonElement>(".gif-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        selectedGif = btn.dataset["g"] ?? null;
        document.querySelectorAll<HTMLButtonElement>(".gif-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
  }

  function renderPagination(total: number): void {
    const box = $<HTMLDivElement>("pagination");
    if (!box) return;
    const pages = Math.max(1, Math.ceil(total / LETTERS_PER_PAGE));
    if (lettersPage > pages) lettersPage = pages;
    box.innerHTML = "";
    if (pages <= 1) return;
    const frag = document.createDocumentFragment();
    for (let p = 1; p <= pages; p++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `page-btn${p === lettersPage ? " is-active" : ""}`;
      btn.appendChild(safeText(String(p)));
      btn.addEventListener("click", () => { lettersPage = p; void loadLetters(); });
      frag.appendChild(btn);
    }
    box.appendChild(frag);
  }

  async function loadLetters(): Promise<void> {
    const list = $<HTMLDivElement>("lettersList");
    if (!list) return;
    const { ok, data } = await fetchJson<{ ok: boolean; items: LetterItem[] }>("/api/letters/list");
    list.innerHTML = "";
    if (!ok || !data?.ok) { list.appendChild(safeText("failed to load")); renderPagination(0); return; }
    const items = Array.isArray(data.items) ? data.items : [];
    if (!items.length) { list.appendChild(safeText("no messages yet.")); renderPagination(0); return; }
    const offset = (lettersPage - 1) * LETTERS_PER_PAGE;
    const pageItems = items.slice(offset, offset + LETTERS_PER_PAGE);
    const frag = document.createDocumentFragment();
    for (const it of pageItems) {
      const row = document.createElement("div"); row.className = "letter-item";
      const msg = document.createElement("div"); msg.className = "letter-msg";
      renderMessage(msg, it.message);
      if (it.answered && it.answer) {
        const ans = document.createElement("div");
        const b = document.createElement("span"); b.className = "letter-answer-label"; b.appendChild(safeText("answer"));
        const t = document.createElement("span"); t.appendChild(safeText(" " + it.answer));
        ans.appendChild(b); ans.appendChild(t); msg.appendChild(ans);
      }
      const tm = document.createElement("div"); tm.className = "letter-time";
      const dt = Number(it.createdAt);
      tm.appendChild(safeText(Number.isFinite(dt) ? new Date(dt).toLocaleString() : "unknown time"));
      row.appendChild(msg); row.appendChild(tm); frag.appendChild(row);
    }
    list.appendChild(frag);
    renderPagination(items.length);
  }

  async function submitLetter(): Promise<void> {
    const ta = $<HTMLTextAreaElement>("letterInput");
    const btn = $<HTMLButtonElement>("sendBtn");
    const st = $<HTMLDivElement>("letterStatus");
    const text = ta?.value.trim() ?? "";
    if (text.length < 1 && !selectedGif) return;
    if (btn) btn.disabled = true;
    if (st) st.textContent = "sending…";
    const { ok, data } = await fetchJson<{ ok: boolean }>("/api/letters/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: buildMessage(text, selectedGif) }),
    });
    if (ok && data?.ok) {
      if (ta) ta.value = "";
      selectedGif = null;
      document.querySelectorAll<HTMLButtonElement>(".gif-btn").forEach(b => b.classList.remove("selected"));
      if (st) st.textContent = "sent for moderation.";
      await loadLetters();
    } else { if (st) st.textContent = "error sending message."; }
    setTimeout(() => { if (btn) btn.disabled = false; }, 500);
  }

  function init(): void {
    tickTime();
    setInterval(tickTime, 1000);
    initGifPicker();
    $<HTMLButtonElement>("sendBtn")?.addEventListener("click", () => void submitLetter());
    void loadLetters();
    setInterval(() => void loadLetters(), LETTERS_POLL);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
