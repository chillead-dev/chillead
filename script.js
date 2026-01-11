// ===== letterbox =====
const text = document.getElementById("letterText");
const send = document.getElementById("sendLetter");
const status = document.getElementById("letterStatus");

document.querySelectorAll(".emojis button").forEach(b=>{
  b.onclick = ()=> text.value += " " + b.textContent;
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

// ===== history demo (замени на spotify api) =====
const history = document.getElementById("history");

const demoTracks = [
  { t:"hyperpop luv", a:"whyalive", c:"https://i.scdn.co/image/ab67616d00001e02" },
  { t:"Shine", a:"FRANSE", c:"https://i.scdn.co/image/ab67616d00001e02" },
  { t:"Mitchell & Ness", a:"reefuh", c:"https://i.scdn.co/image/ab67616d00001e02" }
];

demoTracks.forEach(x=>{
  history.insertAdjacentHTML("beforeend",`
    <div class="track">
      <img src="${x.c}">
      <div>
        <div class="track-title">${x.t}</div>
        <div class="track-artist">${x.a}</div>
      </div>
    </div>
  `);
});
