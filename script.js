(() => {
  "use strict";

  /* =========================
     CONSTANTS
  ========================= */
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

  /* =========================
     HELPERS
  ========================= */
  const $ = id => document.getElementById(id);

  function safeJsonFetch(url, opts={}, timeout=12000){
    const ctrl = new AbortController();
    const t = setTimeout(()=>ctrl.abort(), timeout);
    return fetch(url,{...opts,signal:ctrl.signal,cache:"no-store"})
      .then(r=>r.json().then(j=>({ok:r.ok,data:j})).catch(()=>({ok:false,data:null})))
      .catch(()=>({ok:false,data:null}))
      .finally(()=>clearTimeout(t));
  }

  function fmtClock(ms){
    const s=Math.floor(ms/1000);
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

  /* =========================
     TIME
  ========================= */
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

  /* =========================
     HISTORY
  ========================= */
  function loadHistory(){
    try{
      return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");
    }catch{ return [] }
  }

  function saveHistory(h){
    localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(0,HISTORY_LIMIT)));
  }

  function pushHistory(track){
    const h=loadHistory();
    if(h[0]?.id===track.id) return;
    h.unshift({...track,ts:Date.now()});
    saveHistory(h);
  }

  function renderHistory(){
    const row=$("historyRow");
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

  /* =========================
     SPOTIFY
  ========================= */
  async function updateSpotify(){
    const {ok,data}=await safeJsonFetch("/api/now-playing");
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
    $("spotifyFill").style.width=
      `${(data.progress_ms/data.duration_ms)*100}%`;

    pushHistory({
      id:data.track_id,
      cover:data.cover,
      title:data.title,
      artist:data.artists
    });
    renderHistory();
  }

  /* =========================
     LETTERBOX + GIF LOGIC
  ========================= */
  let selectedGif=null;

  function selectGif(btn){
    document.querySelectorAll(".gif-btn")
      .forEach(b=>b.classList.remove("selected"));
    btn.classList.add("selected");
    selectedGif=btn.dataset.g;
  }

  function parseMessage(msg){
    const lines=msg.split("\n").map(l=>l.trim());
    let gif=null,text=[];
    lines.forEach(l=>{
      const m=l.match(/^\[g([1-4])\]$/);
      if(m) gif=GIFS[m[1]];
      else text.push(l);
    });
    return {text:text.join("\n").trim(),gif};
  }

  function renderMessage(el,msg){
    const {text,gif}=parseMessage(msg);
    if(text){
      const t=document.createElement("div");
      t.textContent=text;
      el.appendChild(t);
    }
    if(gif){
      const img=document.createElement("img");
      img.src=gif;
      img.className=text?"msg-gif-inline":"msg-gif-big";
      text ? el.firstChild.appendChild(img) : el.appendChild(img);
    }
  }

  async function submitLetter(){
    const ta=$("letterInput");
    if(!ta.value.trim()&&!selectedGif) return;

    const message=
      (ta.value.trim()?ta.value.trim()+"\n":"")+
      (selectedGif?`[g${selectedGif}]`:"");

    await fetch("/api/letters/submit",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({message})
    });

    ta.value="";
    selectedGif=null;
    document.querySelectorAll(".gif-btn")
      .forEach(b=>b.classList.remove("selected"));
    loadLetters();
  }

  async function loadLetters(){
    const {data}=await safeJsonFetch("/api/letters/list");
    const list=$("lettersList");
    list.innerHTML="";
    data.items.forEach(it=>{
      const row=document.createElement("div");
      row.className="letter-item";

      const msg=document.createElement("div");
      msg.className="letter-msg";
      renderMessage(msg,it.message);

      const tm=document.createElement("div");
      tm.className="letter-time";
      tm.textContent=new Date(it.createdAt).toLocaleString();

      row.append(msg,tm);
      list.appendChild(row);
    });
  }

  /* =========================
     INIT
  ========================= */
  function init(){
    tickTime();
    setInterval(tickTime,1000);

    updateSpotify();
    setInterval(updateSpotify,SPOTIFY_POLL);

    document.querySelectorAll(".gif-btn")
      .forEach(b=>b.onclick=()=>selectGif(b));
    $("sendBtn").onclick=submitLetter;

    loadLetters();
    setInterval(loadLetters,LETTERS_POLL);
  }

  document.addEventListener("DOMContentLoaded",init);
})();
