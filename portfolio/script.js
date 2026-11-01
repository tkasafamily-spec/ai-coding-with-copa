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
    li.className = "tile";
    const wrap = document.createElement("div");
    wrap.className = "tile-wrap pop";
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

  // ── Feedback (live, stored in Oreok's Google Sheet) ──
  const API = (typeof FEEDBACK_API !== "undefined" ? FEEDBACK_API : "").trim();
  const rlist = document.getElementById("reviews");
  const rstatus = document.getElementById("reviews-status");
  const form = document.getElementById("fb-form");
  const formMsg = document.getElementById("fb-msg");
  const openBtn = document.getElementById("fb-open");

  function reviewEl(r) {
    const li = document.createElement("li");
    li.className = "review";
    const stars = document.createElement("div");
    stars.className = "rstars";
    const n = Math.max(1, Math.min(5, Math.round(Number(r.stars) || 5)));
    stars.setAttribute("role", "img");
    stars.setAttribute("aria-label", `${n} out of 5 stars`);
    for (let k = 0; k < 5; k++) {
      const st = document.createElement("span");
      st.className = "pstar" + (k < n ? " on" : "");
      stars.appendChild(st);
    }
    const q = document.createElement("blockquote");
    q.textContent = r.text;
    const who = document.createElement("div");
    who.className = "who";
    who.textContent = r.name || "Anonymous";
    li.append(stars, q, who);
    if (r.thumbnail) {
      const w = document.createElement("div");
      w.className = "which";
      w.textContent = `Thumbnail: ${r.thumbnail}`;
      li.appendChild(w);
    }
    return li;
  }
  function setStatus(text) {
    rstatus.textContent = text;
    rstatus.hidden = !text;
  }
  function showReviews(list) {
    rlist.replaceChildren(...list.map(reviewEl));
    rlist.hidden = !list.length;
    setStatus(list.length ? "" : "No reviews yet. Be the first to leave one.");
  }
  function loadReviews() {
    if (!API) { showReviews([]); return; }
    setStatus("Loading feedback…");
    const done = new AbortController();
    const timer = setTimeout(() => done.abort(), 12000);
    fetch(API, { signal: done.signal })
      .then(r => r.json())
      .then(d => showReviews(Array.isArray(d.reviews) ? d.reviews : []))
      .catch(() => setStatus("Couldn't load feedback right now. Refresh the page to try again."))
      .finally(() => clearTimeout(timer));
  }
  loadReviews();

  openBtn.addEventListener("click", () => {
    const open = form.hidden;
    form.hidden = !open;
    openBtn.setAttribute("aria-expanded", String(open));
    openBtn.textContent = open ? "Close" : "Leave feedback";
    if (open) form.querySelector("input[name=name]").focus();
  });

  form.addEventListener("submit", e => {
    e.preventDefault();
    const fd = new FormData(form);
    const review = {
      name: String(fd.get("name") || "").trim(),
      stars: Number(fd.get("stars")),
      thumbnail: String(fd.get("thumbnail") || "").trim(),
      text: String(fd.get("text") || "").trim(),
      website: String(fd.get("website") || ""),
    };
    if (!review.name || !review.text || !review.stars) {
      formMsg.textContent = "Fill in your name, a star rating and your feedback.";
      return;
    }
    if (!API) { formMsg.textContent = "Feedback isn't switched on yet."; return; }
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true; btn.textContent = "Posting…"; formMsg.textContent = "";
    fetch(API, { method: "POST", body: JSON.stringify(review) })   // plain text body: no CORS preflight
      .then(r => r.json())
      .then(d => {
        if (!d.ok) throw new Error(d.error || "failed");
        rlist.prepend(reviewEl(review));
        rlist.hidden = false; setStatus("");
        form.reset(); form.hidden = true;
        openBtn.textContent = "Leave feedback"; openBtn.setAttribute("aria-expanded", "false");
        formMsg.textContent = "";
        const thanks = document.getElementById("fb-thanks");
        thanks.hidden = false;
        setTimeout(() => { thanks.hidden = true; }, 6000);
        rlist.firstElementChild.scrollIntoView({ behavior: "smooth", block: "center" });
      })
      .catch(err => {
        formMsg.textContent = String(err.message) === "busy"
          ? "Lots of feedback right now. Try again in a bit."
          : "Couldn't post that. Check your internet and try again.";
      })
      .finally(() => { btn.disabled = false; btn.textContent = "Post feedback"; });
  });

  // ── Pop in as you scroll to it ─────────────────────
  const pops = document.querySelectorAll(".pop");
  if ("IntersectionObserver" in window) {
    // pops in when you scroll to it
    const show = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("in"); });
    }, { threshold: 0.15, rootMargin: "0px 0px -12% 0px" });
    // resets once it's gone back off the bottom of the screen (you scrolled up past it),
    // so it pops in again next time you scroll down
    const reset = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting && e.boundingClientRect.top > 0) e.target.classList.remove("in");
      });
    }, { threshold: 0 });
    pops.forEach(el => { show.observe(el); reset.observe(el); });
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
