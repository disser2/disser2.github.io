# -*- coding: utf-8 -*-
"""Laedt die Airline-Codes von OpenFlights -> airlines.json

Quelle: github.com/jpatokal/openflights (Daten unter ODbL). Gebraucht werden
nur IATA- (LH) und ICAO-Code (DLH), Name und Land - damit die App auch ohne
Internet aus einer Flugnummer die Airline erkennt.

Die Liste ist an manchen Stellen veraltet (eingestellte Gesellschaften, alte
Codes); build_data.py legt darum eine kuratierte Korrekturliste darueber.
"""
import csv, io, json, os, sys, urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
URL = "https://raw.githubusercontent.com/jpatokal/openflights/master/data/airlines.dat"
RAW = os.path.join(BASE, "openflights_airlines.dat")
OUT = os.path.join(BASE, "airlines.json")

COLS = ["id", "name", "alias", "iata", "icao", "callsign", "country", "active"]


def download():
    if os.path.exists(RAW):
        return io.open(RAW, encoding="utf-8")
    print("lade", URL)
    req = urllib.request.Request(URL, headers={"User-Agent": "plane-spotting/1.0"})
    data = urllib.request.urlopen(req, timeout=120).read().decode("utf-8")
    io.open(RAW, "w", encoding="utf-8", newline="").write(data)
    return io.open(RAW, encoding="utf-8")


def clean(v):
    return "" if v in (chr(92) + "N", "-", "N/A") else v.strip()


out = []
for row in csv.reader(download()):
    if len(row) < len(COLS):
        continue
    r = dict(zip(COLS, row))
    if r["active"] != "Y":
        continue
    iata, icao, name = clean(r["iata"]), clean(r["icao"]), clean(r["name"])
    if not name or (len(iata) != 2 and len(icao) != 3):
        continue
    out.append({"ia": iata if len(iata) == 2 else "",
                "ic": icao if len(icao) == 3 else "",
                "n": name, "k": clean(r["country"])})

json.dump(out, io.open(OUT, "w", encoding="utf-8"), ensure_ascii=False)
print("%d Airlines -> airlines.json (%.1f KB)" % (len(out), os.path.getsize(OUT) / 1024))
