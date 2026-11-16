"""Word-timed caption chunks for the fact Shorts (Whisper, free, runs locally).  python3 facts/captions.py [id ...]"""
import json, os, re, subprocess, sys
import numpy as np
from faster_whisper import WhisperModel
HERE = os.path.dirname(os.path.abspath(__file__))
ids = sys.argv[1:] or [f[:-5] for f in os.listdir(os.path.join(HERE, "voice")) if f.endswith(".json") and not f.endswith("-captions.json")]
m = WhisperModel("small.en", device="cpu", compute_type="int8")
for sid in ids:
    v = json.load(open(os.path.join(HERE, "voice", sid + ".json")))
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", os.path.join(HERE, "voice", sid + ".mp3"), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"], capture_output=True).stdout
    heard = [w for s in m.transcribe(np.frombuffer(raw, np.int16).astype(np.float32) / 32768, word_timestamps=True)[0] for w in s.words]
    words = []
    for k, b in enumerate(v["beats"]):
        mine = b["say"].replace("…", "… ").split()
        hw = [w for w in heard if b["start"] - 0.12 <= (w.start + w.end) / 2 <= b["end"] + 0.12]
        if len(hw) == len(mine): times = [(max(b["start"], w.start), w.end) for w in hw]
        else:
            tot = sum(len(x) + 1 for x in mine); t = b["start"]; d = b["end"] - b["start"]; times = []
            for x in mine: dt = d * (len(x) + 1) / tot; times.append((t, t + dt)); t += dt
        for x, (a, e) in zip(mine, times): words.append({"w": x, "s": round(a, 3), "e": round(e, 3), "beat": k, "beat_end": b["end"]})
    chunks, cur = [], []
    for i, w in enumerate(words):
        cur.append(w); nxt = words[i + 1] if i + 1 < len(words) else None
        txt = " ".join(x["w"] for x in cur)
        if not nxt or len(cur) >= 3 or len(txt) >= 14 or nxt["beat"] != w["beat"] or (re.search(r"[.,!?:…]$", w["w"]) and w["w"] not in ("Mr.", "Mrs.")):
            chunks.append(cur); cur = []
    res = []
    for i, c in enumerate(chunks):
        end = min(c[-1]["beat_end"] + 0.25, chunks[i + 1][0]["s"]) if i + 1 < len(chunks) else c[-1]["beat_end"] + 0.4
        res.append({"s": c[0]["s"], "e": round(end, 3), "words": [{"w": x["w"], "s": x["s"]} for x in c]})
    json.dump(res, open(os.path.join(HERE, "voice", sid + "-captions.json"), "w"))
    print(sid, len(res), "chunks |", " | ".join(" ".join(x["w"] for x in c["words"]) for c in res[:6]))
