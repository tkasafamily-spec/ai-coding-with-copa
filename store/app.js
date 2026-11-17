// Builds the shop from products.js. You shouldn't need to edit this file.

const $ = (sel) => document.querySelector(sel);
const money = (n) => "$" + n.toFixed(2);

function buyButton(item, big) {
  const cls = "btn" + (big ? " btn-big" : "");
  if (item.buyLink) {
    return `<a class="${cls}" href="${item.buyLink}">Buy now · ${money(item.price)}</a>`;
  }
  return `<button class="${cls} btn-off" disabled>Coming soon</button>`;
}

function card(p) {
  return `
    <article class="card">
      <button class="card-img" data-id="${p.id}" aria-label="More about ${p.name}">
        <img src="${p.image}" alt="${p.name}" loading="lazy">
        <span class="badge">${p.badge}</span>
      </button>
      <div class="card-body">
        <h3>${p.name}</h3>
        <p>${p.short}</p>
        <div class="price"><strong>${money(p.price)}</strong></div>
        <div class="card-actions">
          ${buyButton(p)}
          <button class="link" data-id="${p.id}">Details</button>
        </div>
      </div>
    </article>`;
}

function openDetail(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return;
  const d = $("#detail");
  d.innerHTML = `
    <button class="close" aria-label="Close">×</button>
    <div class="detail-grid">
      <img src="${p.image}" alt="${p.name}">
      <div>
        <h3>${p.name}</h3>
        <div class="price"><strong>${money(p.price)}</strong></div>
        <p>${p.details}</p>
        <ul>${p.points.map((x) => `<li>${x}</li>`).join("")}</ul>
        ${buyButton(p, true)}
        <p class="small">Free shipping · arrives in ${STORE.shippingTime} · 30-day returns</p>
      </div>
    </div>`;
  d.querySelector(".close").onclick = () => d.close();
  d.showModal();
}

function bundleBlock() {
  const full = PRODUCTS.reduce((s, p) => s + p.price, 0);
  return `
    <div class="bundle-inner">
      <div>
        <p class="eyebrow">Best value</p>
        <h2>${BUNDLE.name}</h2>
        <p>${BUNDLE.short}</p>
        <div class="price"><strong>${money(BUNDLE.price)}</strong> <s>${money(full)}</s>
          <span class="save">Save ${money(full - BUNDLE.price)}</span></div>
        ${buyButton(BUNDLE, true)}
      </div>
      <div class="bundle-art">${PRODUCTS.map((p) => `<img src="${p.image}" alt="">`).join("")}</div>
    </div>`;
}

// Fill in the page
document.title = `${STORE.name} | ${STORE.tagline}`;
$("#storeName").textContent = STORE.name;
$("#footName").textContent = STORE.name;
$("#xmas").textContent = `Order by ${STORE.christmasCutoff} for Christmas`;
document.querySelectorAll(".ship").forEach((el) => (el.textContent = STORE.shippingTime));
document.querySelectorAll(".cutoff").forEach((el) => (el.textContent = STORE.christmasCutoff));
$("#contact").innerHTML = STORE.email
  ? `Questions? <a href="mailto:${STORE.email}">${STORE.email}</a>`
  : "";
$("#grid").innerHTML = PRODUCTS.map(card).join("");
$("#bundle").innerHTML = bundleBlock();

document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-id]");
  if (t) openDetail(t.dataset.id);
});
$("#detail").addEventListener("click", (e) => {
  if (e.target.id === "detail") e.target.close(); // click outside to close
});
