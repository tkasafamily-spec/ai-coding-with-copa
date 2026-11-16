// ─────────────────────────────────────────────────────────────
//  VERSION 2 SHORTS — 3D cartoon scenes that move like video.
//  Each beat: say (captions), speak (how the voice says it), scene (AI picture prompt),
//  gfx (graphic), move (camera move: "push", "pull", "left", "right", "up", "shake").
//  Facts checked against the sources listed.
// ─────────────────────────────────────────────────────────────
const STYLE = "3D Pixar style animated cartoon, big expressive eyes, vibrant colors, cinematic lighting";
const V2 = [
  {
    id: "apple-300b",
    title: "He Gave Up $300 Billion for $800",
    hook: "HE TRADED $300 BILLION FOR $800",
    titles: ["He Gave Up $300 Billion for $800", "The $800 Mistake", "Apple's Forgotten Founder"],
    hashtags: "#shorts #apple #businessfacts",
    question: "Would YOU have sold it? 👇",
    sources: ["Christie's, Apple partnership agreement (1 April 1976)", "Cult of Mac, 'Ron Wayne quits Apple' (April 12, 1976)", "Fortune, 2025–2026"],
    beats: [
      { say: "This man gave up $300 billion… for 800 bucks.", speak: "This man gave up three hundred billion dollars... for eight hundred bucks.", scene: "a shocked man with big glasses and 1970s clothes holding a tiny paper check while a huge mountain of gold coins and dollar bills collapses behind him", gfx: { type: "count", to: 300000000000, prefix: "$", label: "GONE" }, move: "push" },
      { say: "In 1976, he started Apple with Steve Jobs and Steve Wozniak.", speak: "In nineteen seventy-six, he started Apple with Steve Jobs and Steve Wozniak.", scene: "three young men in 1970s clothes building a computer circuit board in a cluttered family garage, warm light", gfx: { type: "year", text: "1976" }, move: "right" },
      { say: "His name was Ronald Wayne. He owned 10%.", speak: "His name was Ronald Wayne. He owned ten percent.", scene: "cartoon character, a friendly man with big round glasses, brown 1970s suit and a mustache, smiling proudly and holding a contract", gfx: { type: "tag", text: "RONALD WAYNE", sub: "OWNED 10% OF APPLE" }, move: "pull" },
      { say: "He even drew Apple's very first logo.", scene: "cartoon character, a man with big round glasses and a mustache drawing with a pen at a wooden desk, sketch of an apple tree on the paper, cozy lamp light", move: "up" },
      { say: "But just 12 days later, he panicked.", speak: "But just twelve days later, he panicked.", scene: "a nervous sweating man with glasses at night biting his nails, a calendar on the wall, dramatic shadows", gfx: { type: "year", text: "12 DAYS LATER" }, move: "shake" },
      { say: "If Apple failed, he could lose everything he owned.", scene: "a worried man with glasses holding his head surrounded by flying unpaid bills and warning letters", move: "push" },
      { say: "So he sold his 10%… for $800.", speak: "So he sold his ten percent... for eight hundred dollars.", scene: "a man with glasses handing over a contract and receiving a few dollar bills, two young men grinning", gfx: { type: "stamp", text: "SOLD: $800" }, move: "left" },
      { say: "Today, Apple is one of the biggest companies on Earth.", scene: "a huge round donut shaped glass office building on a green park campus, sunny day, aerial view, tiny cars and trees", move: "pull" },
      { say: "That 10% could be worth up to $300 billion.", speak: "That ten percent could be worth up to three hundred billion dollars.", scene: "an endless vault overflowing with gold coins and stacks of money, glowing", gfx: { type: "count", to: 300000000000, prefix: "$", label: "WHAT IT COULD BE WORTH" }, move: "push" },
      { say: "Would you have sold it?", scene: "an older man with white hair and glasses shrugging and smiling, cozy living room", move: "pull" },
    ],
  },
  {
    id: "ford-5-day",
    title: "He Doubled His Workers' Pay Overnight",
    hook: "HE DOUBLED HIS WORKERS' PAY OVERNIGHT",
    titles: ["He Doubled His Workers' Pay Overnight", "The Boss Who Doubled Pay", "Why You Get Weekends Off"],
    hashtags: "#shorts #history #workfacts",
    question: "Would you work the assembly line for $5 a day? 👇",
    sources: ["The Henry Ford, 'Ford's Five-Dollar Day' and Ford Company Chronology", "NBER Working Paper 2101 (Raff & Summers)", "History.com, 'Ford factory workers get 40-hour week'"],
    beats: [
      { say: "In 1914, one boss doubled his workers' pay overnight.", speak: "In nineteen fourteen, one boss doubled his workers' pay, overnight.", scene: "a rich boss in a 1910s suit throwing money in the air while hundreds of factory workers cheer wildly", gfx: { type: "stamp", text: "PAY x2" }, move: "push" },
      { say: "His name was Henry Ford.", scene: "a confident older businessman in a 1910s suit and hat standing in front of a car factory", gfx: { type: "tag", text: "HENRY FORD", sub: "FORD MOTOR COMPANY" }, move: "pull" },
      { say: "His new assembly line made cars fast… but the work was so boring, people kept quitting.", speak: "His new assembly line made cars fast... but the work was so boring, people kept quitting.", scene: "bored tired factory workers on a 1910s car assembly line, one worker walking out the door", move: "right" },
      { say: "In 1913, he hired over 50,000 people, just to keep about 14,000 jobs filled.", speak: "In nineteen thirteen, he hired over fifty thousand people, just to keep about fourteen thousand jobs filled.", scene: "an endless line of new workers walking in one door of a factory while workers walk out the other door", gfx: { type: "count", to: 50448, label: "PEOPLE HIRED IN ONE YEAR" }, move: "left" },
      { say: "So he did something crazy.", scene: "a businessman in a 1910s suit with a wild grin slamming his fist on a desk", move: "shake" },
      { say: "He raised pay from $2.34… to $5 a day.", speak: "He raised pay from two dollars thirty-four... to five dollars a day.", scene: "cartoon factory workers in 1910s overalls jumping for joy holding up dollar bills, confetti", gfx: { type: "count", to: 5, prefix: "$", label: "A DAY (WAS $2.34)" }, move: "push" },
      { say: "Thousands of people rushed to his factory in the freezing cold.", scene: "a huge crowd of men in winter coats pushing at the gates of a factory in snow, 1914", move: "up" },
      { say: "So many came, they got sprayed with fire hoses.", scene: "firemen spraying a crowd of men with water hoses in freezing winter outside a factory gate", gfx: { type: "stamp", text: "FIRE HOSES" }, move: "shake" },
      { say: "But workers stopped quitting, and Ford's factory boomed.", scene: "cartoon workers in overalls smiling and giving thumbs up next to a row of shiny black 1910s cars in a bright factory", move: "right" },
      { say: "And in 1926, he gave them weekends off, too.", speak: "And in nineteen twenty-six, he gave them weekends off, too.", scene: "1920s factory workers leaving work happily on a sunny Friday with picnic baskets and families", gfx: { type: "year", text: "1926" }, move: "pull" },
      { say: "Would you work the line for $5 a day?", speak: "Would you work the line for five dollars a day?", scene: "a cheerful cartoon factory worker in a flat cap holding up a dollar bill and winking at the camera", move: "push" },
    ],
  },
];
if (typeof module !== "undefined") module.exports = { V2, STYLE };
