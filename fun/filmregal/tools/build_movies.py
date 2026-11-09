#!/usr/bin/env python3
"""Filmregal: Trakt-Export (ZIP) -> data/movies.js

    python tools/build_movies.py pfad/zum/trakt-export.zip
    python tools/build_movies.py export.zip --offline            # nur Cache, keine Abfragen
    python tools/build_movies.py export.zip --download-posters   # Plakate nach data/posters/

Aus dem Export werden nur die Film-Dateien gelesen (watched-movies, watched-history,
ratings-movies, Watchlist, Listen, eigene Kommentare). Serien, Netzwerk, Profil und
Einstellungen bleiben unberührt und landen nicht in movies.js.

Laufzeit, Regie, Besetzung, Genres, Land und der deutsche Titel kommen über die
IMDb-ID aus Wikidata, das Plakat aus dem englischen Wikipedia-Artikel – kostenlos
und ohne API-Key. Ergebnisse liegen in tools/.enrich_cache.json; ein neuer Lauf
fragt nur neue Filme ab. Dieselbe Logik steckt in js/trakt.js und js/enrich.js.
"""
import argparse
import csv
import datetime
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
CACHE = Path(__file__).resolve().parent / ".enrich_cache.json"
GENRES_CSV = DATA / "genres.csv"
POSTERS = DATA / "posters"
UA = "filmregal-build/1.0 (static site generator; python-urllib)"
SPARQL = "https://query.wikidata.org/sparql"
WIKI_API = "https://en.wikipedia.org/w/api.php"
BATCH = 40
MAX_CAST = 30
WANTED = re.compile(r"(^|/)(watched-movies|watched-history|ratings-movies|lists-watchlist|lists-favorites|"
                    r"lists-lists|lists-list-|comments-movies)[^/]*\.json$")


# ---------- Trakt-Export -> Zeilen (wie js/trakt.js) ----------
def read_export(path):
    files = {}
    path = Path(path)
    if path.is_dir():
        for f in path.glob("*.json"):
            if WANTED.search(f.name):
                files[f.name] = json.loads(f.read_text(encoding="utf-8"))
    else:
        with zipfile.ZipFile(path) as z:
            for name in z.namelist():
                if WANTED.search(name):
                    files[name.split("/")[-1]] = json.loads(z.read(name).decode("utf-8"))
    return files


def to_rows(files, watchlist=True):
    names = sorted(files)

    def every(prefix):
        out = []
        for n in names:
            if n.startswith(prefix) and isinstance(files[n], list):
                out += files[n]
        return out

    rows = {}

    def row(m, status):
        ids = m.get("ids") or {}
        key = str(ids.get("trakt", "%s|%s" % (m.get("title"), m.get("year"))))
        r = rows.get(key)
        if r is None:
            r = rows[key] = {"id": key, "t": m.get("title") or "", "y": m.get("year"), "imdb": ids.get("imdb") or "",
                             "tmdb": ids.get("tmdb"), "slug": ids.get("slug") or "", "w": [], "st": status}
        elif status == "watched":
            r["st"] = "watched"
        return r

    last = {}
    for e in every("watched-movies"):
        if e.get("movie"):
            last[row(e["movie"], "watched")["id"]] = e.get("last_watched_at")
    for e in every("watched-history"):
        if e.get("type") == "movie" and e.get("movie") and e.get("watched_at"):
            row(e["movie"], "watched")["w"].append(e["watched_at"])
    for r in rows.values():
        if not r["w"] and last.get(r["id"]):
            r["w"].append(last[r["id"]])
        r["w"].sort()
    for e in every("ratings-movies"):
        r = rows.get(str(((e.get("movie") or {}).get("ids") or {}).get("trakt")))
        if r and e.get("rating"):
            r["r"] = e["rating"]
            if e.get("rated_at"):
                r["ra"] = e["rated_at"]
    if watchlist:
        for e in every("lists-watchlist"):
            if e.get("type") == "movie" and e.get("movie"):
                r = row(e["movie"], "watchlist")
                if e.get("listed_at"):
                    r["la"] = e["listed_at"]

    def add_list(entries, name):
        for e in entries:
            if e.get("type") != "movie" or not e.get("movie"):
                continue
            r = rows.get(str(e["movie"]["ids"].get("trakt")))
            if r is None:
                if not watchlist:
                    continue
                r = row(e["movie"], "watchlist")
            lists = r.setdefault("lists", [])
            if name not in lists:
                lists.append(name)

    add_list(every("lists-favorites"), "Favoriten")
    list_names = {str(l["ids"]["trakt"]): l.get("name") for l in every("lists-lists") if l.get("ids")}
    for n in names:
        m = re.match(r"^lists-list-(\d+)-(.+)\.json$", n)
        if m and isinstance(files[n], list):
            add_list(files[n], list_names.get(m.group(1)) or m.group(2).replace("-", " "))
    for e in every("comments-movies"):
        c = e.get("comment") or {}
        r = rows.get(str(((e.get("movie") or {}).get("ids") or {}).get("trakt")))
        if r and c.get("comment") and not c.get("parent_id") and "c" not in r:
            r["c"] = c["comment"]
            if c.get("spoiler"):
                r["cs"] = True
    return list(rows.values())


