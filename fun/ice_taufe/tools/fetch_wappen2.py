# -*- coding: utf-8 -*-
"""Second pass: for entries without a wappen, scan the article's image list."""
import json, sys, io, time, urllib.parse, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

entries = json.load(open("entries_wappen.json", encoding="utf-8"))
missing = [e for e in entries if not e.get("wappen") and e.get("link")]
print(len(missing), "missing")

API = "https://de.wikipedia.org/w/api.php"
HDRS = {"User-Agent": "ICE-Taufe-Collector/1.0 (personal project)"}

def api(params):
    qs = urllib.parse.urlencode(params)
    req = urllib.request.Request(API + "?" + qs, headers=HDRS)
    for attempt in range(6):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = 5 * (attempt + 1)
                print("429, waiting", wait)
                time.sleep(wait)
            else:
                raise
    raise SystemExit("too many 429s")

KEYS = ("wappen", "coa", "coat_of_arms", "coat of arms", "blason", "stemma", "escudo")
BAD = ("flag", "flagge", "karte", "map", "logo")

def score(f):
    fl = f.lower()
    if not any(k in fl for k in KEYS):
        return -1
    s = 0
    if fl.endswith(".svg"): s += 2
    if any(b in fl for b in BAD): s -= 3
    return s

title_file = {}
for i in range(0, len(missing), 10):
    batch = [e["link"] for e in missing[i:i+10]]
    data = api({"action": "query", "format": "json", "redirects": 1,
                "titles": "|".join(batch), "prop": "images", "imlimit": "500"})
    q = data.get("query", {})
    rmap = {}
    for rd in q.get("redirects", []) + q.get("normalized", []):
        rmap[rd["to"]] = rd["from"]
    for p in q.get("pages", {}).values():
        t = p.get("title")
        orig = rmap.get(t, t)
        imgs = [im["title"] for im in p.get("images", [])]
        best, bs = None, -1
        for im in imgs:
            sc = score(im)
            if sc > bs:
                best, bs = im, sc
        if best and bs >= 0:
            title_file[orig] = best
            title_file[t] = best
    time.sleep(1.5)

print("candidates:", len(set(title_file.values())))
# resolve thumbnails
files = sorted(set(title_file.values()))
file_url = {}
for i in range(0, len(files), 40):
    batch = files[i:i+40]
    data = api({"action": "query", "format": "json", "titles": "|".join(batch),
                "prop": "imageinfo", "iiprop": "url", "iiurlwidth": 160})
    for p in data.get("query", {}).get("pages", {}).values():
        ii = p.get("imageinfo", [{}])[0]
        if ii.get("thumburl"):
            file_url[p["title"]] = ii["thumburl"]
    time.sleep(1.5)

fixed = 0
for e in missing:
    f = title_file.get(e["link"])
    if f and f in file_url:
        e["wappen"] = file_url[f]
        fixed += 1
        print("OK ", e["name"], "->", f)
    else:
        print("--- ", e["name"])

print("fixed:", fixed)
total = sum(1 for e in entries if e.get("wappen"))
print("total wappen:", total, "/", len(entries))
json.dump(entries, open("entries_wappen.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
