"use strict";

/* alive */
const born = new Date("2010-08-05T00:00:00Z");
setInterval(() => {
  const e = document.getElementById("alive");
  let d = Math.floor((Date.now() - born) / 1000);
  const days = Math.floor(d / 86400);
  d %= 86400;
  const h = Math.floor(d / 3600);
  d %= 3600;
  const m = Math.floor(d / 60);
  const s = d % 60;
  e.textContent = `${days}d, ${h}h, ${m}m, ${s}s`;
}, 1000);

/* time */
setInterval(() => {
  document.getElementById("time").textContent =
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Yekaterinburg",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(new Date());
}, 1000);

/* visits */
fetch("/api/visit", { cache: "no-store" })
  .then(r => r.json())
  .then(d => document.getElementById("visits").textContent = d.count)
  .catch(() => document.getElementById("visits").textContent = "?");

/* reactions */
fetch("/api/react").then(r => r.json()).then(data => {
  document.querySelectorAll(".reactions button").forEach(b => {
    b.querySelector("span").textContent = data[b.dataset.r];
  });
});

document.querySelectorAll(".reactions button").forEach(btn => {
  btn.onclick = async () => {
    await fetch("/api/react", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: btn.dataset.r })
    });
    btn.disabled = true;
  };
});
