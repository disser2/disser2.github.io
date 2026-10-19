# -*- coding: utf-8 -*-
"""Erzeugt ../data.js (Haltestellen, Linien, Gleisverlauf) und ../geo.js (Basiskarte)
aus den OSM-Rohdaten in raw/ (siehe fetch_osm.py).

    python build_data.py

Koordinaten werden in ein lokales, metrisches System projiziert (Ursprung
50,90 N / 6,95 O, x nach Osten, y nach Sueden, Einheit Meter, ganzzahlig).
So bleiben die Dateien klein und die App kann Laengen direkt ausrechnen.
"""
import difflib, io, json, math, os, re, sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "raw")
APP = os.path.join(BASE, "..")

LAT0, LON0 = 50.90, 6.95
KX = math.cos(math.radians(LAT0)) * 111320.0
KY = 110574.0

# OSM-Namen -> Schreibweise wie im KVB-Liniennetzplan
ALIAS = {
    "Bahnhof Deutz / LANXESS arena": "Bf Deutz/LANXESS arena",
    "Bahnhof Mülheim": "Bf Mülheim",
    "Autobahn (Stadtbahn)": "Autobahn",
    "Westhoven, Kölner Straße": "Westhoven Kölner Straße",
    "Stadthalle": "Bad Godesberg Stadthalle",
    "Bonn Hauptbahnhof": "Bonn Hbf",
    "Universität / Markt": "Universität/Markt",
    "Hochkreuz / Deutsches Museum Bonn": "Hochkreuz/Deutsches Museum Bonn",
    "Alfter / Alanus Hochschule": "Alfter/Alanus Hochschule",
    "Bundesrechnungshof / Auswärtiges Amt": "Bundesrechnungshof/Auswärtiges Amt",
    "Bad Godesberg Bahnhof": "Bad Godesberg Bf",
    "Rodenkirchen Bahnhof": "Rodenkirchen Bf",
    "Sürth Bahnhof": "Sürth Bf",
    "Frechen Bahnhof": "Frechen Bf",
    "Bensberg U": "Bensberg",
    "Rheinenergie-Stadion": "RheinEnergieStadion",
}

# Startpunkt je Linie (bestimmt die Leserichtung "A – B")
CANON_START = {
    "1": "Weiden West", "3": "Görlinger-Zentrum", "4": "Bocklemünd",
    "5": "Sparkasse Am Butzweilerhof", "7": "Frechen-Benzelrath",
    "9": "Sülz Hermeskeiler Platz", "12": "Merkenich", "13": "Sülzgürtel",
    "15": "Chorweiler", "16": "Niehl Sebastianstraße", "17": "Severinstraße",
    "18": "Buchheim Herler Straße",
}

BEZ_NAME = {"Stadtbezirk Bonn": "Bonn", "Bonn-Beuel": "Beuel"}


def load(name):
    return json.load(io.open(os.path.join(RAW, name), encoding="utf-8"))


def proj(lat, lon):
    return ((lon - LON0) * KX, -(lat - LAT0) * KY)


def slug(s):
    s = s.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss"), ("é", "e")):
        s = s.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def clean(name):
    name = (name or "").strip()
    return ALIAS.get(name, name)


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def rdp(pts, eps):
    """Douglas-Peucker (iterativ)."""
    if len(pts) < 3:
        return list(pts)
    keep = [False] * len(pts)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        i, j = stack.pop()
        ax, ay = pts[i]
        bx, by = pts[j]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy)
        best, bi = -1.0, -1
        for k in range(i + 1, j):
            px, py = pts[k]
            if L == 0:
                dd = math.hypot(px - ax, py - ay)
            else:
                dd = abs(dy * px - dx * py + bx * ay - by * ax) / L
            if dd > best:
                best, bi = dd, k
        if best > eps:
            keep[bi] = True
            stack.append((i, bi))
            stack.append((bi, j))
    return [p for p, k in zip(pts, keep) if k]


def flat(pts):
    out = []
    for x, y in pts:
        out.append(int(round(x)))
        out.append(int(round(y)))
    return out


def underground(t):
    if t.get("location") == "underground" or t.get("tunnel") in ("yes", "culvert"):
        return True
    for k in ("level", "layer"):
        v = t.get(k)
        if v:
            try:
                if float(v.split(";")[0]) < 0:
                    return True
            except ValueError:
                pass
    return False


# ============================================================ Linien
routes = load("routes_full.json")["elements"]
tagged = {(e["type"], e["id"]): e.get("tags", {}) for e in routes if e["type"] in ("node", "way")}
rels = [e for e in routes if e["type"] == "relation"]

