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
  let current = 0;

  list.forEach((t, i) => {
    const li = document.createElement("li");
    li.className = "tile pop";
    const wrap = document.createElement("div");
    wrap.className = "tile-wrap";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "frame";
    btn.setAttribute("aria-label", `Open thumbnail ${i + 1} full screen`);
    const img = document.createElement("img");
    // first one is shown big, so use the full-quality image
    img.src = i === 0 ? t.image : (t.small || t.image);
    img.alt = t.title ? `Thumbnail: ${t.title}` : `Thumbnail ${i + 1}`;
    img.width = 960; img.height = 540;
    img.decoding = "async";
    btn.appendChild(img);
    btn.addEventListener("click", () => open(i));
    wrap.appendChild(btn);
    li.appendChild(wrap);
    grid.appendChild(li);
  });

  // ── Pop in as you scroll to it ─────────────────────
  const pops = document.querySelectorAll(".pop");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -40px 0px" });
    pops.forEach(el => io.observe(el));
  } else {
    pops.forEach(el => el.classList.add("in"));
  }

  // ── Viewer ─────────────────────────────────────────
  function show(i) {
    current = (i + list.length) % list.length;
    const t = list[current];
    viewerImg.src = t.image;
    viewerImg.alt = t.title ? `Thumbnail: ${t.title}` : `Thumbnail ${current + 1}`;
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
