# -*- coding: utf-8 -*-
"""Laedt die Flughafendaten von OurAirports -> airports.json

Quelle: ourairports.com (gemeinfrei / public domain), gespiegelt als CSV unter
davidmegginson.github.io/ourairports-data.

Aus den 86.000 Eintraegen der Rohdatei bleibt nur, was fuer eine Spotting-App
gebraucht wird - sonst waere data.js mehrere Megabyte gross:

  * alle grossen und mittleren Flughaefen weltweit
  * kleine Flugplaetze mit Linienverkehr
  * alle kleinen Flugplaetze in Deutschland, Oesterreich und der Schweiz
    (damit der naechstgelegene Platz auch abseits der Drehkreuze stimmt)

Heliports, Wasserflugplaetze, Ballonstartplaetze und geschlossene Plaetze
fliegen raus.
"""
import csv, io, json, os, sys, urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
URL = "https://davidmegginson.github.io/ourairports-data/airports.csv"
RAW = os.path.join(BASE, "ourairports.csv")
OUT = os.path.join(BASE, "airports.json")

NEAR = ("DE", "AT", "CH")          # hier zaehlt auch der kleinste Grasplatz
SIZE = {"large_airport": 2, "medium_airport": 1, "small_airport": 0}


def download():
    if os.path.exists(RAW):
        return io.open(RAW, encoding="utf-8")
    print("lade", URL)
    req = urllib.request.Request(URL, headers={"User-Agent": "plane-spotting/1.0"})
    data = urllib.request.urlopen(req, timeout=180).read().decode("utf-8")
    io.open(RAW, "w", encoding="utf-8", newline="").write(data)
    return io.open(RAW, encoding="utf-8")


def keep(r):
    t = r["type"]
    if t not in SIZE:
        return False
    if t != "small_airport":
        return True
    return r["scheduled_service"] == "yes" or r["iso_country"] in NEAR


def ident(r):
    return (r["icao_code"] or r["gps_code"] or r["ident"]).strip().upper()


out = []
for r in csv.DictReader(download()):
    if not keep(r):
        continue
    try:
        lat, lon = round(float(r["latitude_deg"]), 4), round(float(r["longitude_deg"]), 4)
    except ValueError:
        continue
    out.append({
        "id": ident(r),
        "ia": r["iata_code"].strip().upper(),
        "n": r["name"].strip(),
        "c": r["municipality"].strip(),
        "k": r["iso_country"].strip().upper(),
        "ll": [lat, lon],
        "s": SIZE[r["type"]],
        "sched": r["scheduled_service"] == "yes",
    })

out.sort(key=lambda a: (-a["s"], a["id"]))
json.dump(out, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
print("%d Flughaefen -> airports.json (%.1f KB)" % (len(out), os.path.getsize(OUT) / 1024))
for s, label in ((2, "gross"), (1, "mittel"), (0, "klein")):
    print("  %-6s %d" % (label, sum(1 for a in out if a["s"] == s)))
