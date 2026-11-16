// ─────────────────────────────────────────────────────────────
//  BUSINESS & HISTORY FACTS — your Shorts.
//  Every fact here was checked against the sources listed.
//
//  Each beat = one line of voiceover + one picture + (optional) a graphic.
//    say:   the words on screen (captions)
//    speak: how the voice should say it (only when different, e.g. numbers)
//    img:   picture from facts/images/ (see credits.json)
//    look:  "cover" (fills the screen) or "card" (photo on a blurred background)
//    gfx:   { type: "count", to, prefix, suffix, label }  big number counting up
//           { type: "year", text }                         a date that slams in
//           { type: "stamp", text }                        red rubber stamp
//           { type: "tag", text, sub }                     name tag
// ─────────────────────────────────────────────────────────────
const FACTS = [
  {
    id: "apple-800",
    title: "He Sold 10% of Apple for $800",
    hook: "HE SOLD 10% OF APPLE FOR $800",
    titles: ["He Sold 10% of Apple for $800", "Apple's Forgotten Third Founder", "The Worst Deal in History?"],
    hashtags: "#shorts #apple #businessfacts",
    question: "Would YOU have sold it? 👇",
    sources: ["Christie's, Apple partnership agreement (1 April 1976)", "Cult of Mac, 'Ron Wayne quits Apple' (April 12, 1976)", "Fortune, Jan 2026"],
    beats: [
      { say: "This man owned 10% of Apple.", speak: "This man owned ten percent of Apple.", img: "apple1a", look: "cover", gfx: { type: "count", to: 10, suffix: "%", label: "OF APPLE" } },
      { say: "In April 1976, he started Apple with Steve Jobs and Steve Wozniak.", speak: "In April, nineteen seventy-six, he started Apple with Steve Jobs and Steve Wozniak.", img: "apple1b", look: "cover", gfx: { type: "year", text: "APRIL 1976" } },
      { say: "His name was Ronald Wayne.", img: "apple1c", look: "cover", gfx: { type: "tag", text: "RONALD WAYNE", sub: "APPLE'S THIRD CO-FOUNDER" } },
      { say: "He wrote Apple's first contract, and drew its very first logo.", img: "applelogo", look: "card" },
      { say: "But just 12 days later, he got scared of the risk.", speak: "But just twelve days later, he got scared of the risk.", img: "apple1b", look: "cover", gfx: { type: "year", text: "12 DAYS LATER" } },
      { say: "So he sold his 10%… for $800.", speak: "So he sold his ten percent... for eight hundred dollars.", img: "apple1a", look: "cover", gfx: { type: "stamp", text: "SOLD: $800" } },
      { say: "Apple went on to become one of the biggest companies on Earth.", img: "applepark", look: "cover" },
      { say: "Today, that 10% would be worth hundreds of billions of dollars.", speak: "Today, that ten percent would be worth hundreds of billions of dollars.", img: "applepark", look: "cover", gfx: { type: "count", to: 300000000000, prefix: "$", suffix: "+", label: "WHAT IT COULD BE WORTH" } },
      { say: "And he says he has no regrets.", img: "apple1c", look: "cover" },
      { say: "Would you have sold it?", img: "apple1a", look: "cover" },
    ],
  },
  {
    id: "blockbuster-netflix",
    title: "Blockbuster Said No to Netflix",
    hook: "THEY SAID NO TO BUYING NETFLIX",
    titles: ["Blockbuster Could Have Bought Netflix for $50M", "The $50 Million Mistake", "Why There's Only One Blockbuster Left"],
    hashtags: "#shorts #netflix #businessfacts",
    question: "Biggest business mistake ever? 👇",
    sources: ["CNBC, 'How Netflix almost lost the movie rental wars to Blockbuster' (2020)", "Barry McCarthy interview (2008)"],
    beats: [
      { say: "In 2000, Netflix offered to sell itself to Blockbuster for $50 million.", speak: "In the year two thousand, Netflix offered to sell itself to Blockbuster for fifty million dollars.", img: "blockstore", look: "cover", gfx: { type: "count", to: 50000000, prefix: "$", label: "THE PRICE OF NETFLIX" } },
      { say: "Back then, Netflix was tiny. It mailed DVDs in red envelopes.", img: "netflixenv", look: "card" },
      { say: "Blockbuster had thousands of video stores.", img: "blockstore2", look: "cover" },
      { say: "So the Netflix founders flew to Dallas to make the deal.", img: "hastings", look: "card", gfx: { type: "tag", text: "REED HASTINGS", sub: "NETFLIX CO-FOUNDER" } },
      { say: "Blockbuster laughed them out of the room.", img: "blockstore2", look: "cover", gfx: { type: "stamp", text: "NO DEAL" } },
      { say: "Ten years later, Blockbuster went bankrupt.", img: "blockclose", look: "cover", gfx: { type: "year", text: "2010" } },
      { say: "Netflix is now worth hundreds of billions of dollars.", img: "netflixenv", look: "card", gfx: { type: "count", to: 100000000000, prefix: "$", suffix: "+", label: "NETFLIX TODAY" } },
      { say: "And there's only one Blockbuster left, in Bend, Oregon.", img: "lastblock", look: "cover", gfx: { type: "tag", text: "THE LAST BLOCKBUSTER", sub: "BEND, OREGON" } },
      { say: "All because they said no.", img: "lastblock", look: "cover" },
    ],
  },
  {
    id: "coca-cola-9",
    title: "Coca-Cola Sold 9 Drinks a Day",
    hook: "COCA-COLA SOLD JUST 9 DRINKS A DAY",
    titles: ["Coca-Cola Sold Just 9 Drinks a Day", "From 9 Drinks to 2 Billion", "Coca-Cola's Terrible First Year"],
    hashtags: "#shorts #cocacola #historyfacts",
    question: "Coke or Pepsi? 👇",
    sources: ["The Coca-Cola Company, 'The Birth of a Refreshing Idea'", "Coca-Cola, 'A Short History' (125 years booklet)", "Library of Congress, 'World's First Coca-Cola was Served'"],
    beats: [
      { say: "In its first year, Coca-Cola sold just 9 drinks a day.", speak: "In its first year, Coca-Cola sold just nine drinks a day.", img: "cokead", look: "card", gfx: { type: "count", to: 9, label: "DRINKS A DAY" } },
      { say: "It was invented in 1886, by a pharmacist in Atlanta named John Pemberton.", speak: "It was invented in eighteen eighty-six, by a pharmacist in Atlanta named John Pemberton.", img: "pemberton", look: "card", gfx: { type: "year", text: "1886" } },
      { say: "A glass cost 5 cents, at Jacobs' Pharmacy.", speak: "A glass cost five cents, at Jacobs' Pharmacy.", img: "fountain", look: "cover", gfx: { type: "stamp", text: "5¢" } },
      { say: "His bookkeeper, Frank Robinson, named it, and wrote the famous logo by hand.", img: "cokead2", look: "card" },
      { say: "Pemberton sold his share, and died in 1888.", speak: "Pemberton sold his share, and died in eighteen eighty-eight.", img: "cokeold", look: "card", gfx: { type: "year", text: "1888" } },
      { say: "He never saw what it would become.", img: "cokead", look: "card" },
      { say: "Today, the company sells over 2 billion drinks every single day.", speak: "Today, the company sells over two billion drinks, every single day.", img: "cokebottles", look: "cover", gfx: { type: "count", to: 2000000000, label: "DRINKS A DAY" } },
      { say: "From 9 drinks a day… to 2 billion.", speak: "From nine drinks a day... to two billion.", img: "cokebottles", look: "cover" },
    ],
  },
  {
    id: "nintendo-1889",
    title: "Nintendo Is Older Than the Airplane",
    hook: "NINTENDO IS OLDER THAN THE AIRPLANE",
    titles: ["Nintendo Is Older Than the Airplane", "Nintendo Started With Playing Cards", "Before Mario, Nintendo Ran Taxis"],
    hashtags: "#shorts #nintendo #historyfacts",
    question: "Favourite Nintendo game? 👇",
    sources: ["Nintendo, Company History", "Britannica Money, 'Nintendo'", "Wikipedia, 'History of Nintendo'"],
    beats: [
      { say: "Nintendo is older than the airplane.", img: "hanafuda", look: "cover" },
      { say: "It was started in 1889, in Kyoto, Japan.", speak: "It was started in eighteen eighty-nine, in Kyoto, Japan.", img: "hanafuda2", look: "cover", gfx: { type: "year", text: "1889" } },
      { say: "And it made playing cards, called hanafuda.", img: "hanafuda3", look: "cover", gfx: { type: "tag", text: "HANAFUDA", sub: "JAPANESE FLOWER CARDS" } },
      { say: "Later, Nintendo tried running a taxi company…", img: "hanafuda4", look: "cover", gfx: { type: "stamp", text: "TAXIS" } },
      { say: "…selling instant rice… and even a vacuum cleaner.", img: "hanafuda5", look: "cover", gfx: { type: "stamp", text: "INSTANT RICE" } },
      { say: "Most of it flopped.", img: "hanafuda3", look: "cover", gfx: { type: "stamp", text: "FLOPPED" } },
      { say: "Then an engineer built a toy grabbing arm, the Ultra Hand. It sold over a million.", img: "hanafuda2", look: "card", gfx: { type: "count", to: 1000000, suffix: "+", label: "ULTRA HANDS SOLD" } },
      { say: "That led to video games, and eventually, to Mario.", img: "gamewatch", look: "card" },
      { say: "And Nintendo still sells playing cards today.", img: "hanafuda", look: "cover" },
    ],
  },
  {
    id: "eiffel-con",
    title: "The Man Who Sold the Eiffel Tower",
    hook: "HE SOLD THE EIFFEL TOWER",
    titles: ["The Man Who Sold the Eiffel Tower", "He Sold the Eiffel Tower for Scrap", "The Greatest Con in History"],
    hashtags: "#shorts #history #historyfacts",
    question: "Would you have fallen for it? 👇",
    sources: ["Official Eiffel Tower website, 'Who sold the Eiffel Tower?'", "El País, 'The man who sold the Eiffel Tower' (2024)"],
    beats: [
      { say: "In 1925, a con man sold the Eiffel Tower.", speak: "In nineteen twenty-five, a con man sold the Eiffel Tower.", img: "eiffel", look: "cover", gfx: { type: "year", text: "1925" } },
      { say: "His name was Victor Lustig.", img: "lustig", look: "card", gfx: { type: "tag", text: "VICTOR LUSTIG", sub: "CON ARTIST" } },
      { say: "He read in the paper that the tower cost a fortune to repair.", img: "eiffel2", look: "cover" },
      { say: "So he pretended to be a government official, and invited scrap metal dealers to a secret meeting.", img: "eiffel2", look: "cover" },
      { say: "He told them Paris was tearing the tower down, and selling it for scrap.", img: "eiffel", look: "cover", gfx: { type: "stamp", text: "FOR SALE" } },
      { say: "One dealer paid him, for over 7,000 tons of iron.", speak: "One dealer paid him, for over seven thousand tons of iron.", img: "eiffel2", look: "cover", gfx: { type: "count", to: 7300, suffix: " TONS", label: "OF IRON" } },
      { say: "Lustig ran off with the money, and the dealer was too embarrassed to tell the police.", img: "lustig", look: "card" },
      { say: "So Lustig came back… and tried to sell it again.", img: "eiffelnight", look: "cover", gfx: { type: "stamp", text: "AGAIN?!" } },
      { say: "He ended up in Alcatraz.", img: "alcatraz", look: "cover", gfx: { type: "tag", text: "ALCATRAZ", sub: "SAN FRANCISCO" } },
    ],
  },
  {
    id: "play-doh",
    title: "Play-Doh Was Made to Clean Walls",
    hook: "PLAY-DOH WAS MADE TO CLEAN WALLS",
    titles: ["Play-Doh Was Made to Clean Walls", "Play-Doh's Weird Origin", "The Toy That Was a Cleaning Product"],
    hashtags: "#shorts #playdoh #businessfacts",
    question: "Did you ever eat Play-Doh? 👇",
    sources: ["Kutol, 'Our Story'", "Smithsonian Magazine, 'The Accidental Invention of Play-Doh' (2019)"],
    beats: [
      { say: "Play-Doh was invented to clean wallpaper.", img: "playdoh", look: "cover" },
      { say: "Back in the 1930s, lots of homes were heated with coal.", speak: "Back in the nineteen thirties, lots of homes were heated with coal.", img: "coal", look: "cover", gfx: { type: "year", text: "1930s" } },
      { say: "And the soot turned wallpaper black.", img: "wallpaper", look: "cover" },
      { say: "So a company called Kutol made a soft dough to wipe it clean.", img: "factory", look: "cover", gfx: { type: "tag", text: "KUTOL", sub: "CINCINNATI, OHIO" } },
      { say: "Then washable wallpaper came out, and sales crashed.", img: "wallpaper2", look: "cover", gfx: { type: "stamp", text: "SALES CRASHED" } },
      { say: "Until a teacher, Kay Zufall, let her class play with it.", img: "playdoh2", look: "cover", gfx: { type: "tag", text: "KAY ZUFALL", sub: "TEACHER" } },
      { say: "In 1956, it became a toy called Play-Doh.", speak: "In nineteen fifty-six, it became a toy called Play-Doh.", img: "playdoh", look: "cover", gfx: { type: "year", text: "1956" } },
      { say: "Billions of cans have been sold since.", img: "playdoh2", look: "cover", gfx: { type: "count", to: 3000000000, suffix: "+", label: "CANS SOLD" } },
      { say: "All because of dirty walls.", img: "wallpaper", look: "cover" },
    ],
  },
];
if (typeof module !== "undefined") module.exports = { FACTS };
