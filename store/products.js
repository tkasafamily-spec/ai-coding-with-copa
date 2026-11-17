// ============================================================
//  STORE SETTINGS — this is the only file you need to edit.
// ============================================================

const STORE = {
  name: "Heatwave Supply Co.",
  tagline: "Summer gear for the Aussie heat",

  // Your shop email. Customers need a way to reach you (it's the law).
  // Leave "" until you have one, then put it here, e.g. "hello@heatwavesupply.com.au"
  email: "",

  // Shown on the site so customers know what to expect. Keep it honest.
  shippingTime: "10–20 business days",
  christmasCutoff: "1 December", // "Order by ... for the best chance before Christmas"
};

// Each product's "buyLink" is a Stripe Payment Link (see README, step 3).
// Until you paste one in, the button says "Coming soon".
//
// "cost" = what ONE order really costs you on AliExpress in AUD
// (item + shipping + 10% GST that AliExpress adds at checkout).
// It isn't shown to customers; the profit calculator (owner.html) uses it.

const PRODUCTS = [
  {
    id: "towel-bag",
    name: "2-in-1 Beach Towel Bag",
    short: "A big beach towel that zips into its own tote bag.",
    price: 39.95,
    cost: 17.33,
    image: "img/towel-bag.svg",
    badge: "Beach day hero",
    buyLink: "",
    points: [
      "Full-size quick-dry microfibre towel, about 150 × 75 cm",
      "Folds and zips into a shoulder bag. Nothing extra to carry",
      "Sand shakes off easily and it packs down small",
      "Great Christmas gift for anyone who lives at the beach",
    ],
    details:
      "Unzip it and it's a beach towel. Fold it back and it's a tote with a shoulder strap for your sunnies, phone and keys. Microfibre dries much faster than cotton and doesn't hold onto sand.",
  },
  {
    id: "cooling-mat",
    name: "Chill Pad Self-Cooling Pet Mat",
    short: "A cool spot for your dog or cat. No power, no fridge, no water.",
    price: 34.95,
    cost: 14.03,
    image: "img/cooling-mat.svg",
    badge: "Pets love it",
    buyLink: "",
    points: [
      "Ice-silk fabric that feels cool to lie on",
      "No gel inside, so nothing leaks if it gets chewed",
      "Machine washable and folds flat for the car or crate",
      "Medium, about 70 × 55 cm: fits most cats and small-to-medium dogs",
    ],
    details:
      "Hot days are hard on pets. The Chill Pad's cool-touch fabric gives them a comfy place to stretch out on the floor, in the crate or in the car. Throw it in the wash when it gets furry.",
  },
  {
    id: "sun-umbrella",
    name: "Pop Shade Windscreen Umbrella",
    short: "Opens like an umbrella in 3 seconds and keeps your car cooler.",
    price: 39.95,
    cost: 18.98,
    image: "img/sun-umbrella.svg",
    badge: "Summer must-have",
    buyLink: "",
    points: [
      "Reflective silver coating helps keep your dash, seats and steering wheel cooler",
      "Opens in seconds, held in place by your sun visors",
      "Folds to about 35 cm and fits in the door pocket or glovebox",
      "Opens to about 140 × 80 cm, which suits most cars and small SUVs (measure first!)",
    ],
    details:
      "No more wrestling with a fold-out cardboard shade. Pop it open inside the windscreen, flip down the visors and you're done. Comes with a storage sleeve.",
  },
];

// Bundle: all three for less. Bundles make each sale worth a lot more.
const BUNDLE = {
  id: "summer-pack",
  name: "The Summer Pack",
  short: "All three for one price: the towel bag, the Chill Pad and Pop Shade.",
  price: 99.0,
  cost: 50.34,
  buyLink: "",
};
