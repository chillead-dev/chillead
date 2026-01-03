function addCursor(node) {
  const c = document.createElement("span");
  c.className = "cursor";
  c.textContent = " █";
  node.appendChild(c);
}

document.querySelectorAll("h1,h2,h3").forEach(addCursor);

setInterval(() => {
  document.querySelectorAll(".cursor").forEach(c => {
    c.style.opacity = (c.style.opacity === "0") ? "1" : "0";
  });
}, 600);
