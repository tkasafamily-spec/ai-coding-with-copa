"""Makes free voiceovers for every script in ../scripts.js with Kokoro (Apache-2.0 licence, OK for monetised videos).

Run it with ./make.sh (it downloads the voice model the first time).
Writes, for each script:  voiceovers/<id>.mp3     fast version, scene lengths in voiceovers/cues.json
                          voiceovers/<id>-8s.mp3  each scene starts at the start of its 8-second clip
and one sample per character: voiceovers/cast-<name>.mp3
"""
import json, os, subprocess, sys, tempfile
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

SCRIPTS = json.load(open(sys.argv[1]))
OUT = sys.argv[2]
os.makedirs(OUT, exist_ok=True)
MODELS = os.environ.get("KOKORO_DIR", os.path.expanduser("~/.cache/kokoro"))
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
SR = 24000
SCENE = 8.0

# voice, lang, base speed, ffmpeg filter for character
VOICES = {
    "Narrator":    ("af_heart",   "en-us", 1.08, None),
    "Pip":         ("am_puck",    "en-us", 1.12, "rubberband=pitch=1.30:formant=preserved"),
    "Mo":          ("am_fenrir",  "en-us", 0.86, "rubberband=pitch=0.90"),
    "Mr. Bucks":   ("bm_george",  "en-gb", 0.98, "rubberband=pitch=0.92"),
    "Granny Volt": ("bf_emma",    "en-gb", 0.95, "rubberband=pitch=1.10,vibrato=f=5:d=0.06"),
}

def fx(audio, filt):
    if not filt: return audio
    with tempfile.TemporaryDirectory() as d:
        a, b = f"{d}/a.wav", f"{d}/b.wav"
        sf.write(a, audio, SR)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", a, "-af", filt, "-ar", str(SR), b], check=True)
        out, _ = sf.read(b, dtype="float32")
    return out

def say(who, text, boost=1.0):
    v, lang, sp, filt = VOICES.get(who, VOICES["Narrator"])
    a, sr = k.create(text, voice=v, speed=min(sp * boost, 1.5), lang=lang)
    a = trim(np.asarray(a, dtype="float32"))
    return fx(a, filt)

def trim(a, thr=0.008):
    idx = np.where(np.abs(a) > thr)[0]
    if len(idx) == 0: return a
    return a[max(0, idx[0] - 240): idx[-1] + 1200]

GAP = np.zeros(int(0.22 * SR), dtype="float32")
def write_mp3(audio, path):
    wav = path[:-4] + ".wav"; sf.write(wav, audio, SR)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11",
                    "-ar", "44100", "-ac", "1", "-b:a", "160k", path], check=True)
    os.remove(wav)

cues = {}
for s in SCRIPTS:
    clips = []
    for sc in s["scenes"]:
        parts = []
        for who, text in sc["say"]:
            parts += [say(who, text), GAP]
        clips.append(np.concatenate(parts[:-1]))
    # Easy: each scene starts at the start of its 8-second clip
    easy = np.zeros(int(len(clips) * SCENE * SR), dtype="float32")
    for i, c in enumerate(clips):
        a = int((i * SCENE + (0.05 if i == 0 else 0.2)) * SR)
        easy[a:a + len(c)] += c[: len(easy) - a]
    write_mp3(easy, f'{OUT}/{s["id"]}-8s.mp3')
    # Fast: each scene lasts as long as its lines (min 2.6s), clips trimmed to match
    fast, t, scene_lens = [], 0.0, []
    for i, c in enumerate(clips):
        lead = 0.05 if i == 0 else 0.15
        length = min(SCENE, max(2.6, lead + len(c) / SR + 0.45))
        seg = np.zeros(int(length * SR), dtype="float32")
        a = int(lead * SR); seg[a:a + len(c)] = c[: len(seg) - a]
        fast.append(seg); scene_lens.append(round(length, 1))
    write_mp3(np.concatenate(fast), f'{OUT}/{s["id"]}.mp3')
    cues[s["id"]] = scene_lens
    print(s["id"], "fast:", round(sum(scene_lens), 1), "s", scene_lens)
json.dump(cues, open(f"{OUT}/cues.json", "w"))

SAMPLES = {
    "Narrator": "This is the narrator. Mr. Bucks said: fill this bucket, and win five hundred million dollars.",
    "Pip": "Hi, I'm Pip! I say yes to every challenge. Easy money!",
    "Mo": "Hey. I'm Mo. That's a bad idea, man.",
    "Mr. Bucks": "Welcome! I am Mister Bucks, and I have a challenge for you!",
    "Granny Volt": "Hello, sweetie. I'm Granny Volt. Beep! Beep!",
}
for who, text in SAMPLES.items():
    write_mp3(say(who, text), f'{OUT}/cast-{who.lower().replace(". ", "-").replace(" ", "-")}.mp3')
print("cast samples done")
