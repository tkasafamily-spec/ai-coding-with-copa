"""Free sound effects + music, synthesised from scratch (no downloads, no licences to worry about).
python3 sound.py events.json voice.mp3 out.wav"""
import json, subprocess, sys
import numpy as np

SR = 44100
rng = np.random.default_rng(1)
t_ = lambda d: np.arange(int(d * SR)) / SR
def env(n, a=0.005, r=0.1):
    e = np.ones(n); na, nr = int(a * SR), int(r * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nr: e[-nr:] *= np.linspace(1, 0, min(nr, n))
    return e
def lp(x, k):  # simple low-pass
    y = np.copy(x); a = k
    for i in range(1, len(y)): y[i] = y[i - 1] + a * (x[i] - y[i - 1])
    return y
def fastlp(x, win):  # moving-average low-pass (fast)
    if win <= 1: return x
    c = np.convolve(x, np.ones(win) / win, mode="same"); return c
def noise(d): return rng.uniform(-1, 1, int(d * SR))
def tone(f, d, shape="sine"):
    t = t_(d); ph = 2 * np.pi * np.cumsum(np.broadcast_to(f, t.shape)) / SR if np.ndim(f) else 2 * np.pi * f * t
    if shape == "sine": return np.sin(ph)
    if shape == "square": return np.sign(np.sin(ph))
    if shape == "saw": return 2 * ((ph / (2 * np.pi)) % 1) - 1
    if shape == "tri": return 2 * np.abs(2 * ((ph / (2 * np.pi)) % 1) - 1) - 1

def whoosh(d=0.45):
    n = noise(d); t = t_(d); out = np.zeros_like(n)
    for k in range(6):  # sweep band
        w = int(np.interp(k, [0, 5], [40, 6])); seg = slice(int(k * len(n) / 6), int((k + 1) * len(n) / 6)); out[seg] = fastlp(n, w)[seg]
    return out * np.sin(np.pi * t / d) ** 2 * 1.4
def pop(): t = t_(0.12); return np.sin(2 * np.pi * (900 * np.exp(-t * 30) + 200) * t) * np.exp(-t * 35)
def confetti(): return _sparkle()
def _sparkle():
    out = np.zeros(int(0.8 * SR))
    for k in range(14):
        f = rng.uniform(2500, 5200); st = int(rng.uniform(0, 0.55) * SR); s = np.sin(2 * np.pi * f * t_(0.12)) * np.exp(-t_(0.12) * 40) * 0.25
        out[st:st + len(s)] += s
    p = pop(); out[: len(p)] += p
    return out
def cheer(d=1.6):
    n = noise(d); x = fastlp(n, 6) - fastlp(n, 60)
    am = 1 + 0.4 * np.sin(2 * np.pi * 7 * t_(d)) * rng.uniform(0.5, 1)
    return x * am * env(len(x), 0.15, 0.7) * 2.2
def step(): t = t_(0.07); return (fastlp(noise(0.07), 8) * 0.8 + np.sin(2 * np.pi * 110 * t) * 0.6) * np.exp(-t * 60)
def tick(): t = t_(0.03); return np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 200) * 0.8
def splash(d=0.5): n = noise(d); return (fastlp(n, 3) * 0.7 + fastlp(n, 12) * 0.5) * np.exp(-t_(d) * 7) * np.minimum(1, t_(d) * 80)
def spray(d=1.6): n = noise(d); return (n - fastlp(n, 4)) * 0.5 * env(len(n), 0.05, 0.3)
def scratch():
    t = t_(0.35); f = 600 + 900 * np.sin(np.pi * t / 0.35); return (tone(f, 0.35, "saw") * 0.4 + noise(0.35) * 0.3) * env(len(t), 0.01, 0.08)
def ding(): t = t_(1.0); return (np.sin(2 * np.pi * 1568 * t) + 0.5 * np.sin(2 * np.pi * 2352 * t) + 0.25 * np.sin(2 * np.pi * 3136 * t)) * np.exp(-t * 4) * 0.5
def boing(): t = t_(0.5); f = 180 + 220 * np.exp(-t * 6) * (1 + 0.5 * np.sin(2 * np.pi * 14 * t)); return tone(f, 0.5) * np.exp(-t * 5)
def squeak():
    t = t_(0.28); f = 1700 + 900 * np.sin(np.pi * t / 0.28) + 120 * np.sin(2 * np.pi * 38 * t)
    return (tone(f, 0.28) * 0.7 + tone(f * 2, 0.28) * 0.2) * env(len(t), 0.01, 0.06)
def beep(): t = t_(0.16); return tone(1000, 0.16, "square") * 0.35 * env(len(t), 0.004, 0.02)
def horn(d=0.9): return (tone(233, d, "saw") + tone(277, d, "saw") * 0.8 + tone(349, d, "saw") * 0.6) * 0.3 * env(int(d * SR), 0.02, 0.15)
def cash():
    t = t_(0.9); bell = (np.sin(2 * np.pi * 2093 * t) + 0.6 * np.sin(2 * np.pi * 2637 * t) + 0.4 * np.sin(2 * np.pi * 3136 * t)) * np.exp(-t * 3.5) * 0.45
    ch = np.zeros_like(t); c = fastlp(noise(0.08), 2) * np.exp(-t_(0.08) * 40); ch[: len(c)] += c * 0.8; ch[int(0.09 * SR): int(0.09 * SR) + len(c)] += c * 0.6
    return bell + ch