st_pts = defaultdict(list)          # Name -> projizierte Haltepositionen
st_ll = defaultdict(list)           # Name -> (lat, lon)
st_under = defaultdict(dict)        # Name -> {Linie: unterirdisch?}
st_vrs = defaultdict(Counter)       # Name -> VRS-Ortsteil (Fallback ausserhalb Koeln/Bonn)
line_col = {}
line_seqs = defaultdict(list)       # Linie -> [Haltestellenfolge je Relation]
seg_geom = {}                       # (NameA, NameB) -> Punkte (A -> B)


def chain(ways):
    """Wege einer Route-Relation zu einem Linienzug verketten."""
    line = []
    for k, w in enumerate(ways):
        if not w:
            continue
        if not line:
            if k + 1 < len(ways) and ways[k + 1]:
                nxt = ways[k + 1]
                if w[0] in (nxt[0], nxt[-1]):
                    w = w[::-1]
            line = list(w)
            continue
        end = line[-1]
        if w[0] == end:
            line.extend(w[1:])
        elif w[-1] == end:
            line.extend(w[::-1][1:])
        elif dist(w[0], end) <= dist(w[-1], end):   # Luecke in der Relation
            line.extend(w)
        else:
            line.extend(w[::-1])
    return line


def locate(line, cum, p, start):
    """Naechster Punkt auf dem Linienzug ab Laufmeter start -> (Laufmeter, Abstand)."""
    best = (None, 1e18)
    for i in range(len(line) - 1):
        if cum[i + 1] < start - 1:
            continue
        ax, ay = line[i]
        bx, by = line[i + 1]
        dx, dy = bx - ax, by - ay
        L2 = dx * dx + dy * dy
        t = 0.0 if L2 == 0 else max(0.0, min(1.0, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2))
        q = (ax + t * dx, ay + t * dy)
        dd = dist(q, p)
        pos = cum[i] + t * math.sqrt(L2)
        if pos < start - 1:
            continue
        if dd < best[1]:
            best = (pos, dd)
    return best


def cut(line, cum, a, b):
    """Teilstueck des Linienzugs zwischen Laufmeter a und b (a < b)."""
    def at(pos):
        for i in range(len(line) - 1):
            if cum[i] <= pos <= cum[i + 1]:
                seg = cum[i + 1] - cum[i]
                t = 0 if seg == 0 else (pos - cum[i]) / seg
                return i, (line[i][0] + t * (line[i + 1][0] - line[i][0]),
                           line[i][1] + t * (line[i + 1][1] - line[i][1]))
        return len(line) - 2, line[-1]
    ia, pa = at(a)
    ib, pb = at(b)
    return [pa] + line[ia + 1:ib + 1] + [pb]


warn = []
for r in rels:
    ref = r["tags"]["ref"]
    line_col[ref] = r["tags"].get("colour", "#888888").lower()
    stops, ways = [], []
    for m in r["members"]:
        t = tagged.get((m["type"], m["ref"]), {})
        role = m.get("role", "")
        if role.startswith("stop") and m["type"] == "node":
            nm = clean(t.get("name"))
            if not nm:
                continue
            p = proj(m["lat"], m["lon"])
            if stops and stops[-1][0] == nm:
                continue
            stops.append((nm, p))
            st_pts[nm].append(p)
            st_ll[nm].append((m["lat"], m["lon"]))
            if underground(t):
                st_under[nm][ref] = True
            else:
                st_under[nm].setdefault(ref, False)
        elif role.startswith("platform"):
            nm = clean(t.get("name"))
            if nm and underground(t):
                st_under[nm][ref] = True
        elif m["type"] == "way" and role in ("", "forward", "backward") and m.get("geometry"):
            ways.append([proj(g["lat"], g["lon"]) for g in m["geometry"] if g])
        if t.get("VRS:ortsteil"):
            st_vrs[clean(t.get("name"))][t["VRS:ortsteil"]] += 1
    line_seqs[ref].append([s[0] for s in stops])

    # Gleisverlauf zwischen benachbarten Halten
    line = chain(ways)
    if len(line) < 2:
        warn.append("Linie %s: keine Geometrie (%s)" % (ref, r["tags"]["name"]))
        continue
    cum = [0.0]
    for i in range(1, len(line)):
        cum.append(cum[-1] + dist(line[i - 1], line[i]))
    pos = []
    last = 0.0
    for nm, p in stops:
        at, dd = locate(line, cum, p, last)
        if at is None or dd > 80:
            pos.append(None)
            if dd < 1e17:
                warn.append("Linie %s: %s liegt %d m neben dem Gleis" % (ref, nm, dd))
            continue
        pos.append(at)
        last = at
    for i in range(len(stops) - 1):
        a, b = stops[i][0], stops[i + 1][0]
        if pos[i] is None or pos[i + 1] is None or (a, b) in seg_geom or (b, a) in seg_geom:
            continue
        pts = cut(line, cum, pos[i], pos[i + 1])
        L = sum(dist(pts[k], pts[k + 1]) for k in range(len(pts) - 1))
        straight = dist(stops[i][1], stops[i + 1][1])
        if L > 2.5 * straight + 300:      # Verkettung offensichtlich kaputt
            warn.append("Linie %s: %s -> %s unplausibel (%d m statt ~%d m)" % (ref, a, b, L, straight))
            continue
        seg_geom[(a, b)] = pts


