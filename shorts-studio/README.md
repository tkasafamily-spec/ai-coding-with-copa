# Pip & Quack Shorts Studio

Everything for an animated YouTube Shorts channel, in one page:

- **Voiceovers already made** for all 6 scripts, free, a different voice per character (`voiceovers/`)
- **6 ready-to-make scripts** with voiceover, scene-by-scene Google Flow prompts and sound effects
- **Script maker**: type an idea, copy, paste into Claude, get a full new script
- **The cast**: 5 original characters (Pip, Quack, Mo, Mr. Bucks, Granny Volt) with picture prompts
- **Channel setup checklist**, **upload checklist**, **hook bank**, **idea bank**
- **Claude project instructions** so Claude always writes in the right style

Open `index.html` (on the live site: `/shorts-studio/`).

## The workflow

Claude (script + scene prompts) → Google Flow (8-second clips, 9:16, with the cast pictures as Ingredients) → voiceover from `voiceovers/` (already made) → CapCut (edit, captions, sound effects) → YouTube. All free.

## Add your own script

Open `scripts.js`, copy one whole `{ ... }` block in `SCRIPTS`, paste it at the top, change the words. Write characters as `[Pip]`, `[Mo]` etc. in scene prompts and the page fills in their full description when you copy.

## Change a character

Edit their `look` in `CAST` in `scripts.js`. Every prompt on the page updates.

## Voiceovers

`voiceovers/<script>.mp3` is the fast version (20–25 sec). Trim each clip to the scene length shown on the page (also in `voiceovers/cues.json`).
`voiceovers/<script>-8s.mp3` lines up with full 8-second clips, so there's nothing to trim.

They're made with [Kokoro](https://github.com/thewh1teagle/kokoro-onnx), a free voice model whose Apache-2.0 licence allows monetised videos. To remake them after adding or changing a script:

```
./shorts-studio/voice-maker/make.sh
```

Character voices are set in `voice-maker/make_voice.py` (`VOICES`).
