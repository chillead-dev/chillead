(() => {
  "use strict";

  const GIFS = {
    1: "https://media.tenor.com/nVWK_eK2DUAAAAAi/hiiragi-kagami-kagami-hiiragi.gif",
    2: "https://media1.tenor.com/m/j-_mdt1JfEIAAAAd/anime-wow.gif",
    3: "https://media.tenor.com/119A2x7NLDIAAAAi/anime.gif",
    4: "https://media.tenor.com/uEF6PGuX_p8AAAA1/nyaa-cat.webp"
  };

  const $ = id => document.getElementById(id);
  let selectedGif = null;

  function extract(message){
    const lines = String(message||"").split("\n").map(l=>l.trim());
    let gif = null;
    const text = [];

    for(const l of lines){
      const m = l.match(/^\[g([1-4])\]$/);
      if(m && GIFS[m[1]]) { gif = GIFS[m[1]]; continue; }
      text.push(l);
    }
    return { text: text.join("\n").trim(), gif };
  }

  function render(container, message){
    const { text, gif } = extract(message);

    if(text){
      const t = document.createElement("div");
      t.textContent = text;
      container.appendChild(t);
    }

    if(gif){
      const img = document.createElement("img");
      img.src = gif;
      img.className = text ? "msg-gif-inline" : "msg-gif-big";
      if(text) container.firstChild.appendChild(img);
      else container.appendChild(img);
    }
  }

  async function load(){
    const list = $("lettersList");
    const r = await fetch("/api/letters/list");
    const j = await r.json();
    list.innerHTML = "";

    j.items.forEach(it=>{
      const row = document.createElement("div");
      row.className = "letter-item";

      const msg = document.createElement("div");
      msg.className = "letter-msg";
      render(msg, it.message);

      const tm = document.createElement("div");
      tm.className = "letter-time";
      tm.textContent = new Date(it.createdAt).toLocaleString();

      row.appendChild(msg);
      row.appendChild(tm);
      list.appendChild(row);
    });
  }

  function init(){
    document.querySelectorAll(".gif-btn").forEach(btn=>{
      btn.onclick = ()=>{
        selectedGif = btn.dataset.g;
        $("letterInput").value += ( $("letterInput").value ? "\n" : "" ) + `[g${selectedGif}]`;
      };
    });

    $("sendBtn").onclick = async ()=>{
      const ta = $("letterInput");
      if(!ta.value.trim()) return;

      await fetch("/api/letters/submit",{
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body:JSON.stringify({ message: ta.value })
      });

      ta.value="";
      selectedGif=null;
      load();
    };

    load();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
