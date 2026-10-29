(() => {
  // ── Stars ──────────────────────────────────────────
  const canvas = document.getElementById("stars");
  const ctx = canvas.getContext("2d");
  const sparkles = document.getElementById("sparkles");

  // simple seeded random so the sky looks the same every visit
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

  function drawStars() {
    const w = window.innerWidth, h = window.innerHeight;
    const px = 2; // one "pixel" of a star
    canvas.width = Math.ceil(w / px);
    canvas.height = Math.ceil(h / px);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    seed = 7;
    const count = Math.round((w * h) / 2600);
    const colours = ["#FFFFFF", "#FFFFFF", "#FFFFFF", "#CFE9FF", "#FFE9A8"];
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rand() * canvas.width);
      const y = Math.floor(rand() * canvas.height);
      ctx.globalAlpha = 0.25 + rand() * 0.75;
      ctx.fillStyle = colours[Math.floor(rand() * colours.length)];
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;

    // a few twinkling 4-point stars on top
    sparkles.innerHTML = "";
    const big = Math.max(8, Math.round((w * h) / 70000));
    for (let i = 0; i < big; i++) {
      const s = document.createElement("span");
      s.className = "sparkle";
      s.style.left = (rand() * 100).toFixed(2) + "%";
      s.style.top = (rand() * 100).toFixed(2) + "%";
      s.style.setProperty("--t", (2 + rand() * 3).toFixed(2) + "s");
      s.style.setProperty("--d", (-rand() * 5).toFixed(2) + "s");
      sparkles.appendChild(s);
    }
  }
  drawStars();
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(drawStars, 150);
  });

  // ── Thumbnails ─────────────────────────────────────
  const list = (typeof THUMBNAILS !== "undefined" ? THUMBNAILS : []).filter(t => t && t.image);
  const grid = document.getElementById("grid");
  const viewer = document.getElementById("viewer");
  const viewerImg = document.getElementById("viewer-img");
  const viewerTitle = document.getElementById("viewer-title");
  let current = 0;

  list.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "tile";
    const wrap = document.createElement("div");
    wrap.className = "tile-wrap";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "frame";
    btn.setAttribute("aria-label", `Open ${t.title || "thumbnail"}`);
    const img = document.createElement("img");
    // first one is shown big, so use the full-quality image
    img.src = i === 0 ? t.image : (t.small || t.image);
    img.alt = t.title ? `Thumbnail: ${t.title}` : "Thumbnail";
    img.width = 960; img.height = 540;
    img.decoding = "async";
    if (i > 1) img.loading = "lazy";
    btn.appendChild(img);
    btn.addEventListener("click", () => open(i));
    wrap.appendChild(btn);
    li.appendChild(wrap);
    if (t.title) {
      const h = document.createElement("h3");
      h.textContent = t.title;
      li.appendChild(h);
    }
    grid.appendChild(li);
  });

  // ── Full size / Feed size ──────────────────────────
  const hint = document.getElementById("size-hint");
  document.querySelectorAll(".size-toggle button").forEach(b => {
    b.addEventListener("click", () => {
      const feed = b.dataset.size === "feed";
      grid.classList.toggle("feed", feed);
      document.querySelectorAll(".size-toggle button").forEach(x =>
        x.setAttribute("aria-pressed", String(x === b)));
      hint.textContent = feed
        ? "This is about how big they look on the YouTube home page."
        : "Tap a thumbnail to see it full screen.";
    });
  });

  // ── Viewer ─────────────────────────────────────────
  function show(i) {
    current = (i + list.length) % list.length;
    const t = list[current];
    viewerImg.src = t.image;
    viewerImg.alt = t.title ? `Thumbnail: ${t.title}` : "Thumbnail";
    viewerTitle.textContent = t.title || "";
  }
  function open(i) {
    show(i);
    if (typeof viewer.showModal === "function") viewer.showModal();
    else window.open(list[i].image, "_blank");
  }
  document.getElementById("prev").addEventListener("click", () => show(current - 1));
  document.getElementById("next").addEventListener("click", () => show(current + 1));
  document.getElementById("close").addEventListener("click", () => viewer.close());
  viewer.addEventListener("click", e => { if (e.target === viewer) viewer.close(); });
  viewer.addEventListener("keydown", e => {
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });
  if (list.length < 2) {
    document.getElementById("prev").hidden = true;
    document.getElementById("next").hidden = true;
  }
})();
