// ─────────────────────────────────────────────────────────────
//  SHORTS STUDIO DATA
//  This file holds your cast, your scripts and your idea list.
//  The page (index.html) reads everything from here.
//
//  To add a new script: copy one whole { ... } block inside
//  SCRIPTS, paste it at the top of the list, and change the words.
//  In scene prompts, write a character's name in [square brackets],
//  like [Pip]. When you tap "Copy", the page swaps it for the full
//  description so the character looks the same in every clip.
// ─────────────────────────────────────────────────────────────

// The look of every clip. Added to the end of every scene prompt.
const STYLE =
  "3D animated cartoon, chunky vinyl-toy characters with soft rounded shapes, glossy plastic shading, " +
  "bright saturated colours, warm cinematic lighting, shallow depth of field, smooth expressive animation, " +
  "vertical 9:16 frame, no text, no subtitles, no logos";

// Your cast. "look" is pasted into prompts so they stay the same in every clip.
const CAST = [
  {
    name: "Pip",
    color: "#FF9A3D",
    role: "The hero. Small, brave, says yes to every challenge.",
    voice: "Young, excited, a bit squeaky. Talks fast.",
    look: "Pip, a small round bean-shaped cartoon kid with smooth orange skin, huge shiny black eyes, a tiny smile, a red baseball cap worn backwards, a white t-shirt with a yellow lightning bolt, and short stubby legs with red sneakers",
  },
  {
    name: "Quack",
    color: "#FFC83D",
    role: "The sidekick. A rubber duck who never talks but always saves the day.",
    voice: "Only squeaks (use a squeaky-toy sound effect).",
    look: "Quack, a yellow rubber duck the size of a basketball with an orange beak, big round eyes and a tiny blue snorkel mask pushed up on its head, who waddles and squeaks",
  },
  {
    name: "Mo",
    color: "#7FB2FF",
    role: "Pip's best friend. Super chill. Always says \"Bad idea.\"",
    voice: "Slow, flat, sleepy. Never shouts.",
    look: "Mo, a tall skinny cartoon guy with pale blue skin, sleepy half-closed eyes, messy black hair, a baggy grey hoodie with the hood half up, and his hands always in his pockets",
  },
  {
    name: "Mr. Bucks",
    color: "#E8C15A",
    role: "The rich guy who runs the crazy money challenges. Always has a trick.",
    voice: "Big, posh, showy, like a game-show host.",
    look: "Mr. Bucks, a round chubby cartoon rich man with shiny gold skin, a tall black top hat, a monocle, a curly white moustache, a purple velvet suit and a gold cane",
  },
  {
    name: "Granny Volt",
    color: "#7EE08A",
    role: "Tiny grandma on a rocket scooter. Wins when nobody expects it.",
    voice: "Sweet old lady who is secretly very cool.",
    look: "Granny Volt, a tiny cartoon grandma with a puff of white hair in a bun, round pink glasses and a green cardigan, riding a red mobility scooter with a rocket booster on the back",
  },
];

