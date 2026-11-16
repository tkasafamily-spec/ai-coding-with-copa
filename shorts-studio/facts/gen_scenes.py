"""AI cartoon scenes for v2 Shorts (Pollinations, free)."""
import json, os, subprocess, sys, time, urllib.parse, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
data = json.loads(subprocess.run(["node", "-e", "const m=require(process.argv[1]);process.stdout.write(JSON.stringify(m))", os.path.join(HERE, "v2.js")], capture_output=True, text=True, check=True).stdout)
only = sys.argv[1:]
for f in data["V2"]:
    for k, b in enumerate(f["beats"]):
        out = os.path.join(HERE, "images2", f"{f['id']}-{k}.jpg")
        key = f"{f['id']}-{k}"
        if only and key not in only and f["id"] not in only: continue
        if os.path.exists(out) and not only: continue
        seed = 100 + k + (37 if only else 0)
        url = "https://image.pollinations.ai/prompt/" + urllib.parse.quote(f"{data['STYLE']}: {b['scene']}") + f"?width=576&height=1024&nologo=true&seed={seed}"
        for t in range(10):
            try:
                d = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "ShortsStudioBot/1.0"}), timeout=120).read()
                if len(d) > 5000: open(out, "wb").write(d); print("got", key, flush=True); break
            except Exception as e: time.sleep(8)
        time.sleep(2)
