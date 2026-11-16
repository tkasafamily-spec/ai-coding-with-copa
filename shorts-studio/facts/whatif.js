// ─────────────────────────────────────────────────────────────
//  WHAT IF — Shorts in the Zack D. Films style (3D render look, real science, clickbait hook).
//  Formula: shock line → 3 quick escalations → "What if…?" title → "Sounds amazing" → real fact turn ("That's real.") → cliffhanger.
//  Each beat = one short line + one 3D scene. scene: "same" reuses the previous picture.
//  Every number is real and sourced below.
// ─────────────────────────────────────────────────────────────
const STYLE = "cinematic 3D render, Blender style 3D animation, realistic lighting, detailed, dramatic";
const V2 = [
  {
    id: "whatif-trillion",
    title: "What If Everyone Had $1 Trillion?",
    hook: "EVERYONE JUST GOT $1,000,000,000,000",
    titles: ["What If Everyone Had $1 Trillion?", "Everyone Gets $1 Trillion… Then This Happens", "Why Free Money Would Ruin Everything"],
    hashtags: "#shorts #whatif #money",
    question: "What would YOU buy first? 👇",
    sources: ["Steve Hanke, Cato Institute: Zimbabwe's hyperinflation (Nov 2008 prices doubled about every 24.7 hours)", "Reserve Bank of Zimbabwe 100 trillion dollar note (2009)"],
    beats: [
      { say: "Everyone on Earth just got one trillion dollars.", scene: "a shocked boy with mouth wide open surrounded by a tornado of flying hundred dollar bills, money everywhere, bright", gfx: { type: "count", to: 1000000000000, prefix: "$", label: "EACH" }, move: "push" },
      { say: "You buy a mansion.", scene: "a boy standing in front of a giant luxury mansion with a pool, jaw dropped, sunny day", move: "right" },
      { say: "Your mom buys an island.", scene: "a mom in sunglasses waving from a tiny private tropical island with a helicopter", move: "left" },
      { say: "Your little brother buys a rocket.", scene: "a little kid in a helmet giving a thumbs up in front of a huge rocket on a launch pad", move: "up" },
      { say: "What if everyone had a trillion dollars?", scene: "a city street at night where money is raining from the sky and people are dancing", gfx: { type: "title", top: "WHAT IF EVERYONE HAD", bottom: "$1 TRILLION?" }, move: "push" },
      { say: "Sounds amazing.", scene: "a happy crowd throwing money in the air in a city square, confetti", move: "pull" },
      { say: "But if everyone's rich, nobody needs a job.", scene: "an empty supermarket with a closed sign, no workers, lights flickering", move: "right" },
      { say: "So prices go up. And up. And up.", scene: "a shop worker changing a price tag on a loaf of bread to a huge number, worried customers", gfx: { type: "stamp", text: "PRICE x1000" }, move: "shake" },
      { say: "In 2008, Zimbabwe printed so much money, prices doubled about every day.", scene: "a man pushing a wheelbarrow overflowing with paper money down a dusty street", gfx: { type: "year", text: "ZIMBABWE 2008" }, move: "left" },
      { say: "That's real.", scene: "a giant paper banknote printed with a long row of zeros, held up by a man in a busy street, bright daylight", gfx: { type: "stamp", text: "100 TRILLION DOLLAR NOTE" }, move: "push" },
      { say: "Soon, one loaf of bread costs a trillion dollars.", scene: "a single loaf of bread on a velvet pedestal behind glass with a giant price tag, dramatic light", gfx: { type: "count", to: 1000000000000, prefix: "$", label: "ONE LOAF OF BREAD" }, move: "push" },
      { say: "And your brother just spent his on a rocket.", scene: "a little kid in a helmet sitting alone in a rocket looking hungry and sad, dark", move: "pull" },
    ],
  },
  {
    id: "whatif-fly",
    title: "What If You Could Fly?",
    hook: "WHAT IF YOU COULD FLY?",
    titles: ["What If You Could Fly?", "You Can Fly… Until This Happens", "Why Flying Would Kill You"],
    hashtags: "#shorts #whatif #science",
    question: "How high would YOU go? 👇",
    sources: ["FAA Advisory Circular AC 61-107: time of useful consciousness about 30–60 seconds at 35,000 ft", "International Standard Atmosphere: about −56 °C at 11 km (36,000 ft)"],
    beats: [
      { say: "You miss the bus.", scene: "a boy with a backpack watching a yellow school bus drive away, frustrated, morning street", move: "push" },
      { say: "Fly.", scene: "a boy with a backpack flying straight up into the sky above houses, view from below, dust and leaves blasting outward", gfx: { type: "stamp", text: "FLY" }, move: "up" },
      { say: "You're at school in ten seconds.", scene: "a boy landing perfectly in front of a school, students staring amazed", move: "pull" },
      { say: "Your phone slips off a bridge.", scene: "a phone falling off a tall bridge towards a river, a boy reaching out in panic", move: "shake" },
      { say: "Fly. Caught it.", scene: "a boy diving through the air and catching a phone just above the water, splash", move: "push" },
      { say: "What if you could fly, any time you want?", scene: "a boy flying high above the clouds at sunset with arms spread", gfx: { type: "title", top: "WHAT IF YOU COULD", bottom: "FLY?" }, move: "push" },
      { say: "Sounds amazing.", scene: "a boy doing a loop in the sky above a city, smiling", move: "right" },
      { say: "So you go higher. And higher.", scene: "a boy flying past a passenger airplane high in the dark blue sky, the curve of the earth below", move: "up" },
      { say: "Where planes fly, it's minus fifty degrees.", scene: "a boy flying covered in ice and frost, shivering, frozen eyebrows, thin blue sky", gfx: { type: "count", to: -56, suffix: "°C", label: "AT 36,000 FEET" }, move: "shake" },
      { say: "And the air is so thin, you'd pass out in under a minute.", scene: "a boy with eyes closing, drifting unconscious in the dark upper sky, stars appearing", gfx: { type: "count", to: 60, suffix: " SEC", label: "UNTIL YOU PASS OUT" }, move: "pull" },
      { say: "That's real.", scene: "close up of a frozen boy's face with frost and closed eyes, dramatic light", move: "push" },
      { say: "And you're still climbing.", scene: "a tiny figure falling limp through the clouds from very high up, dramatic wide shot", move: "pull" },
    ],
  },
  {
    id: "whatif-earth-stops",
    title: "What If the Earth Stopped Spinning?",
    hook: "THE EARTH JUST STOPPED SPINNING",
    titles: ["What If the Earth Stopped Spinning?", "The Earth Stops… You Don't", "Earth Stops Spinning For 1 Second"],
    hashtags: "#shorts #whatif #space",
    question: "Where would YOU hide? 👇",
    sources: ["NASA: Earth's surface at the equator moves about 1,670 km/h (1,037 mph)", "NOAA: highest tornado winds measured about 300 mph (Bridge Creek–Moore, 1999)", "Without rotation, one solar day would last about one year"],
    beats: [
      { say: "The Earth just stopped spinning.", scene: "planet earth in space with a giant cracking shockwave ring around the equator, dramatic", gfx: { type: "stamp", text: "STOPPED" }, move: "push" },
      { say: "But you didn't.", scene: "a man in a city street being lifted off his feet and blown sideways, shocked face, debris", move: "shake" },
      { say: "You, your house, and the ocean keep flying east… at a thousand miles an hour.", scene: "cars, trees and a house roof being ripped away and flying sideways down a city street in a violent wind, debris, motion blur", gfx: { type: "count", to: 1037, suffix: " MPH", label: "AT THE EQUATOR" }, move: "right" },
      { say: "What if the Earth stopped spinning?", scene: "the earth seen from space, half day half night, a glowing frozen line across it", gfx: { type: "title", top: "WHAT IF THE EARTH", bottom: "STOPPED SPINNING?" }, move: "push" },
      { say: "The air keeps moving too.", scene: "a giant wall of wind and dust sweeping across a city, skyscrapers bending", move: "left" },
      { say: "Winds over three times faster than the strongest tornado ever measured.", scene: "an enormous tornado tearing through a city at night, lightning, debris", gfx: { type: "stamp", text: "3x TORNADO" }, move: "shake" },
      { say: "That's real.", scene: "a destroyed city under a dark stormy sky, silence after the storm", move: "pull" },
      { say: "Then it gets worse.", scene: "a scared man standing on a rooftop staring up at a huge burning sun frozen in an orange sky", move: "push" },
      { say: "One day now lasts a whole year.", scene: "a sun stuck in the sky over a cracked dry desert, a clock with frozen hands", gfx: { type: "count", to: 365, label: "DAYS OF DAYLIGHT" }, move: "up" },
      { say: "Half the planet bakes. The other half freezes in the dark.", scene: "a city frozen solid in ice and snow under a black night sky with stars, icicles hanging from buildings", move: "right" },
      { say: "So which side are you on?", scene: "a person standing exactly on the line between a burning desert and frozen darkness, looking at the camera", move: "push" },
    ],
  },
];
if (typeof module !== "undefined") module.exports = { V2, STYLE };
