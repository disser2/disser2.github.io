# -*- coding: utf-8 -*-
"""Kleiner Overpass-Client mit Wiederholung und Ausweich-Servern.

    python overpass.py <ausgabe.json> <query-datei.overpassql>

Wird von fetch_osm.py benutzt, laesst sich aber auch einzeln aufrufen.
"""
import io, json, sys, time, urllib.parse, urllib.request

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]
UA = "kvb-haltestellen-app/1.0 (private Sammel-App, einmaliger Datenabruf)"


def query(ql, tries=6):
    body = urllib.parse.urlencode({"data": ql}).encode("utf-8")
    wait = 5
    last = None
    for attempt in range(tries):
        url = ENDPOINTS[attempt % len(ENDPOINTS)]
        try:
            req = urllib.request.Request(url, data=body, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=420) as r:
                raw = r.read()
            data = json.loads(raw.decode("utf-8"))
            if data.get("remark") and "error" in data["remark"].lower():
                raise RuntimeError(data["remark"])
            return data
        except Exception as e:  # Server ueberlastet, Timeout, kaputtes JSON ...
            last = e
            print("  Versuch %d (%s) fehlgeschlagen: %s" % (attempt + 1, url.split("/")[2], str(e)[:120]))
            time.sleep(wait)
            wait = min(wait * 2, 60)
    raise RuntimeError("Overpass nicht erreichbar: %s" % last)


if __name__ == "__main__":
    out, qfile = sys.argv[1], sys.argv[2]
    ql = io.open(qfile, encoding="utf-8").read()
    data = query(ql)
    io.open(out, "w", encoding="utf-8").write(json.dumps(data, ensure_ascii=False))
    print(out, len(data.get("elements", [])), "Elemente")
