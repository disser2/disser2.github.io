# -*- coding: utf-8 -*-
"""Emit data.js for the web app."""
import json, re, sys, io, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

entries = json.load(open("entries_wappen.json", encoding="utf-8"))

def slug(s):
    s = s.lower().replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")

def fix_url(u):
    if not u:
        return None
    u = u.split("?")[0]
    u = u.replace("https://thumb.wikimedia.org/", "https://upload.wikimedia.org/")
    u = re.sub(r"/(\d+)px-", "/250px-", u)
    return u

out, seen_ids = [], set()
for e in entries:
    i = slug(e["name"])
    assert i not in seen_ids, i
    seen_ids.add(i)
    out.append({
        "id": i,
        "name": e["name"],
        "kat": e["kategorie"],          # stadt | region
        "nr": e["nr"],
        "taufdatum": e["taufdatum"],
        "taufort": e["taufort"] or None,
        "baureihe": e["baureihe"],
        "typ": e["typ"],
        "tz": e["tz"],
        "aktiv": e["aktiv"],
        "wappen": fix_url(e["wappen"]),
        "history": [
            {"von": h["von"], "bis": h["bis"], "baureihe": h["baureihe"],
             "typ": h["typ"], "tz": h["tz"]} for h in e["history"]
        ],
    })

out.sort(key=lambda x: x["name"].lower())
js = ("// Automatisch generiert aus der Wikipedia-Liste benannter IC/ICE-Fahrzeuge\n"
      "// Stand: 2026-08-31 | Quelle: https://de.wikipedia.org/wiki/Liste_benannter_IC/ICE-Fahrzeuge\n"
      "const TRAINS = " + json.dumps(out, ensure_ascii=False, indent=1) + ";\n")
open("../data.js", "w", encoding="utf-8").write(js)
print("entries:", len(out))
print("typen:", sorted({e["typ"] for e in out if e["typ"]}))
print("sample:", json.dumps(out[0], ensure_ascii=False))
