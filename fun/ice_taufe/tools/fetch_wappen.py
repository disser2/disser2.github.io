# -*- coding: utf-8 -*-
"""Fetch coat-of-arms thumbnails for each entry's Wikipedia article via PageImages."""
import json, re, sys, io, time, urllib.parse, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

entries = json.load(open("entries.json", encoding="utf-8"))
titles = sorted({e["link"] for e in entries if e.get("link")})
print(len(titles), "titles")

API = "https://de.wikipedia.org/w/api.php"
HDRS = {"User-Agent": "ICE-Taufe-Collector/1.0 (personal project)"}

def api(params):
    qs = urllib.parse.urlencode(params)
    req = urllib.request.Request(API + "?" + qs, headers=HDRS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)

result = {}   # title -> {"img": url, "file": name}
redirect_map = {}
for i in range(0, len(titles), 50):
    batch = titles[i:i+50]
    data = api({
        "action": "query", "format": "json", "redirects": 1,
        "titles": "|".join(batch),
        "prop": "pageimages", "piprop": "thumbnail|name", "pithumbsize": 160,
    })
    q = data.get("query", {})
    for rd in q.get("redirects", []):
        redirect_map[rd["to"]] = rd["from"]
    for rd in q.get("normalized", []):
        redirect_map[rd["to"]] = rd["from"]
    for p in q.get("pages", {}).values():
        t = p.get("title")
        orig = redirect_map.get(t, t)
        thumb = p.get("thumbnail", {}).get("source")
        name = p.get("pageimage", "")
        if thumb:
            result[orig] = {"img": thumb, "file": name}
            if t != orig:
                result[t] = {"img": thumb, "file": name}
    time.sleep(0.3)
    print("batch", i, "done")

def is_wappen(filename):
    f = filename.lower()
    return any(k in f for k in ("wappen", "coa", "coat_of_arms", "coat of arms",
                                "blason", "escudo", "stemma", "crest"))

got, photo, none = 0, [], []
for e in entries:
    t = e.get("link")
    r = result.get(t)
    if r and is_wappen(r["file"]):
        e["wappen"] = r["img"]
        got += 1
    else:
        e["wappen"] = None
        (photo if r else none).append((e["name"], r["file"] if r else "-"))

print("wappen found:", got, "/", len(entries))
print("pageimage not a wappen:")
for n, f in photo:
    print("  ", n, "->", f)
print("no pageimage:", [n for n, _ in none])
json.dump(entries, open("entries_wappen.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
