# Putting Heatwave Supply Co. on Shopify

Everything is ready to upload. Setting it up takes about **1–2 hours**, and you mostly copy and paste.

**What's in this folder**

| File | What it's for |
|---|---|
| `products-import.csv` | Creates all 4 products at once, with prices, descriptions, costs and photos |
| `images/` | 14 product images (2048 × 2048), plus `logo.png`, `logo-square.png` and `banner.png` |
| `pages/` | Text for your FAQ, About, Shipping policy and Refund policy |
| `image-maker.html` + `make-images.js` | Remakes the images if you change the wording (`node make-images.js`) |

---

## What it costs on Shopify

- **First 3 months:** 3 days free, then **$1 a month**
- **After that:** Basic plan **A$56/month** (or A$42/month if you pay for a year)
- **Card fees:** 1.7% + 30c per sale with Shopify Payments

| | Towel bag | Chill Pad | Pop Shade | Summer Pack |
|---|---|---|---|---|
| Price | $39.95 | $34.95 | $39.95 | $99.00 |
| AliExpress (item + ship + GST) | −$17.33 | −$14.03 | −$18.98 | −$50.34 |
| Card fee | −$0.98 | −$0.89 | −$0.98 | −$1.98 |
| 5% refund buffer | −$2.00 | −$1.75 | −$2.00 | −$4.95 |
| **Profit per sale** | **$19.64** | **$18.28** | **$17.99** | **$41.73** |

**About 3 sales a month pays for the Shopify plan.** Everything after that is profit. Open `../owner.html` to try your own numbers.

---

## Step 1: Make the Shopify account (an adult has to do this)

Shopify accounts and payouts must be in the name of **someone 18 or older**, like Copa or a parent.

1. Go to **shopify.com/au** and click **Start free trial**.
2. Store name: **Heatwave Supply Co.** Country: **Australia**. Currency: **AUD**.
3. Skip the questions you don't know. You can change everything later.

## Step 2: Import the products (2 minutes)

1. In Shopify, go to **Products → Import**.
2. Upload `products-import.csv`, click **Upload and preview**, then **Import products**.
3. Wait a minute. All 4 products appear with their photos, prices and descriptions, inside a collection called **Summer Essentials**.

> If the photos don't show up: open each product, click **Add media** and upload the matching files from `images/`. The `-hero` image goes first.

## Step 3: Make it look good (Online Store → Themes → Customize)

Use the free theme Shopify gives you (Horizon or Dawn both work).

- **Logo:** `images/logo.png`. **Favicon** (the little tab icon): `images/logo-square.png`
- **Colours:**
  - Buttons: `#FF6B4A` (coral)
  - Background: `#FFFAF3` (warm white)
  - Text: `#1D2433`
  - Accent: `#0D5C75` (deep sea blue)
- **Fonts:** headings in something bold and rounded. Pick *Bricolage Grotesque* if it's in the list, otherwise *Poppins*. Body text: *Inter*.
- **Announcement bar:** `Free shipping Australia-wide · Order by 1 December for Christmas`
- **Homepage, top to bottom:**
  1. **Image banner:** `images/banner.png`. Heading: **Beat the heat.** Text: *Beach, car and pets sorted. Free shipping Australia-wide.* Button: **Shop the range**, linking to the Summer Essentials collection. (The left side of the banner is left empty so the words fit there.)
  2. **Featured collection:** Summer Essentials
  3. **Featured product:** The Summer Pack (your best money-maker)
  4. **Multicolumn**, with 3 columns: *Free shipping, Australia-wide* · *Secure checkout, cards, Apple Pay & Google Pay* · *30-day returns, plus your Consumer Law rights*

## Step 4: Add your pages (Online Store → Pages → Add page)

For each file in `pages/`: make a page, click the **`<>` (Show HTML)** button in the text editor and paste in the file's contents.

| Page title | File |
|---|---|
| FAQ | `pages/faq.html` |
| About us | `pages/about.html` |
| Contact | *(leave it empty and set Template to **contact**; Shopify adds the form)* |

## Step 5: Policies (Settings → Policies)

- **Refund policy:** paste `pages/refund-policy.html`
- **Shipping policy:** paste `pages/shipping-policy.html`
- **Privacy policy** and **Terms of service:** click **Create from template**
- **Contact information:** add the shop email (make a new one just for the shop)

## Step 6: Menus (Online Store → Navigation)

- **Main menu:** Home · Shop (Summer Essentials) · FAQ · About us · Contact
- **Footer menu:** FAQ · Contact · Shipping policy · Refund policy · Privacy policy

## Step 7: Shipping (Settings → Shipping and delivery)

1. Open the **General shipping rates** profile.
2. Keep **only Australia** as a shipping zone.
3. Delete the other rates and add one: name **Free shipping (10–20 business days)**, price **$0.00**.

Shipping is already built into your prices, so customers never pay extra.

## Step 8: Taxes (Settings → Taxes and duties)

**Don't turn on GST collection** unless you register for GST. You only have to register once you sell **more than $75,000 a year**. Your prices already cover the GST AliExpress charges you.

## Step 9: Getting paid (Settings → Payments)

Turn on **Shopify Payments**. The adult fills in their details and bank account (an ABN is free from abr.gov.au and a good idea). This gives you cards, Apple Pay and Google Pay. Money arrives in the bank a few days after each sale.

## Step 10: Connect AliExpress so orders are easy

Install the **DSers** app from the Shopify App Store. It's AliExpress's official dropshipping partner and has a free plan.

1. In DSers, connect your AliExpress account.
2. Find the supplier listing for each product (see the supplier checklist in `../README.md`). Add it to DSers and **map** it to your existing Shopify product. Mapping keeps your photos and descriptions.
3. When an order comes in, DSers shows it. Click **Place order**, then pay on AliExpress. DSers adds the tracking number to Shopify, and Shopify emails the customer automatically.

*No DSers?* You can still do it by hand. Buy the item on AliExpress with the customer's address, then in Shopify open the order, click **Fulfil**, and paste the tracking number. Shopify emails the customer for you.

## Step 11: Swap in real photos (as soon as you can)

The images we made are clean graphics, and they're fine to launch with. **Real photos sell much better**, though:
- When your samples arrive, take bright photos and short videos of each product being used, then upload them as the **first** image.
- DSers can also bring in the supplier's own listing photos. Suppliers expect dropshippers to use those, but only use ones that look exactly like what you'll receive.
- The sizes on the size-guide images are approximate. Check them against your supplier's listing, and if they're different, change the numbers in `image-maker.html` and run `node make-images.js` again.

## Step 12: Test, then go live

1. **Test order:** buy the cheapest item with a real card, then refund it from the order page. This checks the checkout, the emails and payouts.
2. **Pick a plan:** Settings → Plan → Basic.
3. **Remove the password:** Online Store → Preferences → untick password protection.
4. *(Optional)* **Domain:** Settings → Domains. A `.com` costs about A$20 a year. A `.com.au` needs an ABN.

🎉 You're live! Now post your videos (see "Getting customers" in `../README.md`) with your shop link in your bio.

---

### Check every week
- **AliExpress prices and stock:** if a supplier's price goes up, update **Cost per item** in Shopify and check your profit in `owner.html`.
- **Orders:** place them on AliExpress within 1 day.
- **Messages:** reply to customer emails within 1 day.
