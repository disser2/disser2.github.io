# -*- coding: utf-8 -*-
"""Goodreads-Export → data/books.js (inkl. Open-Library-Covern und -Themen).

    python3 tools/build_books.py                       # liest data/goodreads_library_export.csv
    python3 tools/build_books.py ~/Downloads/goodreads_library_export.csv
    python3 tools/build_books.py --offline             # ohne Open Library
    python3 tools/build_books.py --include-to-read     # auch "Will ich lesen"

Was passiert:
  * Private Notizen werden entfernt (die Datei ist auf GitHub Pages öffentlich).
  * Pro Buch wird Open Library gefragt (kostenlos, ohne Key, ~1 Anfrage/s):
    zuerst per ISBN, sonst per Titel + Autor:in. Übernommen werden Cover-ID,
    Schlagwörter, Erscheinungsjahr, Seitenzahl und Autor-ID – aber nur, wenn
    der gefundene Titel zum Buch passt.
  * Ergebnisse landen in tools/.ol_cache.json, ein zweiter Lauf geht schnell.

Die Schlüssel (ISBN bzw. Titel|Autor) sind identisch zu js/model.js, damit die
App die Anreicherung direkt verwendet und selbst nichts mehr nachschlagen muss.
"""
import argparse, csv, datetime as dt, io, json, os, re, sys, time, unicodedata
import urllib.parse, urllib.request

BASE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.normpath(os.path.join(BASE, ".."))
CACHE = os.path.join(BASE, ".ol_cache.json")
FIELDS = "key,title,author_name,author_key,cover_i,subject,first_publish_year,number_of_pages_median"
UA = "Buecherregal/1.0 (persoenliches Regal auf GitHub Pages)"
STOP = {"the", "a", "an", "der", "die", "das", "ein", "eine", "and", "und", "of", "von"}


def norm(s):
    s = (s or "").lower().replace("ß", "ss")
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c))


def key_norm(s):
    return re.sub(r"[^a-z0-9]+", "", norm(s))


def clean_isbn(s):
    return re.sub(r"[^0-9X]", "", re.sub(r'[="\s]', "", s or "").upper())


def short_title(raw):
    t = (raw or "").strip()
    m = re.search(r"\s*\(([^()]*?),?\s*#\s*([\d.]+)[^()]*\)\s*$", t)
    if m:
        t = t[:m.start()].strip()
    return t.split(": ")[0].strip() or t


def author_last(row):
    lf = (row.get("Author l-f") or "").strip()
    if lf:
        return lf.split(",")[0].strip()
    parts = (row.get("Author") or "").split()
    return parts[-1] if parts else ""


def ol_key(row):
    i13, i10 = clean_isbn(row.get("ISBN13")), clean_isbn(row.get("ISBN"))
    if len(i13) == 13:
        return i13
    if len(i10) == 10:
        return i10
    return "t:" + key_norm(short_title(row.get("Title"))) + "|" + key_norm(author_last(row))


def words(s):
    return {w for w in re.sub(r"[^a-z0-9]+", " ", norm(s)).split() if w not in STOP}


def similar(a, b):
    x, y = words(a), words(b)
    if not x or not y:
        return 0
    return len(x & y) / min(len(x), len(y))


def fetch(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 429:
                time.sleep(30)
                continue
            if i == tries - 1:
                raise
        except Exception:
            if i == tries - 1:
                raise
        time.sleep(2 * (i + 1))


def pick(docs, title, last):
    best, best_score = None, 0
    for d in docs or []:
        sim = similar(d.get("title", ""), title)
        auth = any(norm(last) in norm(n) for n in d.get("author_name", []) or [])
        score = sim + (0.5 if auth else 0) + (0.15 if d.get("cover_i") else 0)
        if sim >= 0.6 and score > best_score:
            best, best_score = d, score
    return best


def lookup(row):
    title, last = short_title(row.get("Title")), author_last(row)
    base = "https://openlibrary.org/search.json?fields=" + FIELDS + "&limit="
    isbn = clean_isbn(row.get("ISBN13")) or clean_isbn(row.get("ISBN"))
    doc = None
    if isbn:
        doc = pick(fetch(base + "3&q=isbn:" + isbn).get("docs"), title, last)
        time.sleep(1)
    if not doc or not doc.get("cover_i"):
        q = "&title=" + urllib.parse.quote(title) + ("&author=" + urllib.parse.quote(last) if last else "")
        doc = pick(fetch(base + "5" + q).get("docs"), title, last) or doc
        time.sleep(1)
    now = int(time.time() * 1000)
    if not doc:
        return {"c": 0, "t": now}
    return {
        "c": doc.get("cover_i") or 0,
        "w": doc.get("key", ""),
        "a": (doc.get("author_key") or [""])[0],
        "s": [s for s in (doc.get("subject") or []) if len(s) < 60][:25],
        "y": doc.get("first_publish_year"),
        "p": doc.get("number_of_pages_median"),
        "t": now,
    }


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv", nargs="?", default=os.path.join(APP, "data", "goodreads_library_export.csv"))
    ap.add_argument("--out", default=os.path.join(APP, "data", "books.js"))
    ap.add_argument("--offline", action="store_true", help="Open Library nicht abfragen")
    ap.add_argument("--include-to-read", action="store_true", help="auch Bücher vom Regal 'to-read' übernehmen")
    args = ap.parse_args()

    text = io.open(args.csv, encoding="utf-8-sig").read()
    delim = ";" if text.split("\n", 1)[0].count(";") > text.split("\n", 1)[0].count(",") else ","
    rows = list(csv.DictReader(io.StringIO(text), delimiter=delim))
    if not rows or "Title" not in rows[0]:
        sys.exit("Das sieht nicht nach einem Goodreads-Export aus (Spalte 'Title' fehlt).")
    for r in rows:
        r.pop("Private Notes", None)
    if not args.include_to_read:
        rows = [r for r in rows if (r.get("Exclusive Shelf") or "read").strip() != "to-read"]

    cache = json.load(io.open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
    enrichment = {}
    if not args.offline:
        todo = [r for r in rows if ol_key(r) not in cache]
        print("Open Library:", len(rows) - len(todo), "aus dem Cache,", len(todo), "neu nachschlagen …")
        for i, r in enumerate(todo, 1):
            k = ol_key(r)
            try:
                cache[k] = lookup(r)
            except Exception as e:  # Netzfehler: Buch bleibt ohne Anreicherung
                print("  !", r.get("Title"), "→", e)
                continue
            mark = "✓" if cache[k].get("c") else "·"
            print("  %s %3d/%d  %s" % (mark, i, len(todo), r.get("Title")[:70]))
            if i % 10 == 0:
                json.dump(cache, io.open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
        json.dump(cache, io.open(CACHE, "w", encoding="utf-8"), ensure_ascii=False)
    for r in rows:
        k = ol_key(r)
        if k in cache:
            enrichment[k] = cache[k]

    data = {"generated": dt.datetime.now(dt.timezone.utc).isoformat(), "source": "goodreads",
            "rows": rows, "enrichment": enrichment}
    js = ("// Erzeugt von tools/build_books.py – ohne private Notizen.\n"
          "window.BOOKSHELF_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n")
    io.open(args.out, "w", encoding="utf-8").write(js)
    covers = sum(1 for v in enrichment.values() if v.get("c"))
    print("books.js:", len(rows), "Bücher,", covers, "mit Cover,", round(len(js) / 1024), "KB →", args.out)


if __name__ == "__main__":
    main()