def zoom(d=0.35): t = t_(d); return (tone(300 + 1500 * (t / d) ** 2, d) * 0.4 + whoosh(d) * 0.5) * env(len(t), 0.01, 0.05)
def sting():
    out = np.zeros(int(1.2 * SR))
    for k, f in enumerate([523, 659, 784, 1047]):
        st = int(k * 0.08 * SR); s = (tone(f, 0.9, "tri") * 0.5 + tone(f * 2, 0.9) * 0.15) * np.exp(-t_(0.9) * 3); out[st:st + len(s)] += s
    return out * 0.7
def whistle(d=0.75): t = t_(d); return tone(2200 - 1500 * (t / d), d) * 0.35 * env(len(t), 0.02, 0.05)
def bubbles(d=1.4):
    out = np.zeros(int(d * SR))
    for k in range(18):
        st = int(rng.uniform(0, d - 0.1) * SR); f0 = rng.uniform(300, 900); tt = t_(0.07)
        b = np.sin(2 * np.pi * (f0 + 1800 * tt) * tt) * np.exp(-tt * 50) * 0.35; out[st:st + len(b)] += b
    return out
def thunder(d=2.0): n = noise(d); return (fastlp(n, 40) * 3 + fastlp(n, 12)) * np.exp(-t_(d) * 1.8) * np.minimum(1, t_(d) * 30)
def honk(): t = t_(0.25); return (tone(380 + 40 * np.sin(2 * np.pi * 9 * t), 0.25, "saw") * 0.4 + tone(760, 0.25, "square") * 0.1) * env(len(t), 0.01, 0.05)
def poof(): n = noise(0.35); return fastlp(n, 10) * np.exp(-t_(0.35) * 9) * 1.4
def rumble(d=1.2): n = noise(d); return fastlp(n, 60) * 6 * env(len(n), 0.05, 0.4)
def crumble(d=0.6): n = noise(d); x = fastlp(n, 20) * 3 + (n - fastlp(n, 3)) * 0.2; return x * np.exp(-t_(d) * 5)
def click(): t = t_(0.05); return (np.sin(2 * np.pi * 1800 * t) * 0.5 + noise(0.05) * 0.3) * np.exp(-t * 120)
def alarm(d=1.0): t = t_(d); return tone(700 + 300 * np.sign(np.sin(2 * np.pi * 4 * t)), d, "square") * 0.2 * env(len(t), 0.01, 0.1)
def rocket(d=1.4): n = noise(d); return (fastlp(n, 8) * 1.2 + fastlp(n, 50) * 3) * env(len(n), 0.05, 0.3)
def munch(): t = t_(0.18); return fastlp(noise(0.18), 4) * (np.sin(np.pi * t / 0.18) ** 2) * 0.8
def snore(d=1.2): t = t_(d); return fastlp(noise(d), 30) * 3 * np.sin(np.pi * t / d) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 40 * t))
def magic(d=1.0):
    out = np.zeros(int(d * SR))
    for k, f in enumerate([1047, 1319, 1568, 2093, 2637]):
        st = int(k * 0.07 * SR); s = tone(f, 0.5) * np.exp(-t_(0.5) * 6) * 0.25; out[st:st + len(s)] += s
    return out
def fireworks(): return poof() * 0.6 + _sparkle()
def impact(d=1.2):
    t = t_(d); boom = np.sin(2 * np.pi * (45 + 60 * np.exp(-t * 12)) * t) * np.exp(-t * 3.5)
    hit = fastlp(noise(d), 3) * np.exp(-t * 30) * 0.8
    return (boom * 1.3 + hit) * 0.9
def stamp(): t = t_(0.4); return (fastlp(noise(0.4), 6) * np.exp(-t * 25) * 1.2 + np.sin(2 * np.pi * 90 * t) * np.exp(-t * 18)) * 0.9
def ticks(d=1.1):
    out = np.zeros(int(d * SR)); tt = 0.0; gap = 0.035
    while tt < d - 0.03:
        c = tick() * 0.6; st = int(tt * SR); out[st:st + len(c)] += c; tt += gap; gap *= 1.07
    return out