# ---------- Wikidata & Wikipedia (wie js/enrich.js) ----------
def fetch_json(url, tries=6):
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as res:
                return json.loads(res.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < tries - 1:
                time.sleep(min(90, float(e.headers.get("Retry-After") or 0) + 3 or 5 * (attempt + 1)))
                continue
            raise
        except (urllib.error.URLError, TimeoutError):
            if attempt == tries - 1:
                raise
            time.sleep(3 * (attempt + 1))


def sparql(ids):
    # Reihenfolge fest vorgeben: Der Planer von Wikidata wählt sonst oft einen Plan, der in den Timeout läuft.
    return ('SELECT ?imdb ?item ?p ?l WHERE { hint:Query hint:optimizer "None" . '
            "VALUES ?imdb { " + " ".join('"%s"' % i for i in ids) + " } "
            "?item wdt:P345 ?imdb . "
            '{ ?item rdfs:label ?l . FILTER(LANG(?l) = "de") BIND("de" AS ?p) } '
            'UNION { ?item wdt:P2047 ?l . BIND("rt" AS ?p) } '
            'UNION { ?item wdt:P3383 ?l . BIND("po" AS ?p) } '
            'UNION { VALUES (?p ?prop) { ("g" wdt:P136) ("d" wdt:P57) ("c" wdt:P161) ("co" wdt:P495) ("l" wdt:P364) } '
            '?item ?prop ?v . OPTIONAL { ?v rdfs:label ?lde . FILTER(LANG(?lde) = "de") } '
            'OPTIONAL { ?v rdfs:label ?len . FILTER(LANG(?len) = "en") } BIND(COALESCE(?lde, ?len) AS ?l) } '
            'UNION { ?l schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> . BIND("en" AS ?p) } '
            'UNION { ?l schema:about ?item ; schema:isPartOf <https://de.wikipedia.org/> . BIND("dw" AS ?p) } }')


def collect(bindings):
    out = {}
    for b in bindings:
        imdb, item = b.get("imdb", {}).get("value"), b.get("item", {}).get("value")
        if not imdb or not item or "p" not in b or "l" not in b:
            continue
        r = out.setdefault(imdb, {"item": item, "de": "", "rt": [], "po": "", "g": [], "d": [], "c": [], "co": [],
                                  "l": [], "en": "", "dw": ""})
        if r["item"] != item:
            continue
        p, v = b["p"]["value"], b["l"]["value"]
        if p == "rt":
            try:
                r["rt"].append(float(v))
            except ValueError:
                pass
        elif isinstance(r[p], list):
            if v not in r[p]:
                r[p].append(v)
        elif not r[p]:
            r[p] = v
    recs = {}
    for imdb, r in out.items():
        mins = [x / 60 if x > 600 else x for x in r["rt"] if x > 0]
        mins = [x for x in mins if x >= 1]
        feature = [x for x in mins if x >= 40]
        rt = min(feature) if feature else max(mins) if mins else None
        rec = {"q": r["item"].split("/")[-1], "t": int(time.time() * 1000)}
        if r["de"]:
            rec["de"] = r["de"]
        if rt:
            rec["rt"] = round(rt)
        for key, limit in (("g", 8), ("d", 4), ("c", MAX_CAST), ("co", 4), ("l", 3)):
            if r[key]:
                rec[key] = r[key][:limit]
        if r["dw"] or r["en"]:
            rec["wp"] = r["dw"] or r["en"]
        if r["po"]:
            rec["img"] = re.sub(r"^http:", "https:", r["po"]) + "?width=500"
        recs[imdb] = (rec, r["en"])
    return recs


def wiki_title(url):
    return urllib.parse.unquote(url.split("/wiki/", 1)[1]).replace("_", " ") if "/wiki/" in url else ""


def posters(titles):
    out = {}
    if not titles:
        return out
    q = urllib.parse.urlencode({"action": "query", "format": "json", "redirects": 1, "prop": "pageimages",
                                "piprop": "thumbnail", "pithumbsize": 500, "pilicense": "any", "pilimit": 50,
                                "titles": "|".join(titles)})
    data = (fetch_json(WIKI_API + "?" + q) or {}).get("query") or {}
    alias = {}
    for m in (data.get("normalized") or []) + (data.get("redirects") or []):
        alias.setdefault(m["to"], []).append(m["from"])
    for pg in (data.get("pages") or {}).values():
        src = (pg.get("thumbnail") or {}).get("source")
        if not src:
            continue
        todo = [pg["title"]]
        for name in todo:
            for a in alias.get(name, []):
                if a not in todo:
                    todo.append(a)
        for name in todo:
            out[name] = src
    return out


def key_of(r):
    return r["imdb"] or "t:" + r["id"]


def enrich(rows, cache):
    """Erst die Metadaten aus Wikidata, dann die Plakate. Die Wikipedia-API drosselt
    gelegentlich (HTTP 429); dann bleiben die Plakate offen und der nächste Lauf holt sie nach."""
    todo = [r for r in rows if key_of(r) not in cache]
    for i in range(0, len(todo), BATCH):
        batch = todo[i:i + BATCH]
        ids = [r["imdb"] for r in batch if re.match(r"^tt\d+$", r["imdb"] or "")]
        data = fetch_json(SPARQL + "?" + urllib.parse.urlencode({"format": "json", "query": sparql(ids)})) if ids else {}
        recs = collect((data.get("results") or {}).get("bindings") or [])
        for r in batch:
            rec, en = recs.get(r["imdb"], ({"t": int(time.time() * 1000)}, ""))
            if en and not rec.get("img"):
                rec["en"] = wiki_title(en)  # Artikel, in dem das Plakat steht
            cache[key_of(r)] = rec
        CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
        print("  Wikidata: %d/%d Filme" % (min(i + BATCH, len(todo)), len(todo)), flush=True)
        time.sleep(1)

    # "en" ohne "img" heißt: Plakat noch nicht gesucht ("ni" = Artikel hat kein Bild)
    open_recs = [cache[key_of(r)] for r in rows if key_of(r) in cache]
    open_recs = [rec for rec in open_recs if rec.get("en") and not rec.get("img") and not rec.get("ni")]
    for i in range(0, len(open_recs), BATCH):
        batch = open_recs[i:i + BATCH]
        try:
            imgs = posters(sorted({rec["en"] for rec in batch}))
        except urllib.error.URLError as e:
            print("  Plakate: Wikipedia antwortet nicht (%s) – %d bleiben offen, einfach später erneut starten."
                  % (e, len(open_recs) - i))
            break
        for rec in batch:
            if imgs.get(rec["en"]):
                rec["img"] = imgs[rec["en"]]
            else:
                rec["ni"] = 1
        CACHE.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")
        print("  Plakate: %d/%d Filme" % (min(i + BATCH, len(open_recs)), len(open_recs)), flush=True)
        time.sleep(3)
    return {key_of(r): cache[key_of(r)] for r in rows if key_of(r) in cache}


def download_posters(rows, enrichment):
    POSTERS.mkdir(parents=True, exist_ok=True)
    n = 0
    for r in rows:
        rec = enrichment.get(r["imdb"] or "t:" + r["id"])
        target = POSTERS / (r["id"] + ".jpg")
        if target.exists() or not rec or not str(rec.get("img", "")).startswith("http"):
            continue  # ein eigenes Bild unter diesem Namen wird nie überschrieben
        try:
            url = re.sub(r"/\d+px-([^/]+)$", r"/330px-\1", rec["img"]).replace("width=500", "width=330")
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=60) as res:
                target.write_bytes(res.read())
            n += 1
            time.sleep(0.2)
        except (urllib.error.URLError, TimeoutError) as e:
            print("  Plakat fehlt: %s (%s)" % (r["t"], e))
    print("%d Plakate geladen" % n)