def orient(seq, ref, main=None):
    s0 = CANON_START[ref]
    if s0 in seq:
        return seq if seq.index(s0) < len(seq) / 2 else seq[::-1]
    common = [x for x in main if x in seq]
    if len(common) >= 2 and seq.index(common[0]) > seq.index(common[-1]):
        return seq[::-1]
    return seq


def merge(a, b):
    """Zwei Halte-Folgen mit gleichen Endpunkten zusammenfuehren (fehlende Halte ergaenzen)."""
    out = []
    sm = difflib.SequenceMatcher(None, a, b, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == "equal":
            out += a[i1:i2]
        elif op == "delete":
            out += a[i1:i2]
        elif op == "insert":
            out += b[j1:j2]
        else:
            out += a[i1:i2] + [x for x in b[j1:j2] if x not in a[i1:i2]]
    seen, res = set(), []
    for x in out:
        if x not in seen:
            seen.add(x)
            res.append(x)
    return res


line_vars = {}
for ref, seqs in line_seqs.items():
    seqs = sorted(seqs, key=len, reverse=True)
    main = orient(seqs[0], ref, seqs[0])
    seqs = [orient(s, ref, main) for s in seqs]
    variants = []
    for s in seqs:
        done = False
        for k, v in enumerate(variants):
            if {s[0], s[-1]} == {v[0], v[-1]}:
                variants[k] = merge(v, s)
                done = True
                break
        if done:
            continue
        if any(set(s) <= set(v) for v in variants):
            continue                      # Kurzlaeufer (z. B. 12 bis Niehl Nord)
        variants.append(s)
    line_vars[ref] = variants

# ============================================================ Haltestellen
names = sorted(st_pts, key=lambda n: n.lower())
used = set(n for vs in line_vars.values() for v in vs for n in v)
names = [n for n in names if n in used]
idx = {n: i for i, n in enumerate(names)}

# ---- Verwaltungsgrenzen
def assemble(member_ways):
    """Wegstuecke zu geschlossenen Ringen zusammensetzen."""
    pieces = [list(w) for w in member_ways if len(w) >= 2]
    rings = []
    while pieces:
        cur = pieces.pop(0)
        changed = True
        while cur[0] != cur[-1] and changed:
            changed = False
            for k, p in enumerate(pieces):
                if p[0] == cur[-1]:
                    cur += p[1:]
                elif p[-1] == cur[-1]:
                    cur += p[::-1][1:]
                elif p[-1] == cur[0]:
                    cur = p + cur[1:]
                elif p[0] == cur[0]:
                    cur = p[::-1] + cur[1:]
                else:
                    continue
                pieces.pop(k)
                changed = True
                break
        rings.append(cur)
    return rings


def rel_rings(e):
    outer, inner = [], []
    for m in e.get("members", []):
        if m["type"] != "way" or not m.get("geometry"):
            continue
        g = [(p["lat"], p["lon"]) for p in m["geometry"] if p]
        (inner if m.get("role") == "inner" else outer).append(g)
    return assemble(outer), assemble(inner)


def pip(pt, rings):
    lat, lon = pt
    inside = False
    for ring in rings:
        n = len(ring)
        for i in range(n):
            y1, x1 = ring[i]
            y2, x2 = ring[(i + 1) % n]
            if (y1 > lat) != (y2 > lat):
                x = x1 + (lat - y1) * (x2 - x1) / (y2 - y1)
                if x > lon:
                    inside = not inside
    return inside


admin = []
for e in load("admin.json")["elements"] + load("districts.json")["elements"]:
    t = e["tags"]
    lvl = t.get("admin_level")
    o, i = rel_rings(e)
    if not o:
        continue
    admin.append({"name": t.get("name"), "lvl": lvl, "outer": o, "inner": i,
                  "kreisfrei": lvl == "6" and t.get("de:place") == "city"
                  or t.get("name") in ("Köln", "Bonn", "Leverkusen")})


def area_of(pt, lvl, cond=None):
    for a in admin:
        if a["lvl"] != lvl or (cond and not cond(a)):
            continue
        if pip(pt, a["outer"] + a["inner"]):
            return a["name"]
    return None


stations = []
for n in names:
    lls = st_ll[n]
    lat = sum(p[0] for p in lls) / len(lls)
    lon = sum(p[1] for p in lls) / len(lls)
    x, y = proj(lat, lon)
    ort = area_of((lat, lon), "8") or area_of((lat, lon), "6", lambda a: a["kreisfrei"])
    bez = teil = None
    if ort in ("Köln", "Bonn"):
        bez = area_of((lat, lon), "9")
        bez = BEZ_NAME.get(bez, bez)
        teil = area_of((lat, lon), "10")
    if not teil and st_vrs[n]:
        v = st_vrs[n].most_common(1)[0][0]
        teil = None if v in ("Mitte", "Innenstadt") else v
    und = st_under[n]
    u = 0
    if und and all(und.values()):
        u = 2
    elif any(und.values()):
        u = 1
    stations.append({"id": slug(n), "name": n, "xy": [int(round(x)), int(round(y))],
                     "ort": ort or "?", "bez": bez, "teil": teil, "u": u})

ids = Counter(s["id"] for s in stations)
assert all(c == 1 for c in ids.values()), [k for k, c in ids.items() if c > 1]

# ---- Linien
order = sorted(line_vars, key=lambda r: int(r))
LINES = []
for ref in order:
    LINES.append({"nr": ref, "col": line_col[ref],
                  "v": [[idx[n] for n in v] for v in line_vars[ref]]})

# ---- Gleisverlauf je Abschnitt (beide Richtungen gemeinsam)
SEGS = {}
missing = []
for l in LINES:
    for v in l["v"]:
        for k in range(len(v) - 1):
            a, b = v[k], v[k + 1]
            key = "%d-%d" % (min(a, b), max(a, b))
            if key in SEGS:
                continue
            na, nb = names[a], names[b]
            g = seg_geom.get((na, nb))
            if g is None and (nb, na) in seg_geom:
                g = seg_geom[(nb, na)][::-1]
            pa = tuple(stations[a]["xy"])
            pb = tuple(stations[b]["xy"])
            if g is None:
                missing.append("%s – %s (Linie %s)" % (na, nb, l["nr"]))
                g = [pa, pb]
            else:
                g = [pa] + rdp(g, 2.5) + [pb]   # an die Stationspunkte andocken
            if min(a, b) != a:
                g = g[::-1]
            SEGS[key] = flat(rdp(g, 1.0))

total_m = 0
for key, f in SEGS.items():
    total_m += sum(math.hypot(f[k + 2] - f[k], f[k + 3] - f[k + 1]) for k in range(0, len(f) - 2, 2))

# ============================================================ Basiskarte
xs = [s["xy"][0] for s in stations]
ys = [s["xy"][1] for s in stations]
M = 5000
BX0, BX1, BY0, BY1 = min(xs) - M, max(xs) + M, min(ys) - M, max(ys) + M


def ring_xy(ring, eps):
    pts = [proj(lat, lon) for lat, lon in ring]
    pts = rdp(pts, eps)
    return pts


def touches(pts):
    return any(BX0 <= x <= BX1 and BY0 <= y <= BY1 for x, y in pts)


def centroid(pts):
    A = cx = cy = 0.0
    for i in range(len(pts)):
        x0, y0 = pts[i]
        x1, y1 = pts[(i + 1) % len(pts)]
        c = x0 * y1 - x1 * y0
        A += c
        cx += (x0 + x1) * c
        cy += (y0 + y1) * c
    if abs(A) < 1e-9:
        return pts[0]
    return (cx / (3 * A), cy / (3 * A))


GEO = {"orte": [], "bez": [], "water": [], "lab": []}
for a in admin:
    if a["lvl"] == "8" or (a["lvl"] == "6" and a["kreisfrei"]):
        rings = [ring_xy(r, 18) for r in a["outer"]]
        rings = [r for r in rings if len(r) >= 3]
        if not rings or not any(touches(r) for r in rings):
            continue
        big = max(rings, key=len)
        c = centroid(big)
        GEO["orte"].append({"n": a["name"], "k": 1 if a["name"] == "Köln" else 0,
                            "r": [flat(r) for r in rings]})
        if a["name"] != "Köln" and BX0 <= c[0] <= BX1 and BY0 <= c[1] <= BY1:
            GEO["lab"].append({"n": a["name"], "t": 1, "xy": flat([c])})
    elif a["lvl"] == "9":
        rings = [ring_xy(r, 15) for r in a["outer"]]
        rings = [r for r in rings if len(r) >= 3]
        if not rings:
            continue
        nm = BEZ_NAME.get(a["name"], a["name"])
        big = max(rings, key=len)
        GEO["bez"].append({"n": nm, "r": [flat(r) for r in rings]})
        GEO["lab"].append({"n": nm, "t": 2, "xy": flat([centroid(big)])})


def poly_area(pts):
    return abs(sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1]
                   for i in range(len(pts)))) / 2


