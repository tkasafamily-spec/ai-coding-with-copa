"""Depth maps for the AI scenes (Depth Anything V2 Small, Apache-2.0) so the renderer can move a 3D camera through them.
Run with the Chatterbox environment (it has PyTorch):  python depth.py"""
import os, sys, glob
import numpy as np, torch
from PIL import Image, ImageFilter
from transformers import pipeline
HERE = os.path.dirname(os.path.abspath(__file__))
pipe = pipeline("depth-estimation", model="depth-anything/Depth-Anything-V2-Small-hf", device="cpu")
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "images2")
for f in sorted(glob.glob(os.path.join(src, "*.jpg"))):
    out = f[:-4] + ".depth.png"
    if f.endswith(".depth.png") or (os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(f)): continue
    im = Image.open(f).convert("RGB")
    d = np.array(pipe(im)["depth"], dtype=np.float32)
    d = (d - d.min()) / (d.max() - d.min() + 1e-6)
    Image.fromarray((d * 255).astype(np.uint8)).resize(im.size).filter(ImageFilter.GaussianBlur(3)).save(out)
    print("depth", os.path.basename(f), flush=True)
