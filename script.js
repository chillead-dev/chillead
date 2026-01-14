const GIFS = {
  1: "https://media.tenor.com/nVWK_eK2DUAAAAAi/hiiragi-kagami-kagami-hiiragi.gif",
  2: "https://media1.tenor.com/m/j-_mdt1JfEIAAAAd/anime-wow.gif",
  3: "https://media.tenor.com/119A2x7NLDIAAAAi/anime.gif",
  4: "https://media.tenor.com/uEF6PGuX_p8AAAA1/nyaa-cat.webp"
};

let selectedGif = null;

document.querySelectorAll(".gif-picker button").forEach(btn=>{
  btn.onclick = ()=> {
    selectedGif = btn.dataset.gif;
  };
});

sendBtn.onclick = async ()=>{
  const text = letterText.value.trim();
  if(!text && !selectedGif) return;

  const body = { text, gifId: selectedGif };

  sendBtn.disabled = true;
  letterStatus.textContent = "sending…";

  const r = await fetch("/api/letters/submit",{
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify(body)
  });

  if(r.ok){
    letterText.value="";
    selectedGif=null;
    letterStatus.textContent="sent!";
    loadLetters();
  }else{
    letterStatus.textContent="error";
  }

  sendBtn.disabled = false;
};

async function loadLetters(){
  const r = await fetch("/api/letters/list");
  const j = await r.json();

  lettersList.innerHTML="";

  j.items.forEach(m=>{
    const div = document.createElement("div");
    div.className="letter-item";

    if(m.text){
      const p = document.createElement("div");
      p.textContent = m.text;
      div.appendChild(p);
    }

    if(m.gifId && GIFS[m.gifId]){
      const img = document.createElement("img");
      img.src = GIFS[m.gifId];
      img.className="msg-gif";
      div.appendChild(img);
    }

    if(m.answered){
      const a = document.createElement("div");
      a.textContent = "answer: " + m.answer;
      div.appendChild(a);
    }

    lettersList.appendChild(div);
  });
}

loadLetters();
