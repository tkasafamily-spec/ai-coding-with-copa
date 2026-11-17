# Heatwave Supply Co.: dropshipping store

> **Moving to Shopify?** Everything for Shopify (product import file, photos, logo, banner, page text and a click-by-click guide) is in [`shopify/`](shopify/SHOPIFY-SETUP.md). The product research, supplier checklist and "when someone orders" steps below still apply.

A summer store for Australia that sells 3 products (plus a bundle) shipped straight from AliExpress to your customers.

- **The shop:** `store/index.html` (once it's live: https://tkasafamily-spec.github.io/ai-coding-with-copa/store/)
- **Your profit calculator:** `store/owner.html` (not linked from the shop)
- **The only file you edit:** `store/products.js` (prices, payment links, email)

---

## 1. Shopify or our own website?

**We built our own website, and that's the better choice to start with.**

| | Own website (this one) | Shopify |
|---|---|---|
| Monthly cost | **$0** (GitHub Pages hosting is free) | A$56/month (A$42 if you pay yearly) |
| Card fees | Stripe: 1.65% + 30c | 1.7% + 30c |
| Taking payments | Stripe Payment Links (cards, Apple Pay, Google Pay) | Built in |
| Ordering from AliExpress | You do it by hand, about 3 minutes per order | Apps like DSers can do it automatically |

When you're just starting out you might get a few orders a week, and Shopify's A$56 a month would eat most of your profit. Placing orders by hand is fine at that size. **Switch to Shopify once you're doing about 3 or more orders a day.** The products, photos and descriptions all move straight across.

---

## 2. The 3 products and why we chose them

It's summer in Australia over Christmas, so most overseas "winning product" lists (heated vests, ice scrapers) won't sell here. We looked for things that are **in demand during an Aussie summer, light and cheap to ship, can't break, have no lithium batteries** (those get held up in shipping) and **aren't sold everywhere at Kmart**.

### Beach Towel Bag (2-in-1): sell for A$39.95
- A towel that folds into its own tote bag. One TikTok of it hit 485K views with no ads, and it sells best in **Australia and New Zealand**.
- Competition: **low**. Not many Aussie stores sell it, and Kmart and Big W don't.
- Supplier price: about US$5–8.

### Chill Pad: self-cooling pet mat, sell for A$34.95
- 73% of Aussie homes have a pet, and heatwaves are a real worry. One clip of a cooling mat got 3.5M views without ads.
- We chose the **ice-silk fabric** kind, not gel: it's lighter so shipping is cheaper, and nothing leaks if a dog chews it.
- Competition: **medium**. Pet stores sell gel mats for around A$46.
- Supplier price: about US$3–6.

### Pop Shade: windscreen sun umbrella, sell for A$39.95
- Every Aussie with a car wants one in summer. A top AliExpress listing has 4,600+ ratings at 4.9★.
- Competition: **medium–high**. Other Aussie stores sell it for A$25–56. We sit in the middle and win on video and the bundle.
- Supplier price: about US$5–12.

### The Summer Pack (all 3): A$99
The bundle is your money-maker: **about $42 profit per order.**

---

## 3. The pricing (worked out for you)

What one order costs you = (AliExpress item + shipping in US$) × 1.50 to convert to AUD × 1.10 for the GST that AliExpress adds.
We used 1.50 instead of today's rate (1.484) so a small drop in the Aussie dollar won't hurt.

| | Towel bag | Chill Pad | Pop Shade | Summer Pack |
|---|---|---|---|---|
| Our price | $39.95 | $34.95 | $39.95 | $99.00 |
| AliExpress (item + ship + GST) | −$17.33 | −$14.03 | −$18.98 | −$50.34 |
| Stripe card fee (1.65% + 30c) | −$0.96 | −$0.88 | −$0.96 | −$1.93 |
| Buffer for refunds and lost parcels (5%) | −$2.00 | −$1.75 | −$2.00 | −$4.95 |
| **Profit per sale (free TikTok/Reels)** | **$19.66** | **$18.30** | **$18.01** | **$41.78** |
| Profit if paid ads cost $12 per sale | $7.66 | $6.30 | $6.01 | $29.78 |

Shipping is **free to the customer** because it's already included in the price.

⚠️ AliExpress prices change all the time. Before you go live, add each item to your AliExpress cart and check the real total at checkout, then put that number into `owner.html` to see your real profit.

---

## 4. Getting it running (do these in order)

### Step 1: Choose your suppliers and order samples
Search AliExpress (it shows AUD prices if you're in Australia):
- [Beach towel bag](https://www.aliexpress.com/w/wholesale-beach-towel-bag-2-in-1.html)
- [Ice silk pet cooling mat](https://www.aliexpress.com/w/wholesale-ice-silk-pet-cooling-mat.html)
- [Car windscreen sun shade umbrella](https://www.aliexpress.com/w/wholesale-car-windshield-sun-shade-umbrella.html)

Only pick a listing that has **all** of these:
- ⭐ 4.7 or higher, with **1,000+ sold**
- "Choice" or free shipping to Australia, with delivery under 15 days
- Real customer photos in the reviews that look like the listing

**Buy one of each for yourself first (about A$50).** You'll find out if it's any good, how long it takes to arrive, and you'll have it for **your own photos and videos**. Copying other people's photos isn't allowed, and your own videos sell better anyway. When your photos are ready, put them in `store/img/` and change `image:` in `products.js`.

### Step 2: Make a Stripe account (an adult needs to do this)
Stripe is how customers pay you. **The account has to belong to someone 18 or older**, like Copa or a parent, and it pays into their bank account.
1. Sign up at stripe.com/au. Choose "individual/sole trader".
2. An **ABN** is free and a good idea (abr.gov.au). You don't need to register for GST until you sell more than $75,000 a year.

### Step 3: Make a Payment Link for each product
In Stripe go to **Payment Links → New**:
1. Product name, a photo and the price (e.g. 39.95 AUD).
2. Under options, tick **Collect customer addresses → Billing and shipping**, and allow **Australia** only.
3. Tick **Require phone number** (couriers sometimes need it).
4. After payment: **Don't show confirmation page → redirect to** `https://tkasafamily-spec.github.io/ai-coding-with-copa/store/thanks.html`
5. Copy the link and paste it into `buyLink: ""` for that product in `products.js`.

Do this 4 times: 3 products plus the Summer Pack. The "Coming soon" buttons turn into "Buy now" by themselves.

### Step 4: Add a shop email
Make a free email address just for the shop (e.g. heatwavesupply@gmail.com) and put it in `email: ""` in `products.js`. Customers need a way to reach you.

### Step 5: Go live
The site goes live on GitHub Pages once this branch is merged into `main`. You can merge it on GitHub with a pull request.

---

## 5. When someone orders (about 3 minutes)

1. Stripe emails you: "Payment received". Open it to see the customer's name, address and phone number.
2. On AliExpress, buy the product and **type in the customer's name and address** (not yours!).
3. In the order notes, write: *"Dropshipping order. Please no invoice or prices in the package."*
4. After 1–3 days, AliExpress shows a **tracking number**. Email it to the customer.
5. Write the order down in a spreadsheet: date, customer, what they paid, what you paid, tracking number. You'll need it for tax time.

---

## 6. Getting customers (free)

Post **1–2 short videos every day** on TikTok, Instagram Reels and YouTube Shorts, using your samples:
- Towel bag: unzip and fold in one take. Show towel to bag in under 5 seconds.
- Chill Pad: your dog (or a friend's) flopping onto it on a hot day.
- Pop Shade: a thermometer on the dashboard with and without the shade. "3 seconds to open."

Put the shop link in your bio. Only try paid ads once a video gets lots of views for free, and use `owner.html` to check ads aren't costing more than you make.

---

## 7. Important stuff

- **Delivery takes 10–20 business days.** The site says this honestly, which the law (ACCC) requires. Don't promise faster delivery.
- **Christmas:** orders after about 1 December may not arrive in time. Change `christmasCutoff` in `products.js` if needed, and remove it after Christmas. Summer products keep selling until February.
- **Refunds:** if something is broken or never arrives, refund or replace it. That's Australian Consumer Law, and AliExpress buyer protection usually refunds you too.
- **No fake "was" prices.** Showing a crossed-out price you never actually charged is illegal in Australia. The bundle's "Save $15.85" is fine because it's a real saving.
- **Tax:** money you make is income. Keep your spreadsheet and ask a grown-up or an accountant at tax time.

*Research done 17 November 2026. Prices are from AliExpress listings, trend reports (DailyFulfill, ProductLair, AutoDS, AliDrop), Shopify AU and Stripe AU pricing pages, and the RBA exchange rate (1 USD = 1.484 AUD).*