# ---------- Genres von Hand ----------
def manual_genres(rows, enrichment):
    """data/genres.csv (Semikolon, öffnet in Excel): Trakt Id;Titel;Jahr;Genres.
    Eine gefüllte Spalte "Genres" geht vor der automatischen Zuordnung; neue Filme werden angehängt."""
    manual, known = {}, set()
    if GENRES_CSV.exists():
        with GENRES_CSV.open(encoding="utf-8-sig", newline="") as f:
            for line in csv.DictReader(f, delimiter=";"):
                known.add(line.get("Trakt Id", ""))
                keys = [k.strip().lower() for k in (line.get("Genres") or "").split(",") if k.strip()]
                if keys:
                    manual[line["Trakt Id"]] = keys
    new = [r for r in rows if r["id"] not in known]
    if new:
        fresh = not GENRES_CSV.exists()
        with GENRES_CSV.open("a", encoding="utf-8", newline="") as f:
            w = csv.writer(f, delimiter=";")
            if fresh:
                w.writerow(["Trakt Id", "Titel", "Jahr", "Genres"])
            for r in new:
                w.writerow([r["id"], r["t"], r["y"] or "", ""])
    for r in rows:
        if r["id"] in manual:
            enrichment.setdefault(r["imdb"] or "t:" + r["id"], {})["th"] = manual[r["id"]]
    return len(manual)


