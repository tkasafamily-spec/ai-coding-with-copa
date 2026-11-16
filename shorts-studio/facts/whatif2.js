// ─────────────────────────────────────────────────────────────
//  WHAT IF — batch 2. Dramatized "what would happen" stories (fiction, for fun), in a glossy cartoon-3D
//  explainer look inspired by channels like Zack D. Films (original scenes and characters, not copied).
//  Every video starts with "What if…". Lines are dramatized; any line stated as a fact is true.
//  fx: "glitch" (screen glitch) or "flicker" (power cut). gfx adds: count with "from" (count down), arrow (red danger arrow).
// ─────────────────────────────────────────────────────────────
const STYLE = "3D animated cartoon render, Pixar style, glossy rounded shapes, expressive face, soft studio lighting, clean simple background, blue and red color palette";
const GUY = "a cartoon man with short brown hair in a plain white t-shirt and jeans";
const V2 = [
  {
    id: "whatif-no-internet",
    title: "What If the Internet Turned Off?",
    hook: "WHAT IF THE INTERNET TURNED OFF?",
    titles: ["What If the Internet Turned Off?", "The Internet Dies… Day 3 Is Terrifying", "Could You Survive Without Internet?"],
    hashtags: "#shorts #whatif #internet",
    question: "How long would YOU last offline? 👇",
    sources: ["ITU, Facts and Figures 2024: about 5.5 billion people online", "Dramatized scenario for entertainment"],
    beats: [
      { say: "What if the entire internet turned off… right now?", scene: `${GUY} on a couch staring at his phone in total shock, mouth wide open, the phone screen glowing red`, gfx: { type: "arrow", text: "NO SIGNAL", x: 0.42, y: 0.5 }, fx: "glitch", move: "push" },
      { say: "Over five billion people lose connection in the same second.", scene: "planet earth from space at night with glowing network lines snapping and city lights flickering out", gfx: { type: "count", to: 5500000000, label: "PEOPLE OFFLINE" }, fx: "glitch", move: "pull" },
      { say: "No messages. No maps. No videos.", scene: `${GUY} shaking his phone in a busy street while everyone around him stares at blank phones, confused`, move: "right" },
      { say: "Card machines stop working, so nobody can pay.", scene: "a supermarket checkout with a card machine showing a big red X, an angry line of cartoon shoppers", gfx: { type: "stamp", text: "DECLINED" }, move: "push" },
      { say: "ATMs go dark. Banks lock their doors.", scene: `${GUY} banging on a dark cash machine at night outside a closed bank`, fx: "flicker", move: "left" },
      { say: "Traffic lights glitch, and the whole city jams.", scene: "a huge traffic jam at a city intersection with broken traffic lights, cars honking, aerial view", move: "up" },
      { say: "Most supermarkets only keep a few days of food on the shelves.", scene: "a crowded supermarket aisle with people rushing and grabbing food, overflowing shopping carts, chaos", gfx: { type: "arrow", text: "FEW DAYS LEFT", x: 0.5, y: 0.55 }, move: "shake" },
      { say: "By day three, they're empty.", scene: "completely empty supermarket shelves, one flickering ceiling light, a single can rolling on the floor", gfx: { type: "year", text: "DAY 3" }, fx: "flicker", move: "push" },
      { say: "People start trading phones for bottles of water.", scene: `${GUY} holding out his phone to trade for one bottle of water from a stranger, dusty street`, move: "right" },
      { say: "And nobody knows what's happening… because there's no internet to tell them.", scene: "an old wooden radio on a table lit by candles in a dark room, a worried family watching it", move: "pull" },
      { say: "Would you survive one week offline?", scene: `${GUY} sitting alone on a curb at night in a dark city, looking straight at the camera`, move: "push" },
    ],
  },
  {
    id: "whatif-ai-off",
    title: "What If All AI Shut Down?",
    hook: "WHAT IF ALL AI SHUT DOWN?",
    titles: ["What If Every AI Shut Down at Once?", "AI Turns Off… The World Falls Apart", "We Can't Live Without AI Anymore"],
    hashtags: "#shorts #whatif #ai",
    question: "Could YOU live without AI? 👇",
    sources: ["Most US stock trading volume is algorithmic (computer-driven)", "Dramatized scenario for entertainment"],
    beats: [
      { say: "What if every AI on Earth shut down… at the same time?", scene: "a row of big orange industrial robot arms in a factory, red warning lights flashing, sparks", gfx: { type: "stamp", text: "SHUT DOWN" }, fx: "glitch", move: "push" },
      { say: "Your phone's assistant goes silent.", scene: `${GUY} talking to his phone, the screen frozen with a glitchy error, confused face`, fx: "glitch", move: "pull" },
      { say: "Self-driving cars stop dead in the middle of the road.", scene: "dozens of white self-driving cars stopped in every lane of a highway, cartoon people stuck behind them", move: "right" },
      { say: "Most stock trades are made by computers. In seconds, markets crash.", scene: "a stock trading floor with every screen red and arrows crashing down, traders screaming", gfx: { type: "arrow", text: "MARKET CRASH", x: 0.5, y: 0.45 }, move: "shake" },
      { say: "Robot warehouses freeze. Deliveries stop.", scene: "a huge dark warehouse with frozen delivery robots and mountains of unsent packages", move: "left" },
      { say: "Hospitals scramble as smart machines go dark.", scene: "cartoon doctors in a dark hospital hallway using flashlights, machines with black screens", fx: "flicker", move: "push" },
      { say: "Then the power grids flicker… and the lights go out, city by city.", scene: "a giant city skyline at night going dark one block at a time, last lights flickering", gfx: { type: "stamp", text: "BLACKOUT" }, fx: "flicker", move: "pull" },
      { say: "Planes circle the sky with nowhere to land.", scene: "a passenger airplane flying low over a dark city at night with no lights", move: "up" },
      { say: "Humans have to do everything by hand again.", scene: `${GUY} sitting at a desk behind huge stacks of paper, stressed, office`, move: "right" },
      { say: "The problem?", scene: `${GUY} holding a huge paper map upside down in a dark street, confused`, move: "push" },
      { say: "Most of us forgot how.", scene: `close up of ${GUY} looking completely lost and panicked, dark city behind him`, gfx: { type: "arrow", text: "LOST", x: 0.5, y: 0.4 }, move: "shake" },
      { say: "Could you live without AI?", scene: `${GUY} holding a single candle in a dark city, looking straight at the camera`, move: "push" },
    ],
  },
  {
    id: "whatif-humans-gone",
    title: "What If Every Human Vanished?",
    hook: "WHAT IF EVERY HUMAN VANISHED?",
    titles: ["What If Every Human Vanished Tonight?", "Earth Without Humans… Year 1,000", "What Happens After We're Gone"],
    hashtags: "#shorts #whatif #earth",
    question: "What would last the longest? 👇",
    sources: ["Dramatized scenario for entertainment, based on 'world without us' science"],
    beats: [
      { say: "What if every human on Earth vanished… tonight?", scene: "an empty city street at night with abandoned cars, doors open, shopping bags on the ground, no people, eerie blue light", gfx: { type: "count", from: 8000000000, to: 0, label: "HUMANS LEFT" }, move: "push" },
      { say: "At first, the lights stay on.", scene: "an empty brightly lit city at night, traffic lights changing for nobody, giant billboards glowing", move: "right" },
      { say: "But with no one to run them, power plants start shutting down.", scene: "an empty power plant control room with red alarms flashing and nobody at the desks", fx: "flicker", move: "push" },
      { say: "The cities go dark.", scene: "a huge city skyline at night going completely dark, only stars left", gfx: { type: "stamp", text: "LIGHTS OUT" }, fx: "flicker", move: "pull" },
      { say: "Pets and zoo animals roam the empty streets.", scene: "a lion, a giraffe and a pack of dogs walking down an empty highway between abandoned cars", move: "left" },
      { say: "Within a few years, plants crack through every road.", scene: "a city road broken apart by grass, bushes and young trees, cars covered in vines", gfx: { type: "year", text: "YEAR 5" }, move: "up" },
      { say: "In a few decades, skyscrapers start to fall.", scene: "a rusty overgrown skyscraper collapsing into a jungle city, dust clouds", gfx: { type: "year", text: "YEAR 50" }, move: "shake" },
      { say: "Forests swallow entire cities.", scene: "aerial view of a giant city completely covered by forest, only the tops of buildings poking out", move: "pull" },
      { say: "After thousands of years, what's left of us?", scene: "a giant broken statue head half buried in a jungle, birds flying, golden light", gfx: { type: "year", text: "YEAR 10,000" }, move: "push" },
      { say: "Things carved in stone, like the pyramids.", scene: "the ancient pyramids in the desert with sand dunes, no people anywhere, sunset", move: "right" },
      { say: "Earth heals… and forgets we were ever here.", scene: "planet earth from space, lush and green, no city lights anywhere on the night side", move: "pull" },
      { say: "Would the planet even miss us?", scene: "a lonely dog sitting on an overgrown empty street looking straight at the camera", move: "push" },
    ],
  },
];
if (typeof module !== "undefined") module.exports = { V2, STYLE };
