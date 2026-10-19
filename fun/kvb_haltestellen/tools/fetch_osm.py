# -*- coding: utf-8 -*-
"""Laedt die Rohdaten aus OpenStreetMap (Overpass API) nach tools/raw/.

    python fetch_osm.py            # alles
    python fetch_osm.py routes     # nur einzelne Teile: routes | admin | river

- routes_full.json : alle KVB-Stadtbahnlinien (Route-Relationen je Fahrtrichtung)
                     inkl. Gleisgeometrie und Haltepositionen
- admin.json       : Gemeinden (admin_level 6/8) im Umkreis
- districts.json   : Stadtbezirke (9) und Stadtteile (10) von Koeln und Bonn
- river.json       : Rhein (Wasserflaechen) im Kartenausschnitt
"""
import io, json, os, sys
from overpass import query

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "raw")
BBOX = "50.64,6.76,51.06,7.20"          # Sued, West, Nord, Ost

QUERIES = {
    "routes_full.json": """
[out:json][timeout:240];
rel["type"="route"]["route"="tram"]["operator"~"KVB"](%s)->.r;
.r out body geom;
(node(r.r); way(r.r)["public_transport"];)->.m;
.m out tags center;
""" % BBOX,
    "admin.json": """
[out:json][timeout:300];
rel["boundary"="administrative"]["admin_level"~"^(6|8)$"](%s);
out body geom;
""" % BBOX,
    "districts.json": """
[out:json][timeout:300];
area["name"~"^(Köln|Bonn)$"]["admin_level"="6"]->.c;
rel["boundary"="administrative"]["admin_level"~"^(9|10)$"](area.c);
out body geom;
""",
    "river.json": """
[out:json][timeout:300];
(
  way["natural"="water"]["water"="river"](%s);
  rel["natural"="water"]["water"="river"](%s);
  way["waterway"="riverbank"](%s);
);
out body geom(%s);
""" % (BBOX, BBOX, BBOX, BBOX),
}
PARTS = {"routes": ["routes_full.json"], "admin": ["admin.json", "districts.json"],
         "river": ["river.json"]}


def main():
    os.makedirs(RAW, exist_ok=True)
    names = list(QUERIES)
    if len(sys.argv) > 1:
        names = [n for p in sys.argv[1:] for n in PARTS[p]]
    for name in names:
        print("Lade", name, "...")
        data = query(QUERIES[name])
        path = os.path.join(RAW, name)
        io.open(path, "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False))
        print("  ", len(data.get("elements", [])), "Elemente,",
              round(os.path.getsize(path) / 1024), "KB")


if __name__ == "__main__":
    main()
