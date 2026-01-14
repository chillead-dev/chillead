(() => {
  "use strict";

  const TZ = "Asia/Yekaterinburg";
  const BIRTH = new Date("2010-08-05T00:00:00+05:00").getTime();

  const SPOTIFY_POLL = 15000;
  const LETTERS_POLL = 30000;

  const HISTORY_KEY = "spotify_history_v3";
  const HISTORY_LIMIT = 80;

  const GIFS = {
    1:"https://media.tenor.com/nVWK_eK2DUAAAAAi/hiiragi-kagami-kagami-hiiragi.gif",
    2:"https://media1.tenor.com/m/j-_mdt1JfEIAAAAd/anime-wow.gif",
    3:"https://media.tenor.com/119A2x7NLDIAAAAi/anime.gif",
    4:"https://media.tenor.com/uEF6PGuX_p8AAAA1/nyaa-cat.webp"
  };

  const $ = id => document.getElementById(id);

  async function fetchJson(url, opts = {}, timeout = 12000){
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), timeout);
    try{
      const r = await fetch(url, { ...opts, cache:"no-store", signal: ctrl.signal });
      const j = await r.json().catch(()=>null);
      return { ok:r.ok, data:j };
    }catch{
      return { ok:false, data:null };
    }finally{
      clearTimeout(t);
    }
  }

  function fmtClock(ms){
    const s=Math.floor(Number(ms||0)/1000);
    const m=Math.floor(s/60);
    return `${m}:${String(s%60).padStart(2,"0")}`;
  }

  function ago(ts){
    const d=Math.floor((Date.now()-ts)/1000);
    if(d<60) return `${d}s`;
    if(d<3600) return `${Math.floor(d/60)}m`;
    if(d<86400) return `${Math.floor(d/3600)}h`;
    return `${Math.floor(d/86400)}d`;
  }

  function tickTime(){
    const now=Date.now();
    const diff=Math.floor((now-BIRTH)/1000);

    const d=Math.floor(diff/86400);
    const h=Math.floor((diff%86400)/3600);
    const m=Math.floor((diff%3600)/60);
    const s=diff%60;

    $("alive").textContent=`${d}d ${h}h ${m}m ${s}s`;
    $("localTime").textContent=new Intl.DateTimeFormat("en-GB",{
      timeZone:TZ,hour:"2-digit",minute:"2-digit",second:"2-digit"
    }).format(new Date());
  }

  /* ===== history ===== */
  function loadHistory(){
    try{ return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]"); }
    catch{ return []; }
  }
  function saveHistory(h){
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0,HISTORY_LIMIT)));
  }
  function pushHistory(track){
    const h=loadHistory();
    if(h[0]?.id===track.id) return;
    h.unshift({...track,ts:Date.now()});
    saveHistory(h);
  }
  function renderHistory(){
    const row=$("historyRow");
    if(!row) return;
    row.innerHTML="";
    loadHistory().forEach(t=>{
      const tile=document.createElement("div");
      tile.className="history-tile";

      const img=document.createElement("img");
      img.src=t.cover;
      tile.appendChild(img);

      const ov=document.createElement("div");
      ov.className="history-overlay";

      const n=document.createElement("div");
      n.className="history-name";
      n.textContent=t.title;

      const a=document.createElement("div");
      a.className="history-artist";
      a.textContent=t.artist;

      const w=document.createElement("div");
      w.className="history-when";
      w.textContent=ago(t.ts);

      ov.append(n,a,w);
      tile.appendChild(ov);
      row.appendChild(tile);
    });
  }

  /* ===== spotify ===== */
  async function updateSpotify(){
    const {ok,data}=await fetchJson("/api/now-playing");
    const card=$("spotifyCard");
    const empty=$("spotifyEmpty");

    if(!ok||!data||!data.playing){
      card.classList.add("hidden");
      empty.classList.remove("hidden");
      return;
    }

    card.classList.remove("hidden");
    empty.classList.add("hidden");

    $("spotifyBg").style.backgroundImage=`url(${data.cover})`;
    $("spotifyCover").src=data.cover;
    $("spotifyTitle").textContent=data.title;
    $("spotifyArtist").textContent=data.artists;

    $("spotifyTimeCur").textContent=fmtClock(data.progress_ms);
    $("spotifyTimeDur").textContent=fmtClock(data.duration_ms);

    const pct=(data.progress_ms/data.duration_ms)*100;
    $("spotifyFill").style.width=`${pct}%`;

    pushHistory({
      id:data.track_id,
      cover:data.cover,
      title:data.title,
      artist:data.artists
    });
    renderHistory();
  }

  /* ===== gif picker ===== */
  let selectedGif=null;

  function initGifPicker(){
    document.querySelectorAll(".gif-btn").forEach(btn=>{
      btn.addEventListener("click",()=>{
        selectedGif = btn.dataset.g;
        document.querySelectorAll(".gif-btn").forEach(b=>b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });
  }

  function buildMessage(text, gifId){
    const t = String(text||"").trim();
    if(!gifId) return t;
    // store as tag on separate line
    return (t ? t + "\n" : "") + `[g${gifId}]`;
  }

  /* ===== parse message (NO g1 leftovers) ===== */
  function parseMessage(msg){
    const rawLines = String(msg||"").split("\n").map(l=>l.trim());
    let gifUrl=null;
    const textLines=[];

    for(const l of rawLines){
      // tag styles: [g1], g1, g 1
      const m1 = l.match(/^\[g([1-4])\]$/);
      const m2 = l.match(/^g\s*([1-4])$/i);

      if(m1 && GIFS[m1[1]]){ gifUrl = GIFS[m1[1]]; continue; }
      if(m2 && GIFS[m2[1]]){ gifUrl = GIFS[m2[1]]; continue; }

      // legacy raw URL
      let isLegacy=false;
      for(const id in GIFS){
        if(l === GIFS[id]){ gifUrl = GIFS[id]; isLegacy=true; break; }
      }
      if(isLegacy) continue;

      if(l) textLines.push(l);
    }

    return { text: textLines.join("\n").trim(), gifUrl };
  }

  function renderMessage(container, msg){
    const {text, gifUrl} = parseMessage(msg);
    const hasText = text.length > 0;

    if(hasText){
      const t=document.createElement("div");
      t.textContent=text;
      container.appendChild(t);
    }

    if(gifUrl){
      const img=document.createElement("img");
      img.src=gifUrl;
      img.loading="lazy";
      img.decoding="async";

      // BIG when only gif; INLINE when text+gif
      img.className = hasText ? "msg-gif-inline" : "msg-gif-big";

      if(hasText){
        // attach inline to same line
        container.firstChild.appendChild(img);
      }else{
        container.appendChild(img);
      }
    }
  }

  /* ===== shoutbox ===== */
  async function loadLetters(){
    const list=$("lettersList");
    if(!list) return;

    const {ok,data}=await fetchJson("/api/letters/list");
    list.innerHTML="";

    if(!ok||!data||!data.ok){
      list.textContent="failed to load";
      return;
    }

    const items = Array.isArray(data.items) ? data.items : [];
    if(!items.length){
      list.textContent="no messages yet.";
      return;
    }

    const frag=document.createDocumentFragment();

    for(const it of items){
      const row=document.createElement("div");
      row.className="letter-item";

      const msg=document.createElement("div");
      msg.className="letter-msg";
      renderMessage(msg, it.message);

      if(it.answered && it.answer){
        const ans=document.createElement("div");
        const b=document.createElement("span");
        b.className="letter-answer-label";
        b.textContent="answer";
        const t=document.createElement("span");
        t.textContent=" " + it.answer;
        ans.appendChild(b);
        ans.appendChild(t);
        msg.appendChild(ans);
      }

      const tm=document.createElement("div");
      tm.className="letter-time";
      tm.textContent=new Date(Number(it.createdAt)).toLocaleString();

      row.appendChild(msg);
      row.appendChild(tm);
      frag.appendChild(row);
    }

    list.appendChild(frag);
  }

  /* ===== submit ===== */
  async function submitLetter(){
    const ta=$("letterInput");
    const btn=$("sendBtn");
    const st=$("letterStatus");

    const text = ta.value.trim();
    if(text.length < 1 && !selectedGif) return;

    btn.disabled=true;
    if(st) st.textContent="sending…";

    const message = buildMessage(text, selectedGif);

    const {ok,data}=await fetchJson("/api/letters/submit",{
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ message })
    });

    if(ok && data && data.ok){
      ta.value="";
      selectedGif=null;
      document.querySelectorAll(".gif-btn").forEach(b=>b.classList.remove("selected"));
      if(st) st.textContent="sent for moderation.";
      loadLetters();
    }else{
      if(st) st.textContent="error sending message.";
    }

    setTimeout(()=>{ btn.disabled=false; }, 500);
  }

  function init(){
    tickTime();
    setInterval(tickTime,1000);

    renderHistory();
    updateSpotify();
    setInterval(updateSpotify,SPOTIFY_POLL);

    initGifPicker();
    $("sendBtn")?.addEventListener("click", submitLetter);

    loadLetters();
    setInterval(loadLetters,LETTERS_POLL);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
