# Facts Shorts

Business and history fact Shorts: real photos, a free AI narrator, bold captions, music. All free.

| File | What it is |
|---|---|
| `facts.js` | The scripts. Each beat = one line + one photo + an optional graphic (count, year, stamp, tag). Every fact has sources. |
| `voice.py` | Makes the voiceover with [Chatterbox](https://github.com/resemble-ai/chatterbox) (MIT licence, free, OK for monetised channels). |
| `captions.py` | Times every word for the captions (Whisper, runs locally). |
| `get_images.py` | Downloads photos from Wikimedia Commons. |
| `credits.json` / `credits.js` | Who took each photo and its licence. Goes in every YouTube description. |
| `player.html` + `render.js` | Draws and renders the video: zooms, cuts, graphics, captions, grain. |
| `../animator/sound.py` | Sound effects and the documentary music, made from scratch. |

## Make a new one

1. Add a fact to `facts.js` (copy a block, change the words, check the facts).
2. Put its photos in `images/` (public domain or CC BY / CC BY-SA, never "NC" or "ND"), and add them to `credits.json` and `credits.js`.
3. Voice: `python voice.py <id>` (in the Chatterbox environment: `uv venv -p 3.11`, then install `torch==2.6.0` from the CPU index and `chatterbox-tts`).
4. Captions: `python3 captions.py <id>`
5. Render: `node render.js <id>`, which writes `out/<id>.mp4`. Use `--stills 1,5,9` for quick test frames.

Or just ask Claude Code: "Make a new fact Short about …"
