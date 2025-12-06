function updateTime() {
  const now = new Date();

  const ekbTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Yekaterinburg",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(now);

  document.getElementById("time").textContent = ekbTime;
}

updateTime();
setInterval(updateTime, 1000);
