# -*- coding: utf-8 -*-
"""Parse the German Wikipedia list of named IC/ICE vehicles into JSON."""
import json, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

RAW = open("wiki_raw.txt", encoding="utf-8").read()
lines = RAW.split("\n")

def section(start_marker, end_markers):
    si = None
    for i, l in enumerate(lines):
        if l.strip().startswith(start_marker):
            si = i
            break
    if si is None:
        raise SystemExit("section not found: " + start_marker)
    ei = len(lines)
    for i in range(si + 1, len(lines)):
        if any(lines[i].strip().startswith(m) for m in end_markers):
            ei = i
            break
    return "\n".join(lines[si:ei])

def strip_refs(t):
    t = re.sub(r"<ref[^>/]*/>", "", t)
    t = re.sub(r"<ref[^>]*>.*?</ref>", "", t, flags=re.S)
    return t

def clean_cell(t):
    t = strip_refs(t)
    t = re.sub(r"\[\[Datei:[^\]]*\]\]", "", t)
    t = re.sub(r"\{\{0\}\}", "", t)
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    return t.strip()

def dewiki(t):
    """wiki markup -> plain text, keep first link target."""
    link = None
    m = re.search(r"\[\[([^\]|]+)(?:\|([^\]]*))?\]\]", t)
    if m and not m.group(1).startswith("Datei:"):
        link = m.group(1)
    t = re.sub(r"\[\[(?:[^\]|]+)\|([^\]]*)\]\]", r"\1", t)
    t = re.sub(r"\[\[([^\]]+)\]\]", r"\1", t)
    t = t.replace("''", "").replace("&nbsp;", " ").replace("&shy;", "")
    return t.strip(), link

def split_rows(table_text):
    """Split a wikitable body into rows of raw cell strings."""
    body = table_text.split("|-", 1)
    if len(body) < 2:
        return []
    rows_raw = re.split(r"\n\|\-", "\n" + body[1])
    rows = []
    for rr in rows_raw:
        cells = []
        cur = None
        for ln in rr.split("\n"):
            if ln.startswith("!"):  # header remnant
                cur = None
                continue
            if ln.startswith("|") and not ln.startswith("|}"):
                content = ln[1:]
                # handle inline || separators (and stray ||| typos)
                parts = re.split(r"\|\|+", content)
                for j, p in enumerate(parts):
                    # strip cell attributes like rowspan="2" |
                    pm = re.match(r'\s*(?:rowspan|colspan|style|align)[^|]*\|(?!\|)(.*)$', p)
                    if pm:
                        p = pm.group(1)
                    if j == 0 and cells and cur is not None and False:
                        pass
                    cells.append(p)
                    cur = len(cells) - 1
            elif cur is not None and not ln.startswith("|}"):
                cells[cur] += "\n" + ln
        cells = [c for c in cells]
        if cells:
            rows.append(cells)
    return rows

def parse_zeitraum(t):
    t = t.replace("\n", " ")
    dates = re.findall(r"(\d{2})\.(\d{2})\.(\d{4})", t)
    von = bis = None
    if dates:
        von = "%s-%s-%s" % (dates[0][2], dates[0][1], dates[0][0])
    if "bis" in t and len(dates) > 1:
        bis = "%s-%s-%s" % (dates[1][2], dates[1][1], dates[1][0])
    return von, bis

def parse_baureihe(t):
    t, _ = dewiki(clean_cell(t))
    t = t.replace("\n", " ")
    m = re.search(r"Baureihe\s+([\d/ ]+\d)", t)
    br = m.group(1).strip() if m else None
    m2 = re.search(r"\(([^)]+)\)", t)
    typ = m2.group(1).replace(" ", " ").strip() if m2 else None
    return br, typ

def parse_name_cell(t):
    t = clean_cell(t)
    first = t.split("<br")[0].split("\n")[0]
    name, link = dewiki(first)
    return name.strip().strip('"„“'), link

