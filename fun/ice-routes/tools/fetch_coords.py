# -*- coding: utf-8 -*-
"""Holt die Koordinaten aller Bahnhoefe aus der Wikipedia-API -> coords.json.

Eingabe : stations.json (von parse_lines.py, enthaelt den Artikelnamen "wt")
Ausgabe : coords.json   { "<Bahnhofs-ID>": [lat, lon], ... }

Danach parse_lines.py erneut laufen lassen - die Koordinaten landen dann in data.js.
"""
import io, json, os, sys, time, urllib.parse, urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
API = "https://de.wikipedia.org/w/api.php"
UA = "ice-routes-tracker/1.0 (privates Hobbyprojekt)"

stations = json.load(io.open(os.path.join(BASE, "stations.json"), encoding="utf-8"))
try:
    coords = json.load(io.open(os.path.join(BASE, "coords.json"), encoding="utf-8"))
except Exception:
    coords = {}

todo = [s for s in stations if s["id"] not in coords]
print(len(todo), "Bahnhoefe ohne Koordinaten")


def api(params):
    url = API + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return json.load(urllib.request.urlopen(req, timeout=30))


for i in range(0, len(todo), 40):
    batch = todo[i:i + 40]
    by_title = {}
    for s in batch:
        by_title.setdefault(s["wt"], []).append(s["id"])
    params = {
        "action": "query", "format": "json", "formatversion": "2",
        "prop": "coordinates", "coprop": "type", "redirects": "1",
        "colimit": "max",
        "titles": "|".join(by_title.keys()),
    }
    back = {}
    while True:                       # prop=coordinates liefert seitenweise
        data = api(params)
        q = data.get("query", {})
        for n in q.get("normalized", []):
            back[n["to"]] = n["from"]
        for r in q.get("redirects", []):
            back[r["to"]] = back.get(r["from"], r["from"])
        for page in q.get("pages", []):
            c = (page.get("coordinates") or [None])[0]
            if not c:
                continue
            src = back.get(page.get("title", ""), page.get("title", ""))
            for sid in by_title.get(src, []):
                coords[sid] = [c["lat"], c["lon"]]
        cont = data.get("continue")
        if not cont:
            break
        params.update(cont)
        time.sleep(0.2)
    print("  %d/%d" % (min(i + 40, len(todo)), len(todo)))
    time.sleep(0.3)

json.dump(coords, io.open(os.path.join(BASE, "coords.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1, sort_keys=True)

missing = [s["id"] for s in stations if s["id"] not in coords]
print("Koordinaten:", len(coords), "| fehlend:", len(missing))
for m in missing:
    print("  ohne Koordinaten:", m)
