"""Voiceover for the 3D What If Shorts: Phonon (free, Apache-2.0), voice "Russell", whole script in ONE take
so it flows like a real narrator, then Whisper finds when every word is said (beat timings + captions).
python3 whatif3d/voice.py [id ...]   -> whatif3d/voice/<id>.mp3, <id>.json, <id>-captions.json"""
import difflib, json, os, re, subprocess, sys
import numpy as np, soundfile as sf
import ptts
from faster_whisper import WhisperModel
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "voice"); os.makedirs(OUT, exist_ok=True)
V3 = json.loads(subprocess.run(["node", "-e", "process.stdout.write(JSON.stringify(require(process.argv[1]).V3))", os.path.join(HERE, "scripts.js")], capture_output=True, text=True, check=True).stdout)
VOICE, PACE, SEED = os.environ.get("VOICE", "Russell"), os.environ.get("PACE", "-0.06"), int(os.environ.get("SEED", "7"))
SPOKEN = {"1950": "nineteen fifty", "143,000": "a hundred and forty-three thousand", "3 a.m.": "three A M"}  # say numbers the way a narrator would
tts = ptts.TTS("hf://gradium/phonon-31m-en", lang="en", quant="q8", seed=SEED)
tts.set_conditions({"num_speakers": "1", "duration_delta": PACE})
wm = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
for f in V3:
    if sys.argv[1:] and f["id"] not in sys.argv[1:]: continue
    says = [b["say"] for b in f["beats"]]
    speak = " ".join(says).replace("…", "...")
    for k, v in SPOKEN.items(): speak = speak.replace(k, v)
    raw = os.path.join(OUT, f["id"] + "-raw.wav"); tts.save(raw, speak, voice=VOICE)
    a, sr = sf.read(raw, dtype="float32"); a = a if a.ndim == 1 else a.mean(1)
    # cap long silences at 0.45 s so the pacing stays tight
    env = np.convolve(np.abs(a), np.ones(int(sr * 0.02)) / int(sr * 0.02), "same"); quiet = env < 0.006
    keep, run = np.ones(len(a), bool), 0
    for i in range(len(a)):
        run = run + 1 if quiet[i] else 0
        if run > sr * 0.45: keep[i] = False
    a = np.concatenate([np.zeros(int(sr * 0.05), np.float32), a[keep]])
    lead = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, lead[0] - int(sr * 0.04)):] if len(lead) else a
    wav = os.path.join(OUT, f["id"] + ".wav"); sf.write(wav, a, sr)
    mp3 = os.path.join(OUT, f["id"] + ".mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-af", f"atempo={os.environ.get('TEMPO', '1')},highpass=f=70,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1.2:g=2.5,acompressor=threshold=-18dB:ratio=3:attack=8:release=80:makeup=2,loudnorm=I=-14:TP=-1.5:LRA=9", "-ar", "44100", "-ac", "1", "-b:a", "192k", mp3], check=True)
    os.remove(raw)
    # word timings
    pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", mp3, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True).stdout
    heard = [w for s in wm.transcribe(np.frombuffer(pcm, np.int16).astype(np.float32) / 32768, word_timestamps=True, initial_prompt=" ".join(says))[0] for w in s.words]
    dur = len(pcm) / 2 / 16000
    mine = [(k, w) for k, s in enumerate(says) for w in s.replace("…", "… ").split()]
    sm = difflib.SequenceMatcher(a=[norm(w) for _, w in mine], b=[norm(w.word) for w in heard], autojunk=False)
    times = [None] * len(mine)
    for blk in sm.get_matching_blocks():
        for j in range(blk.size): times[blk.a + j] = (heard[blk.b + j].start, heard[blk.b + j].end)
    # fill words whisper missed by spreading them between neighbours
    for i in range(len(mine)):
        if times[i] is None:
            p = next((times[j][1] for j in range(i - 1, -1, -1) if times[j]), 0.0)
            n = next((times[j][0] for j in range(i + 1, len(mine)) if times[j]), dur)
            gap = [j for j in range(i, len(mine)) if times[j] is None]; gap = gap[:next((x for x, j in enumerate(gap) if j != i + x), len(gap))]
            for x, j in enumerate(gap): times[j] = (p + (n - p) * x / len(gap), p + (n - p) * (x + 1) / len(gap))
    words = [{"w": w, "s": round(t[0], 3), "e": round(t[1], 3), "beat": k} for (k, w), t in zip(mine, times)]
    beats = []
    for k, s in enumerate(says):
        ws = [w for w in words if w["beat"] == k]; beats.append({"say": s, "start": ws[0]["s"], "end": ws[-1]["e"]})
    json.dump({"duration": round(max(dur, beats[-1]["end"] + 0.6), 3), "beats": beats}, open(os.path.join(OUT, f["id"] + ".json"), "w"), indent=1)
    chunks, cur = [], []
    for i, w in enumerate(words):
        cur.append(w); nxt = words[i + 1] if i + 1 < len(words) else None
        if not nxt or len(cur) >= 3 or len(" ".join(x["w"] for x in cur)) >= 14 or nxt["beat"] != w["beat"] or re.search(r"[.,!?:…]$", w["w"]):
            chunks.append(cur); cur = []
    caps = []
    for i, c in enumerate(chunks):
        end = min(c[-1]["e"] + 0.3, chunks[i + 1][0]["s"]) if i + 1 < len(chunks) else c[-1]["e"] + 0.5
        caps.append({"s": c[0]["s"], "e": round(end, 3), "words": [{"w": x["w"], "s": x["s"]} for x in c]})
    json.dump(caps, open(os.path.join(OUT, f["id"] + "-captions.json"), "w"))
    nw = len(mine); print(f["id"], round(dur, 1), "s", round(nw / dur * 60), "wpm | matched", sum(b.size for b in sm.get_matching_blocks()), "/", nw, "| heard:", " ".join(w.word for w in heard)[:200])