for e in load("river.json")["elements"]:
    if e["type"] == "way":
        g = [(p["lat"], p["lon"]) for p in e.get("geometry", []) if p]
        outer, inner = [g], []
    else:
        outer, inner = rel_rings(e)
    rings = []
    for r in outer + inner:
        pts = ring_xy(r, 6)
        if len(pts) >= 3 and poly_area(pts) > 4000 and touches(pts):
            rings.append(flat(pts))
    if rings:
        GEO["water"].append(rings)

# ============================================================ Ausgabe
def js(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


stand = load("routes_full.json")
stand = (stand.get("osm3s") or {}).get("timestamp_osm_base", "")[:10]

lines_js = ",\n".join(" " + js(l) for l in LINES)
st_js = ",\n".join(" " + js(s) for s in stations)
seg_js = ",\n".join(" " + js(k) + ":" + js(v) for k, v in SEGS.items())
out = ("// KVB Stadtbahn – erzeugt von tools/build_data.py\n"
       "// Quelle: OpenStreetMap (Stand %s), © OpenStreetMap-Mitwirkende, ODbL\n"
       "// Koordinaten: Meter, Ursprung %.2f N / %.2f O, x nach Osten, y nach Süden\n"
       "const NETZ_STAND = %s;\n"
       "const STATIONS = [\n%s\n];\n"
       "const LINES = [\n%s\n];\n"
       "const SEGS = {\n%s\n};\n") % (stand, LAT0, LON0, js(stand), st_js, lines_js, seg_js)
io.open(os.path.join(APP, "data.js"), "w", encoding="utf-8").write(out)

geo_out = ("/* Basiskarte – erzeugt von tools/build_data.py\n"
           "   Quelle: OpenStreetMap (Gemeinde- und Stadtbezirksgrenzen, Rhein), ODbL\n"
           "   orte/bez: {n: Name, r: [Ring, ...]}, water: [[Ring, ...], ...], lab: Beschriftungen\n"
           "   Ring = [x0, y0, x1, y1, ...] in Metern (wie data.js) */\n"
           "var GEO = %s;\n") % js(GEO)
io.open(os.path.join(APP, "geo.js"), "w", encoding="utf-8").write(geo_out)

# ============================================================ Bericht
print("Haltestellen:", len(stations))
print("Linien:", ", ".join("%s (%s)" % (l["nr"], "+".join(str(len(v)) for v in l["v"])) for l in LINES))
print("Abschnitte:", len(SEGS), "· Netzlänge %.1f km" % (total_m / 1000))
print("Orte:", dict(Counter(s["ort"] for s in stations)))
print("Stadtbezirke:", dict(Counter(s["bez"] for s in stations if s["bez"])))
print("unterirdisch:", sum(1 for s in stations if s["u"] == 2), "· teilweise:",
      sum(1 for s in stations if s["u"] == 1))
print("ohne Stadtteil:", [s["name"] for s in stations if not s["teil"]])
print("data.js %.0f KB, geo.js %.0f KB" % (os.path.getsize(os.path.join(APP, "data.js")) / 1024,
                                           os.path.getsize(os.path.join(APP, "geo.js")) / 1024))
for w in warn:
    print("WARNUNG:", w)
for m in missing:
    print("OHNE GLEISVERLAUF (Luftlinie):", m)
print()
for l in LINES:
    for v in l["v"]:
        print("Linie %-3s %s" % (l["nr"], " | ".join(names[i] for i in v)))
