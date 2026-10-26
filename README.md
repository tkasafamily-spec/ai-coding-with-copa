# Oreo

A talk-to-it voice assistant: a glowing red and blue glass orb that listens for **"Hey Oreo"**, answers out loud, and runs in Safari on iPad.

## Use it

1. Open the site in Safari.
2. Tap the orb once and allow the microphone.
3. Say "Hey Oreo, what's the weather in Yarrawonga?"

Keep Oreo open on screen while it listens. The mic button at the top turns listening on and off.

## What it can do

- **Without a key:** sums and the weather (weather from [Open-Meteo](https://open-meteo.com/)).
- **With a free Google Gemini key** (Settings → Free brain): answers anything and searches Google. Get one at [aistudio.google.com/apikey](https://aistudio.google.com/apikey); no credit card needed.
- **Or with a Claude API key** (Settings → Paid brain): answers anything, searches the web, reads websites. Get a key at [platform.claude.com](https://platform.claude.com/).

Keys are stored only on your device and are only sent to Google or Anthropic.

## Voices

Oreo speaks with the voices installed on your device. For the most natural sound, download a Premium voice in Settings → Accessibility → Spoken Content → Voices → English, then pick it in Oreo's Settings.

Everything is in one file, `index.html`.

# Recipe Reel

Turn your cooking clips into a step-by-step recipe video (Shorts, TikTok, Reels), right on your iPad. No keys, no accounts: everything happens in Safari on your device.

Open `recipe-reel/` in Safari, then:

1. **Dish:** type what you're cooking.
2. **Ingredients:** list what you need, and add a video or photo of it all laid out.
3. **Steps:** add one video or photo per step, with a few words about what happens.
4. **Make:** pick the shape and length, then tap **Edit my video**. Keep the screen open while it makes your video, then tap **Save video**.

Your project is saved on the iPad, so you can close the page and come back.

Files: `recipe-reel/index.html` (the app), `engine.js` (makes the video), `music.js` (built-in music).
