"""Voiceovers for v2 Shorts with Kokoro voice am_puck ("voice 4" in the sampler). Free, Apache-2.0.
python3 voice_kokoro.py [id ...]   → voice/<id>.mp3 + voice/<id>.json"""
import json, os, subprocess, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro
HERE = os.path.dirname(os.path.abspath(__file__))
V2 = json.loads(subprocess.run(["node", "-e", "process.stdout.write(JSON.stringify(require(process.argv[1]).V2))", os.path.join(HERE, "v2.js")], capture_output=True, text=True, check=True).stdout)
MODELS = os.environ.get("KOKORO_DIR", os.path.expanduser("~/.cache/kokoro"))
k = Kokoro(f"{MODELS}/kokoro-v1.0.onnx", f"{MODELS}/voices-v1.0.bin")
VOICE, SPEED, GAP = os.environ.get("VOICE", "am_puck"), 1.1, 0.12
def trim(a, thr=0.01):
    i = np.where(np.abs(a) > thr)[0]; return a if len(i) == 0 else a[max(0, i[0] - 200): i[-1] + 1500]
for f in V2:
    if sys.argv[1:] and f["id"] not in sys.argv[1:]: continue
    parts, beats, t = [np.zeros(1200, dtype=np.float32)], [], 0.05
    for b in f["beats"]:
        a, sr = k.create(b.get("speak", b["say"]).replace("…", "..."), voice=VOICE, speed=SPEED, lang="en-us")
        a = trim(np.asarray(a, dtype=np.float32)); d = len(a) / sr
        beats.append({"say": b["say"], "start": round(t, 3), "end": round(t + d, 3)}); t += d + GAP
        parts += [a, np.zeros(int(GAP * sr), dtype=np.float32)]
    wav = os.path.join(HERE, "voice", f["id"] + ".wav"); sf.write(wav, np.concatenate(parts), sr)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", wav, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", "-b:a", "192k", os.path.join(HERE, "voice", f["id"] + ".mp3")], check=True); os.remove(wav)
    json.dump({"duration": round(t + 0.35, 3), "beats": beats}, open(os.path.join(HERE, "voice", f["id"] + ".json"), "w"), indent=1)
    print(f["id"], round(t, 1), "s", [round(b["end"] - b["start"], 1) for b in beats])
