# -*- coding: utf-8 -*-
"""Aggregate parsed rows into one collectible entry per Taufname."""
import json, re, sys, io, unicodedata
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

d = json.load(open("parsed.json", encoding="utf-8"))

ALIAS = {
    "Westerland": "Westerland/Sylt",
    "Oberursel": "Oberursel (Taunus)",
    "Rüdesheim": "Rüdesheim am Rhein",
    "Marburg/Lahn": "Marburg",
}

def norm(name):
    name = ALIAS.get(name, name)
    n = name.lower()
    n = n.replace("a. inn", "/inn").replace("a. d. ", "/").replace(" a. ", "/")
    n = re.sub(r"[\s\./]+", "", n)
    n = re.sub(r"\(.*?\)", "", n)
    return n

# ---- build master entries from urspruenglich (Städte) ----
entries = {}
for r in d["urspruenglich"]:
    key = norm(r["name"])
    if key in entries:
        print("DUP urspruenglich:", r["name"])
        continue
    entries[key] = {
        "name": r["name"], "link": r["link"], "kategorie": "stadt",
        "nr": r["nr"], "taufdatum": r["von"], "taufort": r["ort"],
        "history": [{"von": r["von"], "bis": r["bis"], "baureihe": r["baureihe"],
                     "typ": r["typ"], "tz": r["tz"]}],
    }

unmatched = []
for src in ("nachtraeglich", "uebertragung"):
    for r in d[src]:
        key = norm(r["name"])
        if key not in entries:
            unmatched.append((src, r["name"], r["tz"], r["von"], r["bis"], r["bem"][:80]))
            continue
        entries[key]["history"].append({"von": r["von"], "bis": r["bis"],
                                        "baureihe": r["baureihe"], "typ": r["typ"], "tz": r["tz"]})

print("UNMATCHED transfers/changes:")
for u in unmatched:
    print("  ", u)

# ---- regionen ----
for r in d["regionen"]:
    key = norm(r["name"])
    # infer baureihe/typ from tz number
    tz = r["tz"]
    typ = br = None
    tznum = re.sub(r"\D", "", tz.split("\n")[0])[:4]
    n = int(tznum) if tznum else 0
    if 2800 <= n <= 2899 or 4890 <= n <= 4899:
        typ, br = "IC 2", "Bombardier Twindexx"
    elif 4100 <= n <= 4120:
        typ, br = "IC 2", "Stadler KISS"
    elif 9000 <= n <= 9299 or 9400 <= n <= 9499:
        typ, br = "ICE 4", "412"
    elif 4600 <= n <= 4699:
        typ, br = "ICE 3M", "406"
    elif 8000 <= n <= 8099:
        typ, br = "ICE 3neo", "408"
    elif 1800 <= n <= 1899:
        typ, br = "ICE L", "105"
    if key in entries:
        # name transferred to a newer trainset (e.g. Europa/Europe 4601 -> 8029)
        prev = entries[key]
        if prev["history"] and prev["history"][-1]["bis"] is None:
            prev["history"][-1]["bis"] = r["von"]
        prev["history"].append({"von": r["von"], "bis": r["bis"], "baureihe": br,
                                "typ": typ, "tz": tz})
        continue
    entries[key] = {
        "name": r["name"], "link": r["link"], "kategorie": "region",
        "nr": None, "taufdatum": r["von"], "taufort": r["ort"],
        "history": [{"von": r["von"], "bis": r["bis"], "baureihe": br, "typ": typ, "tz": tz}],
    }

# ---- resolve current carrier ----
out = []
for e in entries.values():
    hist = sorted(e["history"], key=lambda h: h["von"])
    current = None
    for h in hist:
        if h["bis"] is None:
            current = h
    e["aktiv"] = current is not None
    c = current or hist[-1]
    e["baureihe"] = c["baureihe"]
    e["typ"] = c["typ"]
    e["tz"] = c["tz"]
    e["history"] = hist
    out.append(e)

out.sort(key=lambda e: (e["taufdatum"]))
print("total entries:", len(out))
print("aktiv:", sum(1 for e in out if e["aktiv"]), " inaktiv:", sum(1 for e in out if not e["aktiv"]))
print("stadt:", sum(1 for e in out if e["kategorie"] == "stadt"), " region:", sum(1 for e in out if e["kategorie"] == "region"))
missing_link = [e["name"] for e in out if not e["link"]]
print("missing link:", missing_link)
by_typ = {}
for e in out:
    by_typ[e["typ"]] = by_typ.get(e["typ"], 0) + 1
print(by_typ)
json.dump(out, open("entries.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
