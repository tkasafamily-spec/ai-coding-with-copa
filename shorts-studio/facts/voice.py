"""Free, expressive voiceovers for the fact Shorts, made with Chatterbox (MIT licence).
Run with the Chatterbox environment:  python voice.py [fact-id ...]
Writes voice/<id>.mp3 and voice/<id>.json (when each beat starts and ends)."""
import json, os, subprocess, sys, re
import numpy as np, torch, torchaudio as ta
from chatterbox.tts import ChatterboxTTS

HERE = os.path.dirname(os.path.abspath(__file__))
FACTS = json.loads(subprocess.run(["node", "-e", "process.stdout.write(JSON.stringify(require(process.argv[1]).FACTS))", os.path.join(HERE, "facts.js")], capture_output=True, text=True, check=True).stdout)
only = sys.argv[1:]
torch.set_num_threads(4)
model = ChatterboxTTS.from_pretrained(device="cpu")
SR = model.sr
EXAGGERATION, CFG, SPEED, GAP = 0.6, 0.5, 1.06, 0.16

def trim(w, thr=0.01):
    idx = np.where(np.abs(w) > thr)[0]
    return w if len(idx) == 0 else w[max(0, idx[0] - int(0.02 * SR)): idx[-1] + int(0.08 * SR)]

for f in FACTS:
    if only and f["id"] not in only: continue
    parts, beats, t = [], [], 0.05
    parts.append(np.zeros(int(0.05 * SR), dtype=np.float32))
    for k, b in enumerate(f["beats"]):
        text = b.get("speak", b["say"]).replace("…", "...")
        torch.manual_seed(1000 + k)
        w = model.generate(text, exaggeration=EXAGGERATION, cfg_weight=CFG).squeeze(0).numpy()
        w = trim(w)
        dur = len(w) / SR / SPEED
        beats.append({"say": b["say"], "start": round(t, 3), "end": round(t + dur, 3)})
        parts += [w, np.zeros(int(GAP * SR * SPEED), dtype=np.float32)]
        t += dur + GAP
        print(f["id"], k, round(dur, 2), text[:50], flush=True)
    audio = np.concatenate(parts)
    tmp = os.path.join(HERE, "voice", f["id"] + "-raw.wav")
    ta.save(tmp, torch.from_numpy(audio).unsqueeze(0), SR)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", f"atempo={SPEED},loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", "44100", "-ac", "1", "-b:a", "192k", os.path.join(HERE, "voice", f["id"] + ".mp3")], check=True)
    os.remove(tmp)
    json.dump({"duration": round(t + 0.3, 3), "beats": beats}, open(os.path.join(HERE, "voice", f["id"] + ".json"), "w"), indent=1)
