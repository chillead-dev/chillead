const birthDate = new Date("2010-08-05T00:00:00Z");

function updateAlive() {
  const now = new Date();
  let diff = Math.floor((now - birthDate) / 1000);

  const years = Math.floor(diff / (60 * 60 * 24 * 365.25));
  diff -= Math.floor(years * 365.25 * 24 * 60 * 60);

  const days = Math.floor(diff / (60 * 60 * 24));
  diff -= days * 86400;

  const hours = Math.floor(diff / 3600);
  diff -= hours * 3600;

  const minutes = Math.floor(diff / 60);
  const seconds = diff % 60;

  document.getElementById("alive").textContent =
    `${years}y, ${days}d, ${hours}h, ${minutes}m, ${seconds}s`;
}

updateAlive();
setInterval(updateAlive, 1000);
