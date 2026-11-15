# Pip & Quack Shorts Studio

Everything for an animated YouTube Shorts channel, in one page:

- **6 ready-to-make scripts** with voiceover, scene-by-scene Google Flow prompts and sound effects
- **Script maker**: type an idea, copy, paste into Claude, get a full new script
- **The cast**: 5 original characters (Pip, Quack, Mo, Mr. Bucks, Granny Volt) with picture prompts
- **Channel setup checklist**, **upload checklist**, **hook bank**, **idea bank**
- **Claude project instructions** so Claude always writes in the right style

Open `index.html` (on the live site: `/shorts-studio/`).

## The workflow

Claude (script + scene prompts) → Google Flow (8-second clips, 9:16, with the cast pictures as Ingredients) → ElevenLabs or CapCut (voice) → CapCut (edit, captions, sound effects) → YouTube.

## Add your own script

Open `scripts.js`, copy one whole `{ ... }` block in `SCRIPTS`, paste it at the top, change the words. Write characters as `[Pip]`, `[Mo]` etc. in scene prompts and the page fills in their full description when you copy.

## Change a character

Edit their `look` in `CAST` in `scripts.js`. Every prompt on the page updates.
