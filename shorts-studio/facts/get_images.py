"""Downloads the pictures used in the Shorts from Wikimedia Commons and writes credits.json."""
import hashlib, json, os, re, time, urllib.parse, urllib.request, io
from PIL import Image
UA = {"User-Agent": "ShortsStudioBot/1.0 (educational; python-urllib)"}
HERE = os.path.dirname(os.path.abspath(__file__))
PICS = {
  "apple1a": "File:2019-08-04 Apple I computer.jpg",
  "apple1b": "File:Apple-1, 1976, Computer History Museum.jpg",
  "apple1c": "File:Apple I (1976) - Computer History Museum.jpg",
  "applelogo": "File:Apple I (1976) - Computer History Museum (2007-11-10 21.24.37 by Carlo Nardone).jpg",
  "applepark": "File:Apple Park aerial view, June 2024.jpg",
  "blockstore": "File:Anchorage Blockbuster video store (41894010352).jpg",
  "blockstore2": "File:Anchorage Blockbuster video store (41894012562).jpg",
  "netflixenv": "File:Netflix envelope (2655128664).jpg",
  "hastings": "File:Reed Hastings 2010 A.jpg",
  "blockclose": "File:Blockbuster store closing (5207565912).jpg",
  "lastblock": "File:The Last Blockbuster storefront.jpg",
  "cokead": "File:The Boston Cooking School magazine of culinary science and domestic economics (1913) (14591984858).jpg",
  "cokead2": "File:Cocacola-5cents-1900 edit1.jpg",
  "pemberton": "File:Coca Cola First Advertisements.jpg",
  "fountain": "File:1915 - Palace Pharmacy.jpg",
  "cokebottles": "File:Coca-Cola Bottles Alaska 2010.jpg",
  "hanafuda": "File:Hanafuda Koi-Koi Setup 1.jpg",
  "hanafuda2": "File:Mushibana by Nintendo (early Shōwa era).jpg",
  "gamewatch": "File:Game&watch-donkey-kong-2.jpg",
  "eiffel": "File:Tour Eiffel Citroen.jpg",
  "lustig": "File:Victor Lustig Mugshot.jpeg",
  "eiffel2": "File:Tour Eiffel autochrome collection Albert Kahn museum.jpg",
  "alcatraz": "File:Alcatraz recreation yard, NW view.jpg",
  "playdoh": "File:Play-doh (3757135606).jpg",
  "playdoh2": "File:Play-Doh.jpg",
  "wallpaper": "File:Dining Room, Glessner House, Prairie Avenue and 18th Street, Near South Side, Chicago, IL.jpg",
  "coal": "File:French antique enamel Rivola stove.jpg",
}
def get(url):
    for k in range(200):
        try: return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60).read()
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(int(e.headers.get("retry-after", "15")) + 4); continue
            raise
    raise RuntimeError("rate limited: " + url)
strip = lambda h: re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", h or "")).strip()
titles = list(dict.fromkeys(PICS.values()))
meta = {}
for i in range(0, len(titles), 40):
    q = urllib.parse.urlencode({"action": "query", "titles": "|".join(titles[i:i + 40]), "prop": "imageinfo", "iiprop": "url|extmetadata|size", "format": "json"})
    d = json.loads(get("https://commons.wikimedia.org/w/api.php?" + q))
    norm = {n["to"]: n["from"] for n in d["query"].get("normalized", [])}
    for p in d["query"]["pages"].values():
        if "imageinfo" not in p: print("MISSING", p.get("title")); continue
        meta[norm.get(p["title"], p["title"])] = p["imageinfo"][0]
os.makedirs(os.path.join(HERE, "images"), exist_ok=True)
credits = {}
for tag, title in PICS.items():
    ii = meta.get(title); out = os.path.join(HERE, "images", tag + ".jpg")
    if not ii: print("no meta", tag); continue
    m = ii["extmetadata"]
    credits[tag] = {"file": title, "author": strip(m.get("Artist", {}).get("value")) or "Unknown", "license": m.get("LicenseShortName", {}).get("value", ""), "url": ii["descriptionurl"]}
    if os.path.exists(out): continue
    src = ii["url"].split("?")[0]; name = src.split("/")[-1]; tries = []
    for w in (960,):
        if ii["width"] > w: tries.append(src.replace("/commons/", "/commons/thumb/") + f"/{w}px-{name}")
    tries.append(src)
    data = None
    for u in tries:
        try: data = get(u); break
        except urllib.error.HTTPError as e: print("  ", e.code, u[-60:])
    img = Image.open(io.BytesIO(data)).convert("RGB")
    if img.width > 1600: img.thumbnail((1600, 1600 * img.height // img.width))
    img.save(out, quality=92); print("got", tag, img.size, credits[tag]["license"], flush=True); time.sleep(4)
json.dump(credits, open(os.path.join(HERE, "credits.json"), "w"), indent=1, ensure_ascii=False)
print("credits", len(credits))
