# -*- coding: utf-8 -*-
"""Baut die Basiskarte (Landflaechen, Grenzen, Seen) -> ../geo.js

Quelle: Natural Earth 1:50m (gemeinfrei), gespiegelt als GeoJSON von
github.com/martynafford/natural-earth-geojson

Es werden nur Flaechen im Kartenausschnitt behalten, mit Douglas-Peucker
vereinfacht und auf 3 Nachkommastellen gerundet - damit bleibt geo.js klein
genug, um die App weiterhin komplett offline auszuliefern.
"""
import io, json, os, sys, urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = "https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/50m/"
SRC = {
    "countries": RAW + "cultural/ne_50m_admin_0_countries.json",
    "lakes": RAW + "physical/ne_50m_lakes.json",
}
# Ausschnitt: Westeuropa bis Ungarn, Nordsee/Ostsee bis Mittelmeer
BOX = (-7.0, 34.0, 31.0, 62.0)          # lon0, lat0, lon1, lat1
TOL = 0.02                               # Vereinfachung in Grad (~1,5 km)
MIN_RING = 0.06                          # Ringe kleiner als das fliegen raus


def download(url, name):
    path = os.path.join(BASE, name)
    if os.path.exists(path):
        return json.load(io.open(path, encoding="utf-8"))
    print("lade", url)
    req = urllib.request.Request(url, headers={"User-Agent": "ice-routes-tracker/1.0"})
    data = urllib.request.urlopen(req, timeout=180).read().decode("utf-8")
    io.open(path, "w", encoding="utf-8").write(data)
    return json.loads(data)


def ring_box(ring):
    xs = [p[0] for p in ring]
    ys = [p[1] for p in ring]
    return min(xs), min(ys), max(xs), max(ys)


def overlaps(b):
    return not (b[2] < BOX[0] or b[0] > BOX[2] or b[3] < BOX[1] or b[1] > BOX[3])


def simplify(pts, tol):
    """Douglas-Peucker."""
    if len(pts) < 3:
        return pts
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        ax, ay = pts[i]
        bx, by = pts[j]
        dx, dy = bx - ax, by - ay
        n = dx * dx + dy * dy
        best, bi = tol, -1
        for k in range(i + 1, j):
            px, py = pts[k]
            if n > 0:
                t = ((px - ax) * dx + (py - ay) * dy) / n
                t = 0 if t < 0 else (1 if t > 1 else t)
                ex, ey = ax + t * dx, ay + t * dy
            else:
                ex, ey = ax, ay
            d = ((px - ex) ** 2 + (py - ey) ** 2) ** 0.5
            if d > best:
                best, bi = d, k
        if bi >= 0:
            keep[bi] = True
            stack.append((i, bi))
            stack.append((bi, j))
    return [p for p, k in zip(pts, keep) if k]


def rings_of(geom):
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return [c[0]] + c[1:]
    if t == "MultiPolygon":
        out = []
        for poly in c:
            out += [poly[0]] + poly[1:]
        return out
    return []


def collect(features):
    out = []
    for f in features:
        for ring in rings_of(f.get("geometry") or {}):
            if len(ring) < 4:
                continue
            b = ring_box(ring)
            if not overlaps(b):
                continue
            if max(b[2] - b[0], b[3] - b[1]) < MIN_RING:
                continue
            r = simplify([(p[0], p[1]) for p in ring], TOL)
            if len(r) < 4:
                continue
            out.append([[round(x, 3), round(y, 3)] for x, y in r])
    return out


land = collect(download(SRC["countries"], "ne50_countries.json")["features"])
lakes = collect(download(SRC["lakes"], "ne50_lakes.json")["features"])

doc = [
    "/* Basiskarte - erzeugt von tools/fetch_geo.py",
    "   Quelle: Natural Earth 1:50m (gemeinfrei), Ausschnitt Europa, vereinfacht",
    "   GEO.land / GEO.lakes = Liste von Ringen, Ring = [[lon, lat], ...] */",
    "var GEO = {",
    "  land: " + json.dumps(land, separators=(",", ":")) + ",",
    "  lakes: " + json.dumps(lakes, separators=(",", ":")),
    "};",
    "",
]
path = os.path.join(BASE, "..", "geo.js")
io.open(path, "w", encoding="utf-8").write(chr(10).join(doc))
print("Ringe: %d Land, %d Seen | geo.js: %.1f KB"
      % (len(land), len(lakes), os.path.getsize(path) / 1024))
