"""15 visual styles for the channel, same scene each time (free AI images from Pollinations)."""
import urllib.parse, urllib.request, time, os, sys
from PIL import Image, ImageDraw, ImageFont
SCENE = "a shocked man with big glasses and 1970s clothes holding a paper check in a garage workshop, old computer on the desk, money flying"
LOOKS = [
  ("3D Cartoon", "3D Pixar style animated cartoon, big expressive eyes, vibrant colors"),
  ("90s Cartoon", "1990s Saturday morning cartoon, flat colors, thick black outlines"),
  ("90s Anime", "1990s retro anime cel art"),
  ("Comic Book", "vintage comic book panel, halftone dots, bold ink"),
  ("Claymation", "claymation stop motion plasticine"),
  ("Pixel Art", "16-bit pixel art"),
  ("90s VHS", "1990s VHS camcorder footage still, scan lines, color bleed"),
  ("Old Newspaper", "old newspaper engraving illustration, sepia ink crosshatching"),
  ("Doodle", "funny stick figure doodle, black marker on white paper"),
  ("Paper Cutout", "paper cutout collage art, layered craft paper"),
  ("Low Poly", "low poly 3D render, flat shaded"),
  ("Storybook", "watercolor storybook illustration"),
  ("Film Noir", "black and white film noir, hard shadows"),
  ("Synthwave 80s", "1980s synthwave neon art, pink and cyan glow"),
  ("Realistic", "photorealistic cinematic film still"),
]
UA = {"User-Agent": "ShortsStudioBot/1.0"}
os.makedirs("img", exist_ok=True)
for i, (name, style) in ([] if "--sheet" in sys.argv else enumerate(LOOKS, 1)):
    out = f"img/{i:02d}.jpg"
    if os.path.exists(out) and os.path.getsize(out) > 5000: continue
    url = "https://image.pollinations.ai/prompt/" + urllib.parse.quote(f"{style}: {SCENE}") + "?width=576&height=1024&model=flux&nologo=true&seed=42"
    for k in range(6):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()
            if len(data) > 5000: open(out, "wb").write(data); print(i, name, len(data), flush=True); break
        except Exception as e: print("retry", i, e, flush=True); time.sleep(10)
    time.sleep(3)
# labelled contact sheet
font = ImageFont.truetype("/home/user/ai-coding-with-copa/shorts-studio/animator/node_modules/@fontsource/montserrat/files/montserrat-latin-900-normal.woff2", 34) if False else None
try: font = ImageFont.truetype("DejaVuSans-Bold.ttf", 34)
except Exception: font = ImageFont.load_default()
W, H = 360, 640
sheet = Image.new("RGB", (W * 5, (H + 60) * 3), (12, 12, 16)); dr = ImageDraw.Draw(sheet)
for i, (name, _) in enumerate(LOOKS, 1):
    try: im = Image.open(f"img/{i:02d}.jpg").convert("RGB"); im = im.crop((0, 0, im.width, int(im.height * 0.95))).resize((W, H))
    except Exception: continue
    x, y = ((i - 1) % 5) * W, ((i - 1) // 5) * (H + 60)
    sheet.paste(im, (x, y)); dr.text((x + 12, y + H + 10), f"{i}. {name}", fill=(255, 210, 58), font=font)
sheet.save("15-looks.jpg", quality=88)
print("sheet done")