def main():
    ap = argparse.ArgumentParser(description="Trakt-Export -> data/movies.js")
    ap.add_argument("export", help="ZIP-Datei oder entpackter Ordner des Trakt-Exports")
    ap.add_argument("--offline", action="store_true", help="nichts nachschlagen, nur den Cache verwenden")
    ap.add_argument("--no-watchlist", action="store_true", help="nur gesehene Filme übernehmen")
    ap.add_argument("--download-posters", action="store_true", help="Plakate nach data/posters/<Trakt-Id>.jpg laden")
    args = ap.parse_args()

    rows = to_rows(read_export(args.export), watchlist=not args.no_watchlist)
    if not rows:
        sys.exit("Keine Filme gefunden – ist das ein Trakt-Export?")
    seen = sum(1 for r in rows if r["st"] == "watched")
    print("%d Filme (%d gesehen, %d bewertet)" % (len(rows), seen, sum(1 for r in rows if r.get("r"))))

    cache = json.loads(CACHE.read_text(encoding="utf-8")) if CACHE.exists() else {}
    if args.offline:
        enrichment = {k: cache[k] for k in (r["imdb"] or "t:" + r["id"] for r in rows) if k in cache}
    else:
        try:
            enrichment = enrich(rows, cache)
        except (urllib.error.URLError, TimeoutError) as e:
            print("Wikidata nicht erreichbar (%s) – weiter ohne neue Anreicherung." % e)
            enrichment = {k: cache[k] for k in (r["imdb"] or "t:" + r["id"] for r in rows) if k in cache}
    enrichment = {k: {f: x for f, x in v.items() if f not in ("en", "ni")} for k, v in enrichment.items()}
    if args.download_posters and not args.offline:
        download_posters(rows, enrichment)
    for rec in enrichment.values():  # Zählparameter der Wikipedia-API braucht niemand
        if "img" in rec:
            rec["img"] = re.sub(r"\?utm_.*$", "", rec["img"])
    for r in rows:  # lokale Plakate gehen vor
        if (POSTERS / (r["id"] + ".jpg")).exists():
            enrichment.setdefault(r["imdb"] or "t:" + r["id"], {})["img"] = "data/posters/%s.jpg" % r["id"]
    by_hand = manual_genres(rows, enrichment)

    data = {"generated": datetime.datetime.now(datetime.timezone.utc).isoformat(), "source": "trakt",
            "movies": rows, "enrichment": enrichment}
    out = DATA / "movies.js"
    out.write_text("// Erzeugt von tools/build_movies.py aus dem Trakt-Export (nur Filme).\n"
                   "window.FILMREGAL_DATA = " + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n",
                   encoding="utf-8")
    found = sum(1 for v in enrichment.values() if v.get("q"))
    print("%s geschrieben: %d Filme, %d bei Wikidata gefunden, %d mit Plakat, %d Genres von Hand"
          % (out.relative_to(ROOT), len(rows), found, sum(1 for v in enrichment.values() if v.get("img")), by_hand))


if __name__ == "__main__":
    main()
