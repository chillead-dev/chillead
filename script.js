// ===== alive counter =====
const aliveEl = document.getElementById("alive");
const born = new Date("2010-08-05T00:00:00Z").getTime();

setInterval(()=>{
  const d = Date.now() - born;
  const days = Math.floor(d/86400000);
  const h = Math.floor(d/3600000)%24;
  const m = Math.floor(d/60000)%60;
  const s = Math.floor(d/1000)%60;
  aliveEl.textContent = `alive: ${days}d ${h}h ${m}m ${s}s`;
},1000);

// ===== letterbox =====
const text = document.getElementById("letterText");
const send = document.getElementById("sendLetter");
const status = document.getElementById("letterStatus");

document.querySelectorAll(".emojis span").forEach(e=>{
  e.onclick = ()=> text.value += " " + e.textContent;
});

send.onclick = async ()=>{
  if(text.value.trim().length < 2){
    status.textContent = "too short.";
    return;
  }

  const r = await fetch("/api/letters/submit",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ message:text.value })
  });

  const j = await r.json();
  status.textContent = j.ok ? "sent for moderation." : "error.";
  if(j.ok) text.value = "";
};

// ===== history (пример, у тебя подменяется реальными данными) =====
const history = document.getElementById("history");

function addTrack(title, artist, cover){
  history.insertAdjacentHTML("beforeend",`
    <div class="track-card">
      <img src="${cover}">
      <div>
        <div class="track-title">${title}</div>
        <div class="track-artist">${artist}</div>
      </div>
    </div>
  `);
}

// DEMO
addTrack("hyperpop luv","whyalive","https://i.scdn.co/image/ab67616d00001e02");
addTrack("Shine","FRANSE","https://i.scdn.co/image/ab67616d00001e02");
addTrack("Mitchell & Ness","reefuh","https://i.scdn.co/image/ab67616d00001e02");
