# Shorts Studio

**Now: a business & history facts channel.** Open `index.html` (on the live site: `/shorts-studio/`).

- `videos/` holds the finished Shorts, ready to upload
- `facts/` is everything that makes them (scripts, voice, photos and credits, renderer). See `facts/README.md`.
- `cartoon.html`, `animator/`, `scripts.js`, `voiceovers/` are the first cartoon version (Pip & Quack), kept for reference.

---

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

## Animated videos

`videos/<script>.mp4` are the finished Shorts (1080 × 1920, 30 fps, with voice, captions, sound effects and music).

They're made in code by `animator/`: a Three.js scene for each script (`animator/shorts/<script>.js`) with the toy-style cast from `animator/engine.js`, rendered frame by frame in headless Chrome, with sound effects and music synthesised by `animator/sound.py`. Everything is free and made from scratch.

To re-render one (after `npm install` in `animator/`):

```
python3 animator/captions.py <script-id>      # word timings for captions
node animator/render.js <script-id>           # → animator/out/<script-id>.mp4
node animator/render.js <script-id> --stills 1,5,9   # quick test frames
```

New script? Ask Claude Code: "Animate my new Short the same way."