def swish(d=0.3): return whoosh(d) * 0.8
def riser(d=1.5): t = t_(d); return (fastlp(noise(d), 4) * (t / d) ** 2 + tone(200 + 600 * (t / d) ** 2, d) * 0.15 * (t / d)) * 0.8
def music_doc(d, bpm=96):
    """Dark, driving documentary bed: pulsing bass, soft kick, minor pads. Original, royalty-free."""
    beat = 60 / bpm; n = int(d * SR); out = np.zeros(n + 2 * SR)
    prog = [(110.0, [220.0, 261.6, 329.6]), (87.3, [174.6, 220.0, 261.6]), (130.8, [196.0, 261.6, 329.6]), (98.0, [196.0, 246.9, 293.7])]
    b = 0; t = 0.0
    while t < d:
        root, chord = prog[(b // 8) % 4]; st = int(t * SR)
        if b % 4 in (0, 2):
            k = np.sin(2 * np.pi * (48 + 70 * np.exp(-t_(0.25) * 25)) * t_(0.25)) * np.exp(-t_(0.25) * 12) * 0.8; out[st:st + len(k)] += k
        for e in (0, 0.5):
            es = int((t + e * beat) * SR); ln = beat * 0.45
            bs = fastlp(tone(root, ln, "saw"), 12) * env(int(ln * SR), 0.005, 0.08) * 0.35; out[es:es + len(bs)] += bs
            h = (noise(0.03) - fastlp(noise(0.03), 3)) * np.exp(-t_(0.03) * 120) * (0.10 if e else 0.05); out[es:es + len(h)] += h
        if b % 8 == 0:
            pl = beat * 8; pad = sum(fastlp(tone(f, pl, "saw"), 30) for f in chord) * env(int(pl * SR), 0.6, 0.8) * 0.06; seg_ = out[st:st + len(pad)]; seg_ += pad[:len(seg_)]
        b += 1; t += beat
    o = out[:n]; return o * env(n, 0.2, 0.8)
LIB = {k: v for k, v in globals().items() if k in "impact stamp ticks swish riser whoosh pop confetti cheer step tick splash spray scratch ding boing squeak beep horn cash zoom sting whistle bubbles thunder honk poof rumble crumble click alarm rocket munch snore magic fireworks".split()}

def music(d, bpm=124):
    """Bouncy chiptune-ish loop: bass, chords, hats, kick. Original, royalty-free."""
    beat = 60 / bpm; n = int(d * SR); out = np.zeros(n + SR)
    prog = [(261.6, [261.6, 329.6, 392.0]), (220.0, [220.0, 261.6, 329.6]), (174.6, [174.6, 220.0, 261.6]), (196.0, [196.0, 246.9, 293.7])]
    melody = [784, 659, 784, 880, 784, 659, 587, 523, 659, 587, 523, 440, 523, 587, 659, 587]
    b = 0; t = 0.0
    while t < d:
        root, chord = prog[(b // 4) % 4]
        st = int(t * SR)
        k = np.sin(2 * np.pi * (55 + 90 * np.exp(-t_(0.18) * 30)) * t_(0.18)) * np.exp(-t_(0.18) * 18) * 0.9  # kick
        out[st:st + len(k)] += k
        bs = tone(root / 2, beat * 0.9, "tri") * env(int(beat * 0.9 * SR), 0.005, 0.05) * 0.45; out[st:st + len(bs)] += bs
        for half in (0, 0.5):  # hats
            hs = int((t + half * beat) * SR); h = (noise(0.04) - fastlp(noise(0.04), 3)) * np.exp(-t_(0.04) * 90) * 0.18; out[hs:hs + len(h)] += h
        if b % 2 == 1:  # chord stab on the off-beat
            stab = sum(tone(f, beat * 0.4, "square") for f in chord) * env(int(beat * 0.4 * SR), 0.005, 0.08) * 0.05
            cs = int((t + 0.0) * SR); out[cs:cs + len(stab)] += stab
        for half in (0, 0.5):  # plucky melody
            mf = melody[(b * 2 + int(half * 2)) % len(melody)]; ms = int((t + half * beat) * SR)
            pl = tone(mf, beat * 0.45, "tri") * np.exp(-t_(beat * 0.45) * 9) * 0.12; out[ms:ms + len(pl)] += pl
        b += 1; t += beat
    o = out[:n]
    return o * env(n, 0.3, 0.6)

def load(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True).stdout
    return np.frombuffer(raw, np.float32).copy()

if __name__ == "__main__":
    ev = json.load(open(sys.argv[1])); voice = load(sys.argv[2]); out = sys.argv[3]
    n = int((ev["duration"] + 0.3) * SR)
    fxbus = np.zeros(n + 3 * SR)
    for e in ev["events"]:
        s = LIB[e["name"]]() * e.get("vol", 1); st = int(e["t"] * SR); fxbus[st:st + len(s)] += s * 0.55
    fxbus = fxbus[:n]
    mus = music_doc(n / SR) if ev.get("music") == "doc" else music(n / SR)
    v = np.zeros(n); v[: min(n, len(voice))] = voice[:n]
    # duck music under the voice
    venv = fastlp(np.abs(v), 2205); duck = 1 - 0.55 * np.clip(venv / (venv.max() + 1e-9) * 3, 0, 1)
    mix = v * 1.0 + fxbus * 0.8 + mus * 0.16 * duck
    mix = np.tanh(mix * 1.1) / np.tanh(1.1)  # soft limiter
    pcm = (np.clip(mix, -1, 1) * 32767).astype(np.int16)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "s16le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", str(SR), "-ac", "2", out], input=pcm.tobytes(), check=True)
    print("mixed", out)
