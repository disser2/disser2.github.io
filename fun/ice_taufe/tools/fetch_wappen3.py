# -*- coding: utf-8 -*-
"""Third pass: curated candidate filenames, validated against the API."""
import json, sys, io, time, urllib.parse, urllib.request, urllib.error
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

entries = json.load(open("entries_wappen.json", encoding="utf-8"))

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
                time.sleep(5 * (attempt + 1))
            else:
                raise
    raise SystemExit("429s")

CAND = {
    "Berlin": ["Coat of arms of Berlin.svg", "DEU Berlin COA.svg"],
    "Amsterdam": ["Wapen van Amsterdam.svg", "Coat of arms of Amsterdam.svg"],
    "Zwickau": ["Wappen Zwickau.svg", "DEU Zwickau COA.svg"],
    "Paris": ["Grandes Armes de Paris.svg", "Armoiries de Paris.svg", "Blason paris 75.svg"],
    "Schaffhausen": ["Wappen Schaffhausen.svg", "CHE Schaffhausen COA.svg"],
    "Wien": ["Coat of arms of Vienna.svg", "Wien 3 Wappen.svg", "AUT Wien COA.svg"],
    "Steiermark": ["Steiermark Wappen.svg", "AUT Steiermark COA.svg"],
    "Interlaken": ["Interlaken-coat of arms.svg", "CHE Interlaken COA.svg", "Wappen Interlaken.svg"],
    "Forbach-Lorraine": ["Blason Forbach 57.svg", "Blason de la ville de Forbach (Moselle).svg",
                         "Blason ville fr Forbach (Moselle).svg"],
    "Martin Luther": ["Lutherrose.svg"],
    "Wetterau": ["Wappen Wetteraukreis.svg", "DEU Wetteraukreis COA.svg"],
    "Waldecker Land": ["DEU Landkreis Waldeck-Frankenberg COA.svg", "Wappen Landkreis Waldeck-Frankenberg.svg"],
    "Ostseebad Warnemünde": ["Wappen Warnemuende.svg", "Warnemünde Wappen.svg", "Wappen Rostock.svg"],
    # remove wrong/questionable second-pass hits, then retry with candidates or none
    "Bodetal": [],
}

# collect all candidate files, resolve existence + thumburl in batches
allfiles = sorted({("Datei:" + f) for lst in CAND.values() for f in lst})
file_url = {}
for i in range(0, len(allfiles), 40):
    batch = allfiles[i:i+40]
    data = api({"action": "query", "format": "json", "titles": "|".join(batch),
                "prop": "imageinfo", "iiprop": "url", "iiurlwidth": 160})
    q = data.get("query", {})
    rmap = {}
    for rd in q.get("normalized", []):
        rmap[rd["to"]] = rd["from"]
    for p in q.get("pages", {}).values():
        ii = p.get("imageinfo", [{}])[0] if p.get("imageinfo") else {}
        t = p.get("title")
        orig = rmap.get(t, t)
        if ii.get("thumburl"):
            file_url[orig] = ii["thumburl"]
            file_url[t] = ii["thumburl"]
    time.sleep(1)

for e in entries:
    if e["name"] in CAND:
        e["wappen"] = None
        for f in CAND[e["name"]]:
            u = file_url.get("Datei:" + f)
            if u:
                e["wappen"] = u
                print("OK ", e["name"], "->", f)
                break
        if not e["wappen"]:
            print("--- ", e["name"])

total = sum(1 for e in entries if e.get("wappen"))
print("total wappen:", total, "/", len(entries))
print("still missing:", [e["name"] for e in entries if not e.get("wappen")])
json.dump(entries, open("entries_wappen.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