// Your ready-to-make scripts. Each scene is one 8-second clip in Google Flow.
// "say" lines are the voiceover. Each line is [who is talking, what they say].
const SCRIPTS = [
  {
    id: "500m-bucket",
    title: "The $500 Million Bucket",
    hook: "FILL IT. WIN $500,000,000.",
    thumb: "500m-buckets",
    titles: ["He Had 60 Seconds To Win $500,000,000", "Fill The Bucket, Win $500 Million", "The Bucket Had A Hole…"],
    hashtags: "#shorts #animation #challenge",
    question: "Who should get the money, Pip or Quack? 👇",
    scenes: [
      {
        say: [["Narrator", "Mr. Bucks said: fill this bucket in sixty seconds, and win five hundred million dollars."]],
        prompt: "[Mr. Bucks] stands on a stage in a giant shiny gold game-show studio holding an open briefcase overflowing with cash, pointing his cane at a small red bucket on a pedestal. [Pip] stares at the bucket with huge excited eyes. Confetti cannons fire. The camera slowly pushes in.",
        sfx: "Game-show sting, confetti pop",
      },
      {
        say: [["Narrator", "Easy, right? Pip grabbed a cup and ran to the pool."], ["Pip", "Easy money!"]],
        prompt: "[Pip] sprints across the game-show studio holding a tiny paper cup toward a big blue swimming pool. A huge digital countdown clock glows on the wall. [Quack] waddles fast behind him. Fast tracking shot.",
        sfx: "Ticking clock, running footsteps",
      },
      {
        say: [["Narrator", "But the bucket had a hole. A big one."]],
        prompt: "Close-up of the small red bucket as [Pip] pours water into it. The water gushes straight out of a big hole in the bottom and splashes on his sneakers. Pip's eyes go wide in shock.",
        sfx: "Splash, record scratch",
      },
      {
        say: [["Mo", "Bad idea, man. Just give up."], ["Narrator", "Pip did not give up."]],
        prompt: "[Mo] leans against the studio wall with his hands in his pockets, slowly shaking his head. In front of him [Pip] desperately tries to plug the hole in the red bucket with his finger while water sprays everywhere.",
        sfx: "Water spraying, ticking gets faster",
      },
      {
        say: [["Narrator", "Then Quack had an idea."]],
        prompt: "[Quack] waddles up to the red bucket, tilts its head, then hops inside and wiggles down so its round bottom plugs the hole perfectly. It squeaks proudly. [Pip] gasps with his mouth wide open.",
        sfx: "Squeak, 'ding' idea sound",
      },
      {
        say: [["Narrator", "Pip filled it with three seconds left!"]],
        prompt: "[Pip] frantically dumps cup after cup of water into the red bucket while [Quack] sits inside it. The water rises to the brim. The countdown clock flashes red, then gold confetti explodes across the studio.",
        sfx: "3-2-1 beeps, air horn, crowd cheer",
      },
      {
        say: [["Narrator", "Mr. Bucks handed over the money… to Quack."], ["Pip", "Wait, WHAT?!"]],
        prompt: "[Mr. Bucks] bows and hands the giant briefcase of cash to [Quack], who floats in the full red bucket wearing tiny sunglasses. [Pip] drops his jaw in disbelief. [Mo] laughs quietly in the background.",
        sfx: "Cash register 'cha-ching', squeak",
      },
    ],
  },
  {
    id: "pool-day",
    title: "Pool Day Gone Wrong",
    hook: "NEVER SIT ON THE GIANT DUCK",
    thumb: "duck-float",
    titles: ["Never Sit On The Giant Duck Float", "Someone Pulled The Plug…", "The Pool Drain Took Him Where?!"],
    hashtags: "#shorts #animation #funny",
    question: "Where would YOU end up if you went down the drain? 👇",
    scenes: [
      {
        say: [["Narrator", "Pip found the biggest pool float in the world."]],
        prompt: "A sunny water park. [Pip] lies back on an enormous yellow inflatable duck float in a bright blue pool, wearing sunglasses and sipping a juice box. [Quack] sits next to him on the float. Wide shot, sparkling water.",
        sfx: "Summer music, birds, water lapping",
      },
      {
        say: [["Narrator", "Then someone pulled the plug."]],
        prompt: "Underwater close-up of a giant round drain at the bottom of the pool. A huge red plug pops out with a burst of bubbles and the water starts to swirl into a whirlpool.",
        sfx: "Big 'plunk', glugging",
      },
      {
        say: [["Pip", "Uh… Mo? MO!"], ["Narrator", "Mo was busy."]],
        prompt: "[Pip] spins on the giant duck float, yelling and waving his arms. Cut to [Mo] lying on a sun lounger at the pool edge with big headphones on and his eyes closed, totally ignoring him.",
        sfx: "Swirling water, chill music from headphones",
      },
      {
        say: [["Narrator", "The float got sucked down the drain…"]],
        prompt: "The giant yellow duck float spins faster and faster in the whirlpool and gets sucked down a huge round drain pipe, with [Pip] screaming and hugging [Quack]. Top-down shot.",
        sfx: "Whoosh, long scream",
      },
      {
        say: [["Narrator", "…through the pipes…"]],
        prompt: "[Pip] and [Quack] ride the duck float through twisting, glowing underground water pipes like a crazy water slide, splashing around tight corners. Fast camera following right behind them.",
        sfx: "Water-slide whooshes, echoey yells",
      },
      {
        say: [["Narrator", "…and out of a fountain in the middle of town."]],
        prompt: "A busy town square on a sunny day. A huge stone fountain suddenly blasts the giant duck float with [Pip] and [Quack] high into the blue sky. People below look up in shock.",
        sfx: "Water blast, crowd gasp",
      },
      {
        say: [["Narrator", "He landed right back in the pool."], ["Mo", "Oh, you're back. Did I miss anything?"]],
        prompt: "The giant duck float drops from the sky and lands with a huge splash in the water park pool next to [Mo]'s sun lounger. [Pip] is soaked, staring at Mo. Mo slowly lifts one side of his headphones.",
        sfx: "Falling whistle, huge splash",
      },
    ],
  },
  {
    id: "down-the-shaft",
    title: "Down The Shaft",
    hook: "THE BUTTON SAID DON'T",
    thumb: "the-fall",
    titles: ["He Pressed The Button That Said DON'T", "Never Press The Red Elevator Button", "The Elevator Floor Disappeared"],
    hashtags: "#shorts #animation #story",
    question: "Would you have pressed it? 👇",
    scenes: [
      {
        say: [["Narrator", "The elevator had one red button. It said: don't."], ["Mo", "Don't."]],
        prompt: "Inside a shiny old brass elevator. One big glowing red button with a warning symbol sits on the wall. [Pip] slowly reaches his finger toward it. [Mo] stands behind him with his hands in his pockets, shaking his head.",
        sfx: "Elevator music, low hum",
      },
      {
        say: [["Narrator", "Pip pressed it."]],
        prompt: "Extreme close-up of [Pip]'s finger pressing the big red button. The elevator lights flicker red and an alarm light spins.",
        sfx: "Click, alarm",
      },
      {
        say: [["Narrator", "The floor dropped away."]],
        prompt: "The elevator floor swings open like a trapdoor. [Pip] and [Mo] fall down a dark, endless elevator shaft. Pip flails and screams. Mo falls calmly, still with his hands in his pockets.",
        sfx: "Trapdoor creak, wind rush",
      },
      {
        say: [["Narrator", "Down, down, past every floor…"]],
        prompt: "Low-angle shot looking up as [Pip] falls toward the camera down the elevator shaft. Glowing elevator doors rush upward past him, wind blowing his cheeks wide, his red cap barely hanging on.",
        sfx: "Rising whistle, doors whooshing past",
      },
      {
        say: [["Narrator", "Then they heard a sound."], ["Granny Volt", "Beep beep!"]],
        prompt: "From the bottom of the dark elevator shaft, [Granny Volt] rockets straight up on her red scooter, flames blasting from the rocket booster, her face determined.",
        sfx: "Scooter horn, rocket roar",
      },
      {
        say: [["Narrator", "Granny Volt caught them both."]],
        prompt: "[Granny Volt] catches [Pip] in her scooter's front basket while [Mo] lands on the back seat. The scooter rockets back up the shaft trailing sparks and fire.",
        sfx: "Thud, thud, rocket boost",
      },
      {
        say: [["Granny Volt", "Don't press that button, sweetie."], ["Pip", "…What button?"]],
        prompt: "Back in the bright elevator lobby, [Granny Volt] wags her finger at [Pip], who nods innocently. Then Pip slowly turns his eyes toward an even bigger glowing red button on the wall behind him. [Mo] sighs.",
        sfx: "Sweet music, then a suspense 'dun dun'",
      },
    ],
  },
  {
    id: "the-trap",
    title: "The Trap",
    hook: "CROSS THE ROOM. WIN $1,000,000.",
    thumb: "jettism-pit",
    titles: ["Every Step He Took, The Floor Fell", "Cross The Room, Win $1,000,000", "Mr. Bucks Built A Trap"],
    hashtags: "#shorts #animation #challenge",
    question: "Would you still take the chocolate? 👇",
    scenes: [
      {
        say: [["Mr. Bucks", "Walk across this room, and the million dollars is yours!"]],
        prompt: "A long, empty room with a black-and-white checkered tile floor. At the far end a glowing glass case holds a pile of gold coins. [Mr. Bucks] grins from a balcony above, twirling his moustache. [Pip] stands at the door.",
        sfx: "Dramatic drumroll",
      },
      {
        say: [["Narrator", "Pip took one step."], ["Narrator", "The tile behind him fell into a pit."]],
        prompt: "[Pip] steps onto the first tile. Right behind him, the tile he just left drops away into a deep dark pit with crumbling stone. Pip freezes mid-step and slowly looks back.",
        sfx: "Rumble, crumbling stone",
      },
      {
        say: [["Mo", "Bad idea."], ["Pip", "I KNOW!"]],
        prompt: "[Mo] watches from the doorway, hands in pockets, unbothered. In the middle of the room [Pip] balances on a single tile, wobbling, a big sweat drop on his forehead.",
        sfx: "Wobble sound, gulp",
      },
      {
        say: [["Narrator", "He jumped tile to tile as they fell behind him."]],
        prompt: "[Pip] leaps from tile to tile across the checkered floor, and each tile collapses into the pit right after his sneakers leave it. Dynamic side-tracking shot, dust flying.",
        sfx: "Jump boings, crash after each one",
      },
      {
        say: [["Narrator", "One tile left. But it was way too far."]],
        prompt: "[Pip] stands on the edge of the last safe tile. A huge gap of dark pit separates him from the glass case. He looks down into the darkness, then at the coins.",
        sfx: "Wind howl, heartbeat",
      },
      {
        say: [["Narrator", "So Quack became a trampoline."]],
        prompt: "[Quack] waddles out onto the edge and squeaks. [Pip] jumps onto Quack, who squishes like a rubber toy and launches him high over the pit. Pip lands safely next to the glass case. Slow motion.",
        sfx: "Big squeak, boing, slow-mo whoosh",
      },
      {
        say: [["Narrator", "The coins… were chocolate."], ["Mr. Bucks", "I never said they were REAL!"]],
        prompt: "[Pip] opens the glass case and bites a coin. It's chocolate wrapped in gold foil. [Mr. Bucks] laughs loudly on the balcony. Pip shrugs, smiles, and stuffs his cheeks with chocolate coins.",
        sfx: "Foil crinkle, villain laugh, munching",
      },
    ],
  },
  {
    id: "press-the-button",
    title: "Would You Press It?",
    hook: "PRESS IT = $1,000,000. BUT…",
    thumb: "",
    titles: ["Press It = $1,000,000… But There's A Catch", "Would YOU Press This Button?", "Every Press Made His Friend Smaller"],
    hashtags: "#shorts #animation #wouldyourather",
    question: "Would YOU press it? How many times? 👇",
    scenes: [
      {
        say: [["Narrator", "A box appeared. Press the button, get one million dollars."]],
        prompt: "A dark room with a single spotlight on a mysterious glowing box with a big green button on top. [Pip] and [Mo] stand in front of it, staring with wide eyes.",
        sfx: "Magical shimmer",
      },
      {
        say: [["Narrator", "But every time you press it, Mo shrinks one inch."], ["Mo", "Bad idea."]],
        prompt: "[Mo] looks down at himself nervously, then side-eyes [Pip]. Pip's eyes turn into sparkling dollar signs as he looks at the green button.",
        sfx: "Suspense sting",
      },
      {
        say: [["Narrator", "Pip pressed it. Money rained down. Mo went… boop."]],
        prompt: "[Pip] presses the green button. Paper money rains down from the ceiling. Next to him [Mo] shrinks a little with a small pop, his hoodie suddenly too big.",
        sfx: "Button click, money rain, tiny 'boop'",
      },
      {
        say: [["Narrator", "He pressed it again. And again. And again."]],
        prompt: "[Pip] mashes the green button over and over. Money piles up to his waist. Beside him [Mo] shrinks smaller and smaller with each press.",
        sfx: "Rapid clicks, boop boop boop",
      },
      {
        say: [["Narrator", "Now Pip was rich… and Mo was the size of Quack."]],
        prompt: "[Pip] sits on top of a giant mountain of cash. Below, a tiny [Mo] stands next to [Quack], exactly the same size, glaring up with his arms crossed.",
        sfx: "Cash register 'cha-ching'",
      },
      {
        say: [["Narrator", "Then Mo found a second button."], ["Narrator", "Every press: Pip loses a million dollars."]],
        prompt: "Tiny [Mo] walks around the back of the glowing box and finds a big blue button. He looks up at the camera and slowly smiles an evil smile.",
        sfx: "Villain music sting",
      },
      {
        say: [["Mo", "Bad idea, man."], ["Pip", "NOOO!"]],
        prompt: "Tiny [Mo] slams the blue button again and again. Piles of cash vanish in puffs of smoke. [Pip] slides down the shrinking money mountain screaming. [Quack] eats popcorn.",
        sfx: "Poof poof poof, long scream",
      },
    ],
  },
  {
    id: "last-in-the-circle",
    title: "Last One In The Circle",
    hook: "LAST ONE IN THE CIRCLE WINS $100,000",
    thumb: "",
    titles: ["Last One In The Circle Wins $100,000", "Nobody Expected Granny To Win", "I Lasted 20 Hours In A Circle"],
    hashtags: "#shorts #animation #challenge",
    question: "How long would YOU last in the circle? 👇",
    scenes: [
      {
        say: [["Mr. Bucks", "Last one in the circle wins one hundred thousand dollars!"]],
        prompt: "A sunny green field. [Mr. Bucks] paints a big white circle on the grass with his cane. Inside the circle stand [Pip], [Mo], [Granny Volt] on her scooter, and [Quack]. Wide shot.",
        sfx: "Whistle blow",
      },
      {
        say: [["Narrator", "Hour one. Mr. Bucks offered pizza to leave."], ["Narrator", "Mo left instantly."]],
        prompt: "[Mr. Bucks] holds out a steaming hot pizza at the edge of the circle. [Mo] shrugs, walks straight out of the circle, takes the pizza and eats a slice.",
        sfx: "Sizzle, munch",
      },
      {
        say: [["Narrator", "Hour five. A thunderstorm."]],
        prompt: "Heavy rain and lightning over the field. [Pip] holds a tiny umbrella over [Quack]. [Granny Volt] sits calmly on her scooter, knitting, completely dry under a big umbrella on the scooter.",
        sfx: "Thunder crack, rain",
      },
      {
        say: [["Narrator", "Hour ten. He let loose a goose."], ["Narrator", "Quack ran."]],
        prompt: "An angry white goose charges into the circle honking and flapping. [Quack] squeaks in panic and waddles out of the circle as fast as it can, the goose chasing it.",
        sfx: "Goose honks, panicked squeaks",
      },
      {
        say: [["Narrator", "Hour twenty. Just Pip and Granny left."]],
        prompt: "Night with a sky full of stars. Inside the white circle, [Pip] sways on his feet, eyes drooping, yawning hugely. [Granny Volt] sits wide awake on her scooter sipping a cup of tea.",
        sfx: "Crickets, big yawn",
      },
      {
        say: [["Narrator", "Pip fell asleep… and rolled out."]],
        prompt: "[Pip] lies down snoring and slowly rolls over, and over, until he rolls right across the white line out of the circle. [Granny Volt] watches over her glasses.",
        sfx: "Snoring, slow roll, 'ding' buzzer",
      },
      {
        say: [["Narrator", "Granny Volt won."], ["Granny Volt", "I've been sitting still for eighty years, sweetie."]],
        prompt: "[Granny Volt] holds up a briefcase full of money and winks at the camera, then blasts off into the sunrise on her rocket scooter as fireworks pop in the sky. [Pip] wakes up confused.",
        sfx: "Victory music, rocket, fireworks",
      },
    ],
  },
];

