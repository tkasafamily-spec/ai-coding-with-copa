import sys, glob, subprocess, numpy as np, soundfile as sf
sys.path.insert(0, "/home/user/vt/wi"); from lines import LINES
import librosa
SR = 44100
def trim(a, sr, thr=0.012):
    i = np.where(np.abs(a) > thr)[0]
    return a if len(i) == 0 else a[max(0, i[0] - int(0.01 * sr)): i[-1] + int(0.04 * sr)]
words = sum(len(l.split()) for l in LINES)
out_all = []
for n in "ABCDEFG":
    parts = []; speech = 0
    for i in range(len(LINES) + 1):
        a, sr = sf.read(f"{n}_{i:02d}.wav", dtype="float32")
        if a.ndim > 1: a = a.mean(1)
        a = librosa.resample(trim(a, sr), orig_sr=sr, target_sr=SR); 
        txt = "x." if i == 0 else LINES[i - 1]
        gap = 0.6 if i == 0 else (0.45 if txt.endswith("?") else 0.22 if len(txt.split()) <= 1 else 0.3)
        if i > 0: speech += len(a) / SR + gap
        parts += [a, np.zeros(int(gap * SR), np.float32)]
    raw = np.concatenate(parts); sf.write(f"raw_{n}.wav", raw, SR)
    # the "Shorts voice" chain: cut rumble, warm low end, presence boost, compression, loudness
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f"raw_{n}.wav", "-af",
        "highpass=f=80,equalizer=f=140:t=q:w=1:g=3,equalizer=f=3500:t=q:w=1.2:g=3.5,equalizer=f=9000:t=q:w=1:g=2,"
        "acompressor=threshold=-20dB:ratio=4:attack=5:release=60:makeup=4,loudnorm=I=-14:TP=-1.5:LRA=7", "-ar", str(SR), "-ac", "1", f"proc_{n}.wav"], check=True)
    y, _ = sf.read(f"proc_{n}.wav", dtype="float32"); out_all += [y, np.zeros(int(1.0 * SR), np.float32)]
    y16 = librosa.resample(y, orig_sr=SR, target_sr=16000); f0, _, _ = librosa.pyin(y16, fmin=60, fmax=400, sr=16000); f0 = f0[~np.isnan(f0)]
    print(n, "pace", round(words / speech * 60), "wpm  pitch", int(np.median(f0)), "Hz  expressiveness", round(float(np.std(12 * np.log2(f0 / np.median(f0)))), 2), " length", round(speech, 1), "s")
sf.write("sampler.wav", np.concatenate(out_all), SR)
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "sampler.wav", "-b:a", "160k", "/home/user/ai-coding-with-copa/shorts-studio/looks/what-if-voice-sampler.mp3"], check=True)
