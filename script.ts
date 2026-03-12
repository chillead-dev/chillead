(() => {
  "use strict";

  // ── Настройки ────────────────────────────────────────────────
  const TZ           = "Asia/Yekaterinburg";
  // Дата рождения — 5 августа 2010
  const BIRTH        = new Date("2010-08-05T00:00:00+05:00").getTime();
  const LETTERS_POLL = 30_000;
  const LETTERS_PER_PAGE = 6;
  const MAX_INPUT_LEN    = 500;

  const GIFS: Readonly<Record<string, string>> = {
    "1": "https://media.tenor.com/nVWK_eK2DUAAAAAi/hiiragi-kagami-kagami-hiiragi.gif",
    "2": "https://media1.tenor.com/m/j-_mdt1JfEIAAAAd/anime-wow.gif",
    "3": "https://media.tenor.com/119A2x7NLDIAAAAi/anime.gif",
    "4": "https://media.tenor.com/uEF6PGuX_p8AAAA1/nyaa-cat.webp",
  } as const;

  const ALLOWED_GIF_HOSTS = new Set([
    "media.tenor.com", "media1.tenor.com",
  ]);

  // ── DOM helpers ──────────────────────────────────────────────
  function $<T extends HTMLElement>(id: string): T | null {
    return document.getElementById(id) as T | null;
  }
  function safeText(s: string): Text {
    return document.createTextNode(s);
  }

  // ── State ────────────────────────────────────────────────────
  let lettersPage  = 1;
  let selectedGif: string | null = null;

  // ── Fetch helper ─────────────────────────────────────────────
  async function fetchJson<T>(
    url: string,
    opts: RequestInit = {},
    timeout = 12_000,
  ): Promise<{ ok: boolean; data: T | null }> {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const r = await fetch(url, { ...opts, cache: "no-store", signal: ctrl.signal });
      const j = await r.json().catch(() => null) as T | null;
      return { ok: r.ok, data: j };
    } catch {
      return { ok: false, data: null };
    } finally {
      clearTimeout(timer);
    }
  }

  // ── Sanitise GIF URL ─────────────────────────────────────────
  function sanitizeGifUrl(url: string): string | null {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:") return null;
      if (!ALLOWED_GIF_HOSTS.has(u.hostname)) return null;
      return u.href;
    } catch { return null; }
  }

  // ── Sanitise user input ──────────────────────────────────────
  function sanitizeInput(s: string): string {
    return s
      .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\uFEFF]/g, "")
      .trim()
      .slice(0, MAX_INPUT_LEN);
  }

  // ── Clock + age ──────────────────────────────────────────────
  function calcAge(birth: number): number {
    const now      = new Date();
    const birthDay = new Date(birth);
    let age        = now.getFullYear() - birthDay.getFullYear();
    const hadBirthday =
      now.getMonth() > birthDay.getMonth() ||
      (now.getMonth() === birthDay.getMonth() && now.getDate() >= birthDay.getDate());
    if (!hadBirthday) age--;
    return age;
  }

  function tickTime(): void {
    const now  = Date.now();
    const diff = Math.floor((now - BIRTH) / 1000);
    if (diff < 0) return;

    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    const alive = $<HTMLSpanElement>("alive");
    if (alive) alive.textContent = `${d}d ${h}h ${m}m ${s}s`;

    const localTime = $<HTMLSpanElement>("localTime");
    if (localTime) {
      localTime.textContent = new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(new Date());
    }

    // Age display
    const age = calcAge(BIRTH);
    const ageEl  = $<HTMLSpanElement>("ageDisplay");
    const ageEl2 = $<HTMLSpanElement>("ageDisplay2");
    if (ageEl)  ageEl.textContent  = String(age);
    if (ageEl2) ageEl2.textContent = String(age);
  }

  // ── GIF picker ───────────────────────────────────────────────
  function initGifPicker(): void {
    document.querySelectorAll<HTMLButtonElement>(".gif-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const g = btn.dataset["g"] ?? null;
        if (!g || !(g in GIFS)) return;
        selectedGif = g;
        document.querySelectorAll<HTMLButtonElement>(".gif-btn")
          .forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
  }

  // ── Message build / parse ────────────────────────────────────
  function buildMessage(text: string, gifId: string | null): string {
    const t = sanitizeInput(text);
    if (!gifId) return t;
    return (t ? t + "\n" : "") + `[g${gifId}]`;
  }

  function parseMessage(msg: string): { text: string; gifUrl: string | null } {
    const rawLines = String(msg ?? "").split("\n").map(l => l.trim());
    let gifUrl: string | null = null;
    const textLines: string[] = [];

    for (const l of rawLines) {
      const m1 = l.match(/^\[g([1-4])\]$/);
      const m2 = l.match(/^g\s*([1-4])$/i);

      if (m1?.[1] && GIFS[m1[1]]) { gifUrl = GIFS[m1[1]] as string; continue; }
      if (m2?.[1] && GIFS[m2[1]]) { gifUrl = GIFS[m2[1]] as string; continue; }

      let legacy = false;
      for (const id in GIFS) {
        if (l === GIFS[id]) { gifUrl = GIFS[id] as string; legacy = true; break; }
      }
      if (legacy) continue;
      if (l) textLines.push(l);
    }

    if (gifUrl) gifUrl = sanitizeGifUrl(gifUrl);
    return { text: textLines.join("\n").trim(), gifUrl };
  }

  // ── Render message ───────────────────────────────────────────
  function renderMessage(container: HTMLElement, msg: string): void {
    const { text, gifUrl } = parseMessage(msg);
    const hasText = text.length > 0;

    if (hasText) {
      const t = document.createElement("div");
      t.appendChild(safeText(text));
      container.appendChild(t);
    }

    if (gifUrl) {
      const img        = document.createElement("img");
      img.src          = gifUrl;
      img.loading      = "lazy";
      img.decoding     = "async";
      img.alt          = "";
      img.className    = hasText ? "msg-gif-inline" : "msg-gif-big";

      if (hasText && container.firstChild instanceof HTMLElement) {
        container.firstChild.appendChild(img);
      } else {
        container.appendChild(img);
      }
    }
  }

  // ── Pagination ───────────────────────────────────────────────
  function renderPagination(total: number): void {
    const box = $<HTMLDivElement>("pagination");
    if (!box) return;
    const pages = Math.max(1, Math.ceil(total / LETTERS_PER_PAGE));
    if (lettersPage > pages) lettersPage = pages;
    box.innerHTML = "";
    if (pages <= 1) return;

    const frag = document.createDocumentFragment();
    for (let p = 1; p <= pages; p++) {
      const btn    = document.createElement("button");
      btn.type     = "button";
      btn.className = `page-btn${p === lettersPage ? " is-active" : ""}`;
      btn.appendChild(safeText(String(p)));
      const page   = p;
      btn.addEventListener("click", () => { lettersPage = page; void loadLetters(); });
      frag.appendChild(btn);
    }
    box.appendChild(frag);
  }

  // ── Load letters ─────────────────────────────────────────────
  interface LetterItem {
    id: string;
    message: string;
    createdAt: number;
    answered: boolean;
    answer: string | null;
    answeredAt: number | null;
  }

  async function loadLetters(): Promise<void> {
    const list = $<HTMLDivElement>("lettersList");
    if (!list) return;

    const { ok, data } = await fetchJson<{ ok: boolean; items: LetterItem[] }>(
      "/api/letters/list"
    );

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

      const tm  = document.createElement("div");
      tm.className = "letter-time";
      const dt  = Number(it.createdAt);
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

  // ── Submit letter ────────────────────────────────────────────
  async function submitLetter(): Promise<void> {
    const ta  = $<HTMLTextAreaElement>("letterInput");
    const btn = $<HTMLButtonElement>("sendBtn");
    const st  = $<HTMLDivElement>("letterStatus");

    const text = sanitizeInput(ta?.value ?? "");
    if (text.length < 1 && !selectedGif) return;

    if (btn) btn.disabled = true;
    if (st)  st.textContent = "sending…";

    const { ok, data } = await fetchJson<{ ok: boolean }>("/api/letters/submit", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ message: buildMessage(text, selectedGif) }),
    });

    if (ok && (data as { ok?: boolean })?.ok) {
      if (ta) ta.value = "";
      selectedGif = null;
      document.querySelectorAll<HTMLButtonElement>(".gif-btn")
        .forEach(b => b.classList.remove("selected"));
      if (st) st.textContent = "sent for moderation.";
      await loadLetters();
    } else {
      if (st) st.textContent = "error sending. try again.";
    }

    setTimeout(() => { if (btn) btn.disabled = false; }, 500);
  }

  // ── Init ─────────────────────────────────────────────────────
  function init(): void {
    tickTime();
    setInterval(tickTime, 1000);
    initGifPicker();
    $<HTMLButtonElement>("sendBtn")
      ?.addEventListener("click", () => void submitLetter());
    void loadLetters();
    setInterval(() => void loadLetters(), LETTERS_POLL);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
