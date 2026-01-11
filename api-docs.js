const apiStatus = document.getElementById("apiStatus");
const npStatus = document.getElementById("npStatus");
const lbStatus = document.getElementById("lbStatus");

function ok(el, text){
  el.textContent = text;
  el.style.color = "#8fff8f";
}

function bad(el, text){
  el.textContent = text;
  el.style.color = "#ff8f8f";
}

// ===== main api check =====
(async ()=>{
  try{
    const r = await fetch("/api/letters/list", { cache:"no-store" });
    const j = await r.json();
    if(j && j.ok){
      ok(apiStatus, "online");
    }else{
      bad(apiStatus, "error");
    }
  }catch{
    bad(apiStatus, "offline");
  }
})();

// ===== now-playing check =====
(async ()=>{
  try{
    const r = await fetch("/api/now-playing", { cache:"no-store" });
    const j = await r.json();
    if(j && j.ok !== undefined){
      ok(npStatus, "online");
    }else{
      bad(npStatus, "error");
    }
  }catch{
    bad(npStatus, "offline");
  }
})();

// ===== letterbox submit check (dry run) =====
(async ()=>{
  try{
    const r = await fetch("/api/letters/submit", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ message: "health-check" })
    });
    const j = await r.json();
    if(j && j.ok){
      ok(lbStatus, "online");
    }else{
      bad(lbStatus, "error");
    }
  }catch{
    bad(lbStatus, "offline");
  }
})();
