# -*- coding: utf-8 -*-
"""Parst die Wikipedia-Liste der ICE-Linien zu lines.json und ../data.js.

Eingabe : ../wiki_linien.txt   (Wikitext, action=raw)
Ausgabe : lines.json           (Zwischenformat, gut lesbar)
          ../data.js           (STATIONS + LINES fuer die App)
"""
import json, re, os, io, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(BASE, "..", "wiki_linien.txt")

txt = io.open(RAW, encoding="utf-8").read()

# nur der Abschnitt "Aktuelle Linien"
txt = txt[txt.index("== Aktuelle Linien"):txt.index("== Eingestellte Linien")]

NBSP = chr(160)
ITAL_ON, ITAL_OFF, LINK = chr(1), chr(2), chr(3)


# ---------------------------------------------------------------- Tabellen
def split_cells(line):
    """Zerlegt eine Tabellenzeile an '||' / '!!' - Links und Templates bleiben heil."""
    out, depth, cur, i = [], 0, "", 0
    while i < len(line):
        two = line[i:i + 2]
        if two in ("[[", "{{"):
            depth += 1; cur += two; i += 2; continue
        if two in ("]]", "}}"):
            depth -= 1; cur += two; i += 2; continue
        if depth == 0 and two in ("||", "!!"):
            out.append(cur); cur = ""; i += 2; continue
        cur += line[i]; i += 1
    out.append(cur)
    return out


def cell_attrs(cell):
    """Trennt Zell-Attribute (rowspan/colspan/style) vom Inhalt."""
    depth, i = 0, 0
    while i < len(cell):
        two = cell[i:i + 2]
        if two in ("[[", "{{"):
            depth += 1; i += 2; continue
        if two in ("]]", "}}"):
            depth -= 1; i += 2; continue
        if cell[i] == "|" and depth == 0:
            head, body = cell[:i], cell[i + 1:]
            if "=" in head and "[[" not in head and "{{" not in head:
                return head, body
            break
        i += 1
    return "", cell


def parse_table(tbl):
    """Wikitable -> Raster aus (Inhalt, ist_colspan_wiederholung), row-/colspan aufgeloest."""
    rows, cur = [], None
    for ln in tbl.split(chr(10))[1:]:
        s = ln.strip()
        if s.startswith("|}"):
            break
        if s.startswith("|-"):
            if cur is not None:
                rows.append(cur)
            cur = []
            continue
        if s.startswith("!") or (s.startswith("|") and not s.startswith("|+")):
            if cur is None:
                cur = []
            for c in split_cells(s[1:]):
                cur.append(c)
        elif cur and s:
            cur[-1] += " " + s               # Fortsetzungszeile einer Zelle
    if cur is not None:
        rows.append(cur)
    rows = [r for r in rows if r]

    grid, pending = [], {}                   # pending: Spalte -> (Zelle, Restzeilen)
    for r in rows:
        line, col, src = [], 0, list(r)
        while True:
            while col in pending:
                val, left = pending[col]
                line.append(val)
                if left - 1 > 0:
                    pending[col] = (val, left - 1)
                else:
                    del pending[col]
                col += 1
            if not src:
                break
            attrs, body = cell_attrs(src.pop(0))
            body = body.strip()
            m = re.search(r'rowspan\s*=\s*"?(\d+)', attrs)
            rs = int(m.group(1)) if m else 1
            m = re.search(r'colspan\s*=\s*"?(\d+)', attrs)
            cs = int(m.group(1)) if m else 1
            for k in range(cs):
                val = (body, k > 0, attrs)
                line.append(val)
                if rs > 1:
                    pending[col] = (val, rs - 1)
                col += 1
        grid.append(line)
    return grid


# ---------------------------------------------------------------- Stationen
ALIAS = {
    "Frankfurt am Main Flughafen Fernbahnhof": "Frankfurt Flughafen Fernbahnhof",
    "Frankfurt am Main Flughafen Regionalbahnhof": "Frankfurt Flughafen Regionalbahnhof",
    "Münster": "Münster (Westfalen) Hbf",
}


def station_id(target):
    t = target.split("#")[0].strip()
    t = re.sub(r"^Bahnhof ", "", t)
    t = t.replace(" Hauptbahnhof", " Hbf").replace("Hauptbahnhof", "Hbf")
    return ALIAS.get(t, t)


