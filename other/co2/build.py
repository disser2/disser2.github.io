"""Baut luftrelief.html aus dem neuesten SwitchBot-CSV-Export in diesem Ordner.

Aufruf:  python build.py [pfad/zum/export.csv]

Das Skript legt die Messwerte auf ein Raster aus Tagen x 30-Minuten-Slots,
behaelt nur vollstaendig abgedeckte Randtage, interpoliert einzelne Luecken
(z. B. die Zeitumstellung) linear und bettet das Ergebnis in die Vorlage ein.
"""
import bisect
import csv
import datetime as dt
import json
import pathlib
import sys

HERE = pathlib.Path(__file__).parent
TEMPLATE = HERE / "luftrelief.template.html"
OUT = HERE / "luftrelief.html"
SLOTS = 48
# Spaltenreihenfolge des Exports -> (Schluessel, Skalierung fuer Ganzzahlen)
COLUMNS = [("t", 10), ("rh", 1), ("co2", 1), ("ah", 10), ("dpt", 10), ("vpd", 100)]
# Ein Randtag zaehlt als vollstaendig, wenn hoechstens so viele Slots fehlen
MAX_MISSING_EDGE = 2

STANDALONE_HEAD = (
    '<!doctype html>\n<html lang="de">\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
)


def read_rows(path):
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) < 7 or not row[0]:
                continue
            try:
                ts = dt.datetime.strptime(row[0], "%Y-%m-%d %H:%M:%S")
                values = [float(v) for v in row[1:7]]
            except ValueError:
                continue
            yield ts, values


def build_grid(path):
    cells = {}
    for ts, values in read_rows(path):
        # auf den naechsten 30-Minuten-Slot runden
        slot = int((ts.hour * 60 + ts.minute + 15) // 30)
        day = ts.date()
        if slot == SLOTS:
            slot, day = 0, day + dt.timedelta(days=1)
        cells[(day, slot)] = values
    if not cells:
        sys.exit("Keine Messwerte gefunden.")

    days = sorted({d for d, _ in cells})
    first, last = days[0], days[-1]

    def missing(day):
        return sum((day, s) not in cells for s in range(SLOTS))

    while first < last and missing(first) > MAX_MISSING_EDGE:
        first += dt.timedelta(days=1)
    while last > first and missing(last) > MAX_MISSING_EDGE:
        last -= dt.timedelta(days=1)

    n_days = (last - first).days + 1
    total = n_days * SLOTS
    series = [[None] * total for _ in COLUMNS]
    measured = 0
    for (day, slot), values in cells.items():
        if first <= day <= last:
            idx = (day - first).days * SLOTS + slot
            measured += 1
            for k, v in enumerate(values):
                series[k][idx] = v

    # Luecken linear entlang der Zeit schliessen und merken
    gaps = [i for i in range(total) if series[0][i] is None]
    for col in series:
        known = [i for i in range(total) if col[i] is not None]
        for i in gaps:
            pos = bisect.bisect_left(known, i)
            left = known[pos - 1] if pos > 0 else None
            right = known[pos] if pos < len(known) else None
            if left is None:
                col[i] = col[right]
            elif right is None:
                col[i] = col[left]
            else:
                w = (i - left) / (right - left)
                col[i] = col[left] * (1 - w) + col[right] * w

    data = {
        "start": first.isoformat(),
        "days": n_days,
        "slots": SLOTS,
        "measured": measured,
        "gaps": gaps,
        "source": pathlib.Path(path).name,
        "scale": {key: scale for key, scale in COLUMNS},
        "m": {
            key: [int(round(v * scale)) for v in series[k]]
            for k, (key, scale) in enumerate(COLUMNS)
        },
    }
    return data


def main():
    if len(sys.argv) > 1:
        source = pathlib.Path(sys.argv[1])
    else:
        exports = sorted(HERE.glob("*.csv"), key=lambda p: p.stat().st_mtime)
        if not exports:
            sys.exit("Kein CSV-Export in diesem Ordner gefunden.")
        source = exports[-1]

    data = build_grid(source)
    payload = "const DATA = " + json.dumps(data, separators=(",", ":"), ensure_ascii=False) + ";"
    template = TEMPLATE.read_text(encoding="utf-8")
    if "/*__DATA__*/" not in template:
        sys.exit("Platzhalter /*__DATA__*/ fehlt in der Vorlage.")
    page = template.replace("/*__DATA__*/", payload)

    OUT.write_text(STANDALONE_HEAD + page, encoding="utf-8")
    print(f"{OUT.name}: {data['days']} Tage, {data['measured']} Messungen, "
          f"{len(data['gaps'])} interpolierte Slots, {OUT.stat().st_size / 1024:.0f} kB")

    # Variante ohne Dokumentkopf (fuer Hosts, die ihn selbst setzen)
    if len(sys.argv) > 2:
        pathlib.Path(sys.argv[2]).write_text(page, encoding="utf-8")


if __name__ == "__main__":
    main()
