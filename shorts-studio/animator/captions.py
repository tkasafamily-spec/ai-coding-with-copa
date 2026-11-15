"""Builds word-timed caption chunks for every fast voiceover.
Uses the line timings from the voice maker and Whisper word timestamps (free, runs locally)."""
import json, re, subprocess, sys, os
import numpy as np
from faster_whisper import WhisperModel

VO = os.path.join(os.path.dirname(__file__), "..", "voiceovers")
timings = json.load(open(f"{VO}/timings.json"))
only = sys.argv[1:]
m = WhisperModel("small.en", device="cpu", compute_type="int8")
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
out = {}
for sid, scenes in timings.items():
    if only and sid not in only: continue
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", f"{VO}/{sid}.mp3", "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True).stdout
    audio = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    segs, _ = m.transcribe(audio, word_timestamps=True)
    heard = [w for s in segs for w in s.words]
    words = []
    for sc in scenes:
        for ln in sc["lines"]:
            mine = ln["text"].replace("…", "… ").split()
            hw = [w for w in heard if ln["start"] - 0.15 <= (w.start + w.end) / 2 <= ln["end"] + 0.15]
            if len(hw) == len(mine):
                times = [(max(ln["start"], w.start), min(ln["end"], w.end)) for w in hw]
            else:  # spread by length
                total = sum(len(x) + 1 for x in mine); t = ln["start"]; d = ln["end"] - ln["start"]; times = []
                for x in mine:
                    dt = d * (len(x) + 1) / total; times.append((t, t + dt)); t += dt
            for x, (a, b) in zip(mine, times):
                words.append({"w": x, "s": round(a, 3), "e": round(b, 3), "who": ln["who"], "line_end": ln["end"]})
    # chunk: max 3 words / 16 chars, break after punctuation or speaker change
    chunks, cur = [], []
    for i, w in enumerate(words):
        cur.append(w)
        nxt = words[i + 1] if i + 1 < len(words) else None
        txt = " ".join(x["w"] for x in cur)
        if (not nxt or len(cur) >= 3 or len(txt) >= 14 or (re.search(r"[.,!?:…]$", w["w"]) and w["w"] not in ("Mr.", "Mrs."))
                or nxt["who"] != w["who"] or nxt["s"] - w["e"] > 0.35):
            chunks.append(cur); cur = []
    res = []
    for i, c in enumerate(chunks):
        end = min(c[-1]["line_end"] + 0.25, chunks[i + 1][0]["s"]) if i + 1 < len(chunks) else c[-1]["line_end"] + 0.4
        res.append({"s": c[0]["s"], "e": round(end, 3), "who": c[0]["who"], "words": [{"w": x["w"], "s": x["s"]} for x in c]})
    out[sid] = res
    print(sid, len(res), "chunks:", " | ".join(" ".join(x["w"] for x in c["words"]) for c in res[:8]))
prev = json.load(open(f"{VO}/captions.json")) if os.path.exists(f"{VO}/captions.json") else {}
prev.update(out)
json.dump(prev, open(f"{VO}/captions.json", "w"))