def parse_route(cell):
    """Route-Zelle -> [{id, name, opt}]. opt = kursiv oder geklammert (nur einzelne Zuege)."""
    s = cell.replace("&nbsp;", " ").replace(NBSP, " ")
    s = re.sub(r"<ref[^>]*/>", "", s)
    s = re.sub(r"<ref.*?</ref>", "", s, flags=re.S)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\{\{nowrap\|(.*?)\}\}", r"\1", s, flags=re.S)
    s = re.sub(r"\{\{[^{}]*\}\}", "", s)
    s = s.replace("'''", "")

    # Links herausloesen, damit Klammern/Kursiv in Namen nicht stoeren
    links = []

    def stash(m):
        links.append((m.group(1), (m.group(2) or "").strip()))
        return LINK + str(len(links) - 1) + LINK

    s = re.sub(r"\[\[([^\]|]+)(?:\|([^\]]*))?\]\]", stash, s)

    # Kursiv -> Steuerzeichen
    marked, ital = "", False
    for tok in re.split(r"('')", s):
        if tok == "''":
            ital = not ital
            continue
        marked += (ITAL_ON if ital else ITAL_OFF) + tok
    s = marked
    # Klammern = fakultativer Laufwegteil
    s = re.sub(r"\(([^()]*)\)", lambda m: ITAL_ON + m.group(1) + ITAL_OFF, s)

    stations = []
    for m in re.finditer(LINK + r"(\d+)" + LINK, s):
        target, label = links[int(m.group(1))]
        is_opt = s.rfind(ITAL_ON, 0, m.start()) > s.rfind(ITAL_OFF, 0, m.start())
        sid = station_id(target)
        name = (label or sid).split("#")[0].strip()
        if not name:
            continue
        if stations and stations[-1]["id"] == sid:
            if not is_opt:
                stations[-1]["opt"] = False
            continue
        stations.append({"id": sid, "name": name, "opt": is_opt,
                         "wt": target.split("#")[0].strip()})
    return stations


# ---------------------------------------------------------------- Linien
lines_out = {}


def add_line(nr, route, fahrzeuge, farbe):
    if len(route) < 2:
        return
    key = str(nr)
    e = lines_out.setdefault(key, {"nr": key, "verlauf": [], "fahrzeuge": fahrzeuge,
                                   "farbe": farbe})
    if fahrzeuge and not e["fahrzeuge"]:
        e["fahrzeuge"] = fahrzeuge
    if farbe and not e["farbe"]:
        e["farbe"] = farbe
    ids = [s["id"] for s in route]
    for v in e["verlauf"]:
        if [s["id"] for s in v] == ids:
            return
    e["verlauf"].append(route)


def line_nr_from_cell(cell):
    m = re.search(r"\{\{Bahnlinie\|ICE\|([^|}]+)", cell)
    if m:
        return m.group(1).strip()
    m = re.search(r"ICE\s*(\d+)", cell.replace("&nbsp;", " ").replace(NBSP, " ").replace("'''", ""))
    if m:
        return m.group(1)
    return None


def fahrzeuge_from_cell(cell):
    return ", ".join(re.findall(r"\[\[(ICE[^\]|]*?)(?:\|[^\]]*)?\]\]", cell))


head_re = re.compile(r"^(={3,4})\s*(.*?)\s*\1\s*$", re.M)
sections = [(m.start(), m.end(), m.group(2)) for m in head_re.finditer(txt)]