// Idea bank. Tap "Use this idea" on the page to send one to the Script Maker.
const IDEAS = [
  "Mr. Bucks offers $1,000,000 to whoever stays in a bouncy castle longest, but it keeps inflating",
  "Pip finds a remote that pauses time, but Quack keeps pressing it",
  "Last one to touch the giant gold bar wins it",
  "Pip enters a hot sauce challenge against Granny Volt",
  "Pip shrinks to the size of an ant and has to cross the kitchen",
  "Mr. Bucks builds a maze made of money; whoever escapes keeps it",
  "Mo is so lazy he invents a robot to walk for him, and it goes wrong",
  "Pip tries to catch the world's fastest ice cream truck",
  "A door appears that leads to a room full of a million rubber ducks",
  "Pip has to babysit a baby dragon for one day",
  "Every time Pip lies, his cap gets bigger",
  "Pip and Mo get stuck inside a video game",
  "Mr. Bucks hides $500,000 in one of 100 cakes",
  "Granny Volt races a sports car on her rocket scooter",
  "Pip wakes up and everyone in town is a rubber duck except him",
  "Mo falls asleep and sleepwalks through a giant obstacle course",
  "Pip buys a tiny house that is bigger on the inside",
  "Would you jump into a pool of jelly for $10,000?",
  "Pip gets a pet cloud that rains whenever he's sad",
  "Mr. Bucks challenges Pip to not laugh for 60 seconds",
  "Quack goes missing and Pip searches the whole city",
  "Pip has to escape a room where the walls are closing in, made of pillows",
  "The floor is lava, for real, for $1,000,000",
  "Pip finds a vending machine that gives you whatever you say",
  "Granny Volt's scooter gets an upgrade: it can fly",
  "Pip and Mo swap bodies for a day",
  "Mr. Bucks pays $100 for every second you hold your breath underwater",
  "Pip builds the tallest sandcastle ever, then the tide comes in",
  "Last one to leave the giant fridge wins",
  "Pip tries to deliver one pizza across a city full of traps",
];
