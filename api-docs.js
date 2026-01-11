const apiStatus = document.getElementById("apiStatus");
const lbStatus = document.getElementById("lbStatus");
const npStatus = document.getElementById("npStatus");

function ok(el, text){
  el.textContent = text;
  el.style.color = "#8fff8f";
}

function bad(el, text){
  el.textContent = text;
  el.style.color = "#ff8f8f";
}

(async ()=>{
  try{
    const r = await fetch("/api/letters/list", { cache:"no-store" });
    const j = await r.json();
    if(j && j.ok){
      ok(apiStatus, "online");
      ok(lbStatus, "online");
    }else{
      bad(apiStatus, "error");
      bad(lbStatus, "error");
    }
  }catch{
    bad(apiStatus, "offline");
    bad(lbStatus, "offline");
  }
})();

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