for i, (a, b, title) in enumerate(sections):
    body = txt[b:sections[i + 1][0]] if i + 1 < len(sections) else txt[b:]
    tables = re.findall(r"\{\|.*?" + chr(10) + r"\|\}", body, flags=re.S)
    if not tables:
        continue
    grid = parse_table(tables[0])
    if not grid:
        continue
    header = next((r for r in grid if any("Linienverlauf" in c[0] for c in r)), None)
    if header is None:
        continue
    hdr = [re.sub(r"^!+\s*", "", c[0]).strip() for c in header]
    route_cols = [j for j, h in enumerate(hdr) if "Linienverlauf" in h]
    if not route_cols:
        continue
    nr_col = next((j for j, h in enumerate(hdr)
                   if h.startswith("Linie") and "verlauf" not in h), None)
    veh_col = next((j for j, h in enumerate(hdr) if "Fahrzeug" in h), None)
    # Fortsetzungsspalten ohne Ueberschrift gehoeren ebenfalls zum Linienverlauf
    limit = veh_col if veh_col is not None else len(hdr)
    route_cols += [j for j, h in enumerate(hdr)
                   if h == "" and min(route_cols) < j < limit and j not in route_cols]
    route_cols.sort()

    heading_nrs = re.findall(r"\d+", re.sub(r"12/2025|1.9", "", title))
    for row in grid:
        if row is header or len(row) <= max(route_cols):
            continue
        if any("Linienverlauf" in c[0] for c in row):
            continue
        cell = " - ".join(row[j][0] for j in route_cols
                          if not row[j][1] and row[j][0].strip())
        if "[[" not in cell:
            continue
        nr = (line_nr_from_cell(row[nr_col][0])
              if nr_col is not None and nr_col < len(row) else None)
        if nr is None and len(heading_nrs) == 1:
            nr = heading_nrs[0]
        if nr is None:
            continue
        veh = (fahrzeuge_from_cell(row[veh_col][0])
               if veh_col is not None and veh_col < len(row) else "")
        m = re.search(r"color:\s*(#[0-9A-Fa-f]{3,6})",
                      row[nr_col][2] if nr_col is not None and nr_col < len(row) else "")
        add_line(nr, parse_route(cell), veh, m.group(1) if m else "")


SPRINTER = {"1", "3", "4", "6", "9"}

out = []
for k in sorted(lines_out, key=lambda x: int(re.sub(r"\D", "", x) or 0)):
    e = lines_out[k]
    e["sprinter"] = k in SPRINTER
    out.append(e)

json.dump(out, io.open(os.path.join(BASE, "lines.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)


# ------------------------------------------------------------------ data.js
stations, index = [], {}
for e in out:
    for v in e["verlauf"]:
        for st in v:
            if st["id"] not in index:
                index[st["id"]] = len(stations)
                stations.append({"id": st["id"], "name": st["name"], "wt": st["wt"]})

# Bahnhofsliste (mit Wikipedia-Artikelnamen) fuer tools/fetch_coords.py
json.dump(stations, io.open(os.path.join(BASE, "stations.json"), "w", encoding="utf-8"),
          ensure_ascii=False, indent=1)

# Koordinaten (falls schon geholt) einmischen: ll = [lat, lon]
try:
    coords = json.load(io.open(os.path.join(BASE, "coords.json"), encoding="utf-8"))
except Exception:
    coords = {}
n_coords = 0
for st in stations:
    ll = coords.get(st["id"])
    if ll:
        st["ll"] = [round(ll[0], 4), round(ll[1], 4)]
        n_coords += 1
    del st["wt"]


def js(obj):
    return json.dumps(obj, ensure_ascii=False)


lines_js = []
for e in out:
    varianten = [[[index[st["id"]], 1 if st["opt"] else 0] for st in v] for v in e["verlauf"]]
    lines_js.append('{nr:"%s",fz:%s,col:%s,sp:%s,v:%s}' % (
        e["nr"], js(e["fahrzeuge"]), js(e["farbe"]),
        "true" if e["sprinter"] else "false",
        js(varianten).replace(" ", "")))

doc = [
    "/* ICE-Liniennetz - erzeugt von tools/parse_lines.py",
    "   Quelle: de.wikipedia.org/wiki/Liste_der_Intercity-Express-Linien (Stand 09/2026)",
    "   STATIONS: [{id, name, ll (lat/lon)}]   LINES: {nr, fz (Fahrzeuge), col (Linienfarbe), sp, v (Varianten)}",
    "   Variante = [[Stationsindex, 1 = nur einzelne Zuege], ...] */",
    "var STATIONS = [",
]
doc += ["  " + js(st) + "," for st in stations]
doc += ["];", "", "var LINES = ["]
doc += ["  " + l + "," for l in lines_js]
doc += ["];", ""]

with io.open(os.path.join(BASE, "..", "data.js"), "w", encoding="utf-8") as f:
    f.write(chr(10).join(doc))

print("Stationen:", len(stations), "davon mit Koordinaten:", n_coords)
print("Linien:", len(out), " Varianten:", sum(len(e["verlauf"]) for e in out))
for e in out:
    for v in e["verlauf"]:
        print("  ICE %-4s %2d Halte: %s" % (
            e["nr"], len(v),
            " - ".join(s["name"] + ("*" if s["opt"] else "") for s in v)))