# ---------- Table 1: Regionen (IC2 / ICE4 / etc.) ----------
sec = section("== Namensgebung IC/ICE-Z", ["== Namensgebung ICE-Triebz"])
tbl = sec[sec.index("{|"):]
regionen = []
for cells in split_rows(tbl):
    if len(cells) < 4:
        continue
    dm = re.search(r"DatumZelle\|(\d{4}-\d{2}-\d{2})(\|[^}]*)?\}\}", cells[0])
    if not dm:
        continue
    von = dm.group(1)
    bis = None
    extra = cells[0]
    bm = re.search(r"bis (\d{1,2})\.\s*([A-Za-zäöü]+)\s*(\d{4})", extra)
    MON = {"Januar":"01","Februar":"02","März":"03","April":"04","Mai":"05","Juni":"06","Juli":"07","August":"08","September":"09","Oktober":"10","November":"11","Dezember":"12"}
    if bm and bm.group(2) in MON:
        bis = "%s-%s-%02d" % (bm.group(3), MON[bm.group(2)], int(bm.group(1)))
    ort, _ = dewiki(clean_cell(cells[1]))
    tzcell = clean_cell(cells[2]).split("<br")[0].split("\n")[0]
    tz = dewiki(tzcell)[0].strip()
    name, link = parse_name_cell(cells[3])
    regionen.append({"name": name, "link": link, "von": von, "bis": bis,
                     "ort": ort.replace("\n", " "), "tz": tz})

# ---------- helper for the three Gemeinde tables ----------
def parse_gemeinde_table(sec_text, has_nr):
    tbl = sec_text[sec_text.index("{|"):]
    out = []
    for cells in split_rows(tbl):
        cells = [c for c in cells]
        if has_nr:
            if len(cells) < 7:
                continue
            nr_t = clean_cell(cells[0]).strip()
            nr = int(nr_t) if re.match(r"^\d+$", nr_t) else None
            zeit, ort_c, br_c, tz_c, wagen_c, name_c = cells[1], cells[2], cells[3], cells[4], cells[5], cells[6]
            bem = cells[7] if len(cells) > 7 else ""
        else:
            if len(cells) < 5:
                continue
            nr = None
            zeit, br_c, tz_c, wagen_c, name_c = cells[0], cells[1], cells[2], cells[3], cells[4]
            ort_c = ""
            bem = cells[5] if len(cells) > 5 else ""
        von, bis = parse_zeitraum(clean_cell(zeit))
        if not von:
            continue
        ort, _ = dewiki(clean_cell(ort_c))
        br, typ = parse_baureihe(br_c)
        tz = dewiki(clean_cell(tz_c))[0].split("\n")[0].strip()
        name, link = parse_name_cell(name_c)
        bem_txt, _ = dewiki(clean_cell(bem))
        out.append({"nr": nr, "von": von, "bis": bis, "ort": ort.replace("\n", " "),
                    "baureihe": br, "typ": typ, "tz": tz, "name": name,
                    "link": link, "bem": bem_txt.replace("\n", " ")[:200]})
    return out

sec_u = section("=== Ursprüngliche Zugtaufen", ["=== Nachträgliche"])
urspruenglich = parse_gemeinde_table(sec_u, True)

sec_n = section("=== Nachträgliche Änderungen", ["=== Übertragung"])
nachtraeglich = parse_gemeinde_table(sec_n, False)

sec_t = section("=== Übertragung von Namen", ["== Namensgebung ICE-Mittelwagen"])
uebertragung = parse_gemeinde_table(sec_t, False)

print("regionen:", len(regionen))
print("urspruenglich:", len(urspruenglich))
print("nachtraeglich:", len(nachtraeglich))
print("uebertragung:", len(uebertragung))

json.dump({"regionen": regionen, "urspruenglich": urspruenglich,
           "nachtraeglich": nachtraeglich, "uebertragung": uebertragung},
          open("parsed.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# sanity samples
for r in urspruenglich[:5]:
    print(r)
print("...")
for r in uebertragung[:3]:
    print(r)
