(() => {
  const $ = id => document.getElementById(id);

  // TIME
  const BIRTH = new Date("2010-08-05T00:00:00+05:00").getTime();
  const TZ = "Asia/Yekaterinburg";

  function tick(){
    const now = Date.now();
    const diff = Math.floor((now - BIRTH)/1000);
    const d = Math.floor(diff/86400);
    const h = Math.floor(diff%86400/3600);
    const m = Math.floor(diff%3600/60);
    const s = diff%60;
    $("alive").textContent = `${d}d ${h}h ${m}m ${s}s`;
    $("localTime").textContent = new Intl.DateTimeFormat("en-GB",{
      timeZone:TZ,hour:"2-digit",minute:"2-digit",second:"2-digit"
    }).format(new Date());
  }

  setInterval(tick,1000);
  tick();

  // GIF PICKER
  document.querySelectorAll(".gif-picker img").forEach(img=>{
    img.addEventListener("click",()=>{
      const ta = $("letterInput");
      ta.value += `\n${img.dataset.gif}\n`;
      ta.focus();
    });
  });

  // SUBMIT LETTER
  $("sendLetter").onclick = async ()=>{
    const msg = $("letterInput").value.trim();
    if(!msg) return;

    $("sendLetter").disabled = true;
    $("letterStatus").textContent = "sending…";

    try{
      const r = await fetch("/api/letters/submit",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message:msg})
      });
      const j = await r.json();
      if(j.ok){
        $("letterInput").value="";
        $("letterStatus").textContent="sent!";
      }else{
        $("letterStatus").textContent="error";
      }
    }catch{
      $("letterStatus").textContent="network error";
    }

    $("sendLetter").disabled=false;
  };

  // LOAD SHOUTBOX
  async function load(){
    const r = await fetch("/api/letters/list");
    const j = await r.json();
    const box = $("lettersList");
    box.innerHTML="";
    j.items.forEach(it=>{
      const d=document.createElement("div");
      d.className="letter-item";
      d.innerHTML = `
        <div class="letter-msg">
          ${it.message.replace(/https?:\/\/\S+\.(gif|webp)/g,
            u=>`<img src="${u}">`)}
          ${it.answered?`<div><b>answer:</b> ${it.answer}</div>`:""}
        </div>
      `;
      box.appendChild(d);
    });
  }
  load();
})();
