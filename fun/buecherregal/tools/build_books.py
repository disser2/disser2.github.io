# -*- coding: utf-8 -*-
"""Goodreads-Export → data/books.js + data/covers/ (Cover, Seitenzahlen, Schlagwörter, Themen).

    python tools/build_books.py                       # liest data/goodreads_library_export.csv
    python tools/build_books.py ~/Downloads/goodreads_library_export.csv
    python tools/build_books.py --include-to-read     # auch "Will ich lesen"
    python tools/build_books.py --offline             # nichts nachschlagen, nur Cache + Themen
    python tools/build_books.py --retry               # "nichts gefunden" erneut versuchen

Was passiert:
  * Private Notizen werden entfernt (die Datei ist auf GitHub Pages öffentlich).
  * Pro Buch werden kostenlose Quellen ohne Key gefragt:
      1. Open Library per ISBN (api/books, 40 ISBN pro Anfrage)  → Cover, Seiten, Schlagwörter
      2. Deutsche Nationalbibliothek per ISBN (SRU + Cover)      → Cover, Seiten, Sachgruppe,
         Schlagwörter – deckt deutsche Ausgaben ab, die Open Library oft nicht kennt
      3. Open Library per Titel + Autor:in (search.json)         → Cover & Schlagwörter des Werks
      4. DNB per Titel + Autor:in (für Ausgaben ohne ISBN, z. B. Kindle)
    Ein Treffer zählt nur, wenn Titel bzw. Autor:in zum Buch passen.
  * Cover werden nach data/covers/<Book Id>.jpg geladen (mit Pillow auf Regalgröße verkleinert).
    Die DNB erlaubt kein Einbinden per <img>, darum liegen die Bilder lokal.
  * Themen: data/themen.csv ordnet jedem Buch von Hand Themen zu (Schlüssel aus GENRES in
    js/model.js, das erste ist das Hauptthema). Leere Zeilen sortiert die App automatisch
    anhand der Schlagwörter. Neue Bücher werden beim Lauf als leere Zeilen angehängt.
  * Ergebnisse landen in tools/.enrich_cache.json, ein zweiter Lauf geht schnell.

Die Schlüssel (ISBN bzw. Titel|Autor) sind identisch zu js/model.js, damit die
App die Anreicherung direkt verwendet und selbst nichts mehr nachschlagen muss.
"""
import argparse, concurrent.futures as cf, csv, datetime as dt, io, json, os, re, sys, threading, time
import unicodedata, urllib.error, urllib.parse, urllib.request
import xml.etree.ElementTree as ET

try:
    from PIL import Image
except ImportError:  # ohne Pillow bleiben die Cover in Originalgröße
    Image = None

BASE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.normpath(os.path.join(BASE, ".."))
CACHE = os.path.join(BASE, ".enrich_cache.json")
COVER_DIR = os.path.join(APP, "data", "covers")
THEMES = os.path.join(APP, "data", "themen.csv")
FIELDS = ("key,title,author_name,author_key,cover_i,subject,first_publish_year,number_of_pages_median,"
          "editions,editions.title,editions.cover_i")
UA = "Buecherregal/1.0 (persoenliches Regal auf GitHub Pages)"
STOP = {"the", "a", "an", "der", "die", "das", "ein", "eine", "and", "und", "of", "von"}
RETRY_NONE_S = 30 * 86400  # "nichts gefunden" nach 30 Tagen erneut versuchen
COVER_MAX = (420, 660)

# DDC-Sachgruppen der Deutschen Nationalbibliografie → Schlagwort für die Themenzuordnung
SACHGRUPPEN = {
    "000": "Allgemeines, Wissenschaft", "004": "Informatik", "020": "Bibliotheks- und Informationswissenschaft",
    "070": "Nachrichtenmedien, Journalismus, Verlagswesen", "100": "Philosophie", "130": "Parapsychologie, Okkultismus",
    "150": "Psychologie", "200": "Religion", "220": "Bibel", "230": "Theologie, Christentum", "290": "Andere Religionen",
    "300": "Sozialwissenschaften, Soziologie, Anthropologie", "310": "Statistik", "320": "Politik", "330": "Wirtschaft",
    "333.7": "Natürliche Ressourcen, Energie und Umwelt", "340": "Recht", "350": "Öffentliche Verwaltung",
    "355": "Militär", "360": "Soziale Probleme, Sozialdienste", "370": "Erziehung, Schul- und Bildungswesen",
    "380": "Handel, Kommunikation, Verkehr", "390": "Bräuche, Etikette, Folklore", "400": "Sprache, Linguistik",
    "420": "Englisch", "430": "Deutsch", "500": "Naturwissenschaften", "510": "Mathematik", "520": "Astronomie",
    "530": "Physik", "540": "Chemie", "550": "Geowissenschaften", "560": "Paläontologie", "570": "Biologie",
    "580": "Pflanzen (Botanik)", "590": "Tiere (Zoologie)", "600": "Technik", "610": "Medizin, Gesundheit",
    "620": "Ingenieurwissenschaften", "630": "Landwirtschaft", "640": "Hauswirtschaft und Familienleben",
    "650": "Management", "700": "Künste", "710": "Raumplanung", "720": "Architektur", "740": "Grafik, angewandte Kunst",
    "741.5": "Comics, Cartoons, Karikaturen", "770": "Fotografie", "780": "Musik", "790": "Freizeitgestaltung",
    "791": "Film, Rundfunk", "792": "Theater, Tanz", "793": "Spiel", "796": "Sport", "800": "Literaturwissenschaft",
    "810": "Amerikanische Literatur", "820": "Englische Literatur", "830": "Deutsche Literatur",
    "840": "Französische Literatur", "850": "Italienische Literatur", "860": "Spanische Literatur",
    "890": "Literatur in anderen Sprachen", "900": "Geschichte", "910": "Geografie, Reisen", "920": "Biografie",
    "930": "Alte Geschichte, Archäologie", "940": "Geschichte Europas", "943": "Geschichte Deutschlands",
    "950": "Geschichte Asiens", "960": "Geschichte Afrikas", "970": "Geschichte Nordamerikas",
    "980": "Geschichte Südamerikas", "990": "Geschichte der übrigen Welt",
    "B": "Belletristik", "K": "Kinder- und Jugendliteratur", "S": "Schulbuch",
}
# VLB-Warengruppe (2. Ziffer = Hauptgruppe, 2.–3. Ziffer = Untergruppe), falls die DNB kein Label mitliefert
WARENGRUPPEN = {
    "1": "Belletristik", "11": "Belletristik, Roman", "12": "Krimi, Thriller", "13": "Science Fiction, Fantasy",
    "15": "Lyrik, Drama", "18": "Comic, Cartoon, Humor, Satire", "2": "Kinder- und Jugendbuch", "3": "Reise",
    "4": "Ratgeber", "46": "Ratgeber Gesundheit", "48": "Ratgeber Lebenshilfe", "5": "Geisteswissenschaften",
    "52": "Philosophie", "53": "Psychologie", "54": "Religion", "55": "Geschichte", "56": "Sprachwissenschaft",
    "6": "Naturwissenschaften, Technik", "63": "Informatik", "69": "Medizin", "7": "Sozialwissenschaften",
    "72": "Soziologie", "73": "Politikwissenschaft", "77": "Recht", "78": "Wirtschaft", "9": "Sachbuch",
    "93": "Sachbuch Philosophie, Religion", "94": "Sachbuch Geschichte", "97": "Sachbuch Politik, Gesellschaft, Wirtschaft",
    "98": "Sachbuch Natur, Technik",
}


# ---------- Text ----------
def norm(s):
    s = (s or "").lower().replace("ß", "ss")
    s = unicodedata.normalize("NFKD", s)
    return "".join(c for c in s if not unicodedata.combining(c))


def key_norm(s):
    return re.sub(r"[^a-z0-9]+", "", norm(s))


def clean_isbn(s):
    return re.sub(r"[^0-9X]", "", re.sub(r'[="\s]', "", s or "").upper())


def isbn13(isbn):
    """ISBN-10 → ISBN-13 (der Cover-Dienst der DNB kennt nur die lange Form)."""
    if len(isbn) != 10:
        return isbn
    core = "978" + isbn[:9]
    check = (10 - sum(int(c) * (1 if i % 2 == 0 else 3) for i, c in enumerate(core)) % 10) % 10
    return core + str(check)


def short_title(raw):
    # Kindle-Ausgaben heißen bei Goodreads "… (German Edition)" – gleiche Regel in js/model.js
    t = re.sub(r"\s*\((?:German|English|French|Spanish|Italian|Dutch) Edition\)\s*$", "", (raw or "").strip(), flags=re.I)
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


def year_of(s):
    m = re.search(r"(1[5-9]\d\d|20\d\d)", str(s or ""))
    return int(m.group(1)) if m else None


class Book:
    def __init__(self, row):
        self.row = row
        self.id = (row.get("Book Id") or "").strip()
        self.title = short_title(row.get("Title"))
        self.last = author_last(row)
        i13, i10 = clean_isbn(row.get("ISBN13")), clean_isbn(row.get("ISBN"))
        self.isbn = i13 if len(i13) == 13 else i10 if len(i10) == 10 else ""
        self.key = ol_key(row)
        self.pages = int(re.sub(r"\D", "", row.get("Number of Pages") or "") or 0) or None
        self.year = year_of(row.get("Original Publication Year"))
        self.audio = "audi" in (row.get("Binding") or "").lower()
        self.title_words = words(self.title) | words(row.get("Title"))
        # Ausgaben aus dem deutschen Sprachraum (ISBN-Gruppe 3) kennt die DNB
        self.german = self.isbn.startswith("9783") or (len(self.isbn) == 10 and self.isbn.startswith("3"))

    def overlap(self, title):
        """Anteil gemeinsamer Wörter (Jaccard) – gegen den kurzen und den vollen Titel, der bessere zählt."""
        a = words(title)
        return max(len(a & w) / max(1, len(a | w)) for w in (words(self.title), words(self.row.get("Title"))))

    def matches(self, title, authors, strict=0.6):
        """Passt ein ISBN-Treffer? Autor:in genügt – Reihenbände heißen im Katalog oft nur wie die Reihe."""
        auth = bool(self.last) and any(norm(self.last) in norm(a) for a in authors or [])
        return auth or similar(title, self.title) >= strict


# ---------- Netz ----------
class Host:
    """Höflicher Mindestabstand je Server, auch wenn mehrere Threads fragen."""

    def __init__(self, gap):
        self.gap, self.lock, self.next = gap, threading.Lock(), 0.0

    def wait(self):
        with self.lock:
            now = time.monotonic()
            t = max(now, self.next)
            self.next = t + self.gap
        if t > now:
            time.sleep(t - now)


HOSTS = {
    "openlibrary.org": Host(1.0),
    "covers.openlibrary.org": Host(0.25),
    "services.dnb.de": Host(0.35),
    "portal.dnb.de": Host(0.35),
}


def fetch(url, tries=3):
    """Bytes der Antwort, None bei 404. Wirft, wenn der Server dauerhaft nicht will."""
    host = HOSTS[urllib.parse.urlsplit(url).netloc]
    err = None
    for i in range(tries):
        host.wait()
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):  # nicht vorhanden bzw. Anfrage, mit der der Server nichts anfangen kann
                return None
            err = e
            time.sleep(25 * (i + 1) if e.code in (429, 503) else 2 * (i + 1))
        except Exception as e:  # Zeitüberschreitung, Verbindungsabbruch
            err = e
            time.sleep(2 * (i + 1))
    raise err


# ---------- Open Library ----------
def subjects_of(names):
    return [s for s in names if s and len(s) < 60][:25]


def ol_batch(isbns):
    """ISBN → Ausgabe (Cover, Seiten, Schlagwörter) für bis zu 40 ISBN je Anfrage."""
    url = "https://openlibrary.org/api/books?format=json&jscmd=data&bibkeys=" + ",".join("ISBN:" + i for i in isbns)
    data = json.loads(fetch(url) or b"{}")
    out = {}
    for i in isbns:
        v = data.get("ISBN:" + i)
        if not v:
            out[i] = None
            continue
        cover = re.search(r"/id/(\d+)-", ((v.get("cover") or {}).get("large") or ""))
        author = re.search(r"/authors/(OL\w+)", ((v.get("authors") or [{}])[0].get("url") or ""))
        pages = v.get("number_of_pages") or (re.search(r"\d+", str(v.get("pagination") or "")) or [None])[0]
        out[i] = {
            "title": v.get("title", ""), "authors": [a.get("name", "") for a in v.get("authors") or []],
            "c": int(cover.group(1)) if cover else 0, "w": v.get("key", ""), "a": author.group(1) if author else "",
            "s": subjects_of([s.get("name", "") for s in v.get("subjects") or []]),
            "p": int(pages) if pages else None, "y": year_of(v.get("publish_date")),
        }
    return out


def ol_search(book):
    """Werk per Titel + Autor:in; findet das kein Cover, noch einmal als freie Suche."""
    base = "https://openlibrary.org/search.json?fields=" + FIELDS + "&limit=5"
    queries = ["&title=" + urllib.parse.quote(book.title) + ("&author=" + urllib.parse.quote(book.last) if book.last else ""),
               "&q=" + urllib.parse.quote((book.title + " " + book.last).strip())]
    best, best_score = None, 0
    for q in queries:
        for d in json.loads(fetch(base + q) or b"{}").get("docs") or []:
            sim, jac = similar(d.get("title", ""), book.title), book.overlap(d.get("title", ""))
            auth = any(norm(book.last) in norm(n) for n in d.get("author_name", []) or [])
            # "Less" steckt auch in "Nothing Less Than Love", jeder Titel in seinem Sammelband:
            # der Treffer darf darum kein Wort enthalten, das im Goodreads-Titel fehlt – außer er
            # beginnt mit dem Titel und stammt von derselben Person (anderer Untertitel).
            # Lieber kein Cover als ein falsches.
            subset = words(d.get("title", "")) <= book.title_words
            prefix = auth and key_norm(d.get("title", "")).startswith(key_norm(book.title))
            if sim < 0.6 or not (subset or prefix) or (not auth and jac < 0.5):
                continue
            year = d.get("first_publish_year")
            if jac < 1 and year and book.year and abs(year - book.year) > 5:
                continue  # ähnlich betiteltes anderes Buch
            # die zur Suche passende Ausgabe hat das Cover in der richtigen Sprache
            edition = ((d.get("editions") or {}).get("docs") or [{}])[0]
            d["covers"] = [c for c in dict.fromkeys([edition.get("cover_i"), d.get("cover_i")]) if c]
            score = sim + (0.5 if auth else 0) + (0.4 if d.get("cover_i") else 0) + 0.3 * jac
            if score > best_score:
                best, best_score = d, score
        if best and best.get("cover_i"):
            break
    if not best:
        return None
    return {
        "title": best.get("title", ""), "c": (best["covers"] or [0])[0], "covers": best["covers"], "w": best.get("key", ""),
        "a": (best.get("author_key") or [""])[0], "s": subjects_of(best.get("subject") or []),
        "y": best.get("first_publish_year"), "p": best.get("number_of_pages_median"),
    }


# ---------- Deutsche Nationalbibliothek ----------
def sachgruppe(code):
    code = code.strip()
    if code in SACHGRUPPEN:
        return SACHGRUPPEN[code]
    if re.match(r"\d{3}", code):
        return SACHGRUPPEN.get(code[:3]) or SACHGRUPPEN.get(code[:2] + "0") or SACHGRUPPEN.get(code[0] + "00")
    return None


# Werbe-Schlagwörter der Verlage, die nichts über den Inhalt sagen
AD_WORDS = re.compile(r"^(\d+|ab \d+|neuerscheinung\w*|buch|bucher|buecher|e?books?|taschenbuch|hardcover|bestseller\w*|"
                      r"spiegel.bestseller\w*|geschenk\w*|.*\b(geschenke?|neuerscheinungen|bestseller(liste)?|kinderbucher|klassiker)\b.*|"
                      r"lustig\w*|ungekurzte lesung|horbuch|cd)$")


def dnb_keywords(value):
    """653 $a: BISAC- und VLB-Einträge (für die Themen) und freie Schlagwörter. → (themen, frei)"""
    out, free = [], []
    for part in value.split(";"):
        part = part.strip()
        m = re.match(r"\(([^)]*)\)\s*(.*)$", part)
        if not m:
            if part and not AD_WORDS.match(norm(part)) and ":" not in part:
                free.append(part)
            continue
        kind, rest = m.group(1), m.group(2)
        label = rest.split(":", 1)[1].strip() if ":" in rest else ""
        if kind.startswith("BISAC") and label:
            out.append(label.title() if label.isupper() else label)
        elif kind == "VLB-WN":
            code = re.match(r"\d(\d)(\d)", rest)
            wg = label or (code and (WARENGRUPPEN.get(code.group(1) + code.group(2)) or WARENGRUPPEN.get(code.group(1))))
            if wg:
                out.append(wg)
    return out, free


def dnb_parse(rec):
    def subs(tag, code=None):
        vals = []
        for f in rec.findall("{*}datafield"):
            if f.get("tag") == tag:
                vals.append([(s.get("code"), (s.text or "").strip()) for s in f.findall("{*}subfield")])
        if code is None:
            return vals
        return [v for f in vals for c, v in f if c == code]

    clean = lambda s: re.sub(r"[\x98\x9c]", "", s).strip()
    title = clean(" ".join(subs("245", "a")[:1]))
    extent = " ".join(subs("300", "a"))
    pages = re.search(r"(\d{2,4})\s*(?:Seiten|S\.|Blätter|pages|p\.)", extent)
    groups = []
    for tag in ("082", "083", "084"):
        for f in subs(tag):
            for c, v in f:
                if c == "a":
                    sg = sachgruppe(v)
                    if sg and sg not in groups:
                        groups.append(sg)
    gnd = subs("650", "a") + subs("689", "a") + subs("655", "a")
    coded, free = [], []
    for v in subs("653", "a"):
        c, f = dnb_keywords(v)
        coded += c
        free += f

    def uniq(items, limit):
        seen, out = set(), []
        for s in items:
            s = clean(s)
            if s and len(s) < 60 and norm(s) not in seen:
                seen.add(norm(s))
                out.append(s)
        return out[:limit]

    return {
        "title": title, "authors": [clean(a) for a in subs("100", "a") + subs("700", "a")],
        "isbn": [i for i in (clean_isbn(x) for x in subs("020", "a")) if len(i) in (10, 13)],
        "p": int(pages.group(1)) if pages else None, "y": year_of(" ".join(subs("264", "c") + subs("260", "c"))),
        # s: alles für die Themenzuordnung (Sachgruppe zuerst) · k: Stichworte zum Anzeigen
        "s": uniq(groups + gnd + coded + free, 25), "k": uniq(gnd + free, 8), "audio": bool(re.search(r"\bCDs?\b|\bmin\b|Hörbuch", extent + " " + " ".join(subs("655", "a")))),
    }


def dnb_query(q, limit=6):
    url = ("https://services.dnb.de/sru/dnb?version=1.1&operation=searchRetrieve&recordSchema=MARC21-xml"
           "&maximumRecords=%d&query=%s" % (limit, urllib.parse.quote(q)))
    data = fetch(url)
    if not data:
        return []
    try:
        root = ET.fromstring(data)
    except ET.ParseError:
        return []
    return [dnb_parse(r) for r in root.findall(".//{*}record") if r.find("{*}datafield") is not None]


def dnb_merge(recs):
    """Mehrere Auflagen desselben Buchs: die mit den meisten Angaben, Lücken aus den anderen füllen."""
    recs = sorted(recs, key=lambda r: (not r["audio"], len(r["s"]), bool(r["p"])), reverse=True)
    best = dict(recs[0])
    for r in recs[1:]:
        best["p"] = best["p"] or r["p"]
        best["isbn"] = best["isbn"] + [i for i in r["isbn"] if i not in best["isbn"]]
    del best["audio"]
    return best


def dnb_by_isbn(book):
    recs = [r for r in dnb_query("num=" + book.isbn) if book.matches(r["title"], r["authors"], 0.5)]
    return dnb_merge(recs) if recs else None


def dnb_by_title(book):
    title = re.sub(r'["()]', " ", book.title).strip()
    if not title:
        return None
    q = 'tit="%s"' % title + (' and per="%s"' % book.last.replace('"', "") if book.last else "")
    recs = [r for r in dnb_query(q, 10)
            if similar(r["title"], book.title) >= 0.75 and book.overlap(r["title"]) >= 0.5 and not r["audio"]]
    with_isbn = [r for r in recs if r["isbn"]]
    return dnb_merge(with_isbn or recs) if recs else None


# ---------- Cover ----------
def cover_name(book):
    return re.sub(r"[^A-Za-z0-9_-]", "_", book.id) + ".jpg"


def save_cover(book, url):
    """Lädt ein Cover, prüft es und legt es als data/covers/<id>.jpg ab. → Dateiname oder None"""
    data = fetch(url)
    if not data or len(data) < 1500:
        return None
    name = cover_name(book)
    path = os.path.join(COVER_DIR, name)
    if Image:
        try:
            im = Image.open(io.BytesIO(data))
            im.load()
        except Exception:
            return None
        if im.width < 90 or im.height < 120:  # Platzhalter und Briefmarken
            return None
        if im.height < 1.1 * im.width and not book.audio:  # CD-Hüllen und Banner sind kein Buchcover
            return None
        im = im.convert("RGB")
        im.thumbnail(COVER_MAX, Image.LANCZOS)
        im.save(path, "JPEG", quality=82, optimize=True, progressive=True)
    else:
        if data[:3] != b"\xff\xd8\xff" and data[:8] != b"\x89PNG\r\n\x1a\n":
            return None
        with open(path, "wb") as f:
            f.write(data)
    return name


OL_COVER = "https://covers.openlibrary.org/b/id/%d-L.jpg?default=false"
DNB_COVER = "https://portal.dnb.de/opac/mvb/cover?isbn=%s"


class Enricher:
    def __init__(self, cache, retry=False, offline=False):
        self.cache, self.retry, self.offline = cache, retry, offline
        self.lock, self.dirty = threading.Lock(), 0
        for part in ("ol", "dnb", "search", "cover"):
            cache.setdefault(part, {})

    def cached(self, part, key, lookup):
        """Ergebnis aus dem Cache oder frisch nachschlagen; None = nichts gefunden (mit Zeitstempel)."""
        hit = self.cache[part].get(key)
        if hit is not None:
            fresh = time.time() - hit.get("t", 0) < RETRY_NONE_S and not self.retry
            if hit.get("v") is not None or fresh or self.offline:
                return hit.get("v")
        if self.offline:
            return None
        v = lookup()
        self.cache[part][key] = {"v": v, "t": int(time.time())}
        self.touch()
        return v

    def touch(self):
        with self.lock:
            self.dirty += 1
            if self.dirty >= 25:
                self.save()

    def save(self):
        self.dirty = 0
        tmp = CACHE + ".tmp"
        with io.open(tmp, "w", encoding="utf-8") as f:
            json.dump(self.cache, f, ensure_ascii=False)
        os.replace(tmp, CACHE)

    def prefetch_ol(self, books):
        todo = sorted({b.isbn for b in books if b.isbn and (b.isbn not in self.cache["ol"] or self.retry)})
        for i in range(0, len(todo), 40):
            chunk = todo[i:i + 40]
            try:
                res = ol_batch(chunk)
            except Exception as e:
                print("  ! Open Library (ISBN-Paket):", e)
                continue
            for isbn, v in res.items():
                self.cache["ol"][isbn] = {"v": v, "t": int(time.time())}
            print("  Open Library: %d/%d ISBN" % (min(i + 40, len(todo)), len(todo)))
        if todo:
            self.save()

    def cover(self, book, candidates):
        """Erstes brauchbares Cover aus [(Quelle, URL)]; merkt sich auch Fehlschläge."""
        hit = self.cache["cover"].get(book.id)
        if hit and hit.get("file") and os.path.exists(os.path.join(COVER_DIR, hit["file"])):
            return hit
        own = cover_name(book)  # selbst abgelegtes Bild: data/covers/<Book Id>.jpg
        if os.path.exists(os.path.join(COVER_DIR, own)):
            return {"file": own, "src": "eigene Datei"}
        if self.offline:
            return None
        tried = set(hit.get("tried", [])) if hit and not self.retry and time.time() - hit.get("t", 0) < RETRY_NONE_S else set()
        for src, url in candidates:
            if url in tried:
                continue
            tried.add(url)
            name = save_cover(book, url)
            if name:
                hit = {"file": name, "src": src, "t": int(time.time())}
                self.cache["cover"][book.id] = hit
                self.touch()
                return hit
        self.cache["cover"][book.id] = {"tried": sorted(tried), "t": int(time.time())}
        self.touch()
        return None

    def enrich(self, book):
        ol = (self.cache["ol"].get(book.isbn) or {}).get("v") if book.isbn else None
        if ol and not book.matches(ol["title"], ol.get("authors"), 0.5):
            ol = None  # ISBN zeigt bei Open Library auf ein anderes Buch
        dnb = self.cached("dnb", book.isbn, lambda: dnb_by_isbn(book)) if book.isbn and (book.german or not ol) else None

        cands = []
        if ol and ol["c"]:
            cands.append(("Open Library (Ausgabe)", OL_COVER % ol["c"]))
        if dnb:
            cands.append(("DNB", DNB_COVER % isbn13(book.isbn)))
        cover = self.cover(book, cands)

        # ein früher schon gefundenes Werk gehört dazu, auch wenn das Cover inzwischen im Cache liegt
        search = (self.cache["search"].get(book.key) or {}).get("v")
        if not cover or not ((ol and ol["s"]) or (dnb and dnb["s"])):
            search = self.cached("search", book.key, lambda: ol_search(book))
            if not cover and search:
                cover = self.cover(book, [("Open Library (Werk)", OL_COVER % c) for c in search.get("covers") or []])
        pages = book.pages or next((s["p"] for s in (ol, dnb, search) if s and s.get("p")), None)
        if not cover or not pages:  # Kindle & Co.: eine andere (gedruckte) deutsche Ausgabe über den Titel suchen
            alt = self.cached("dnb", "t:" + book.key, lambda: dnb_by_title(book))
            if alt:
                pages = pages or alt["p"]
                dnb = dnb or alt
                if not cover:
                    isbns = [i for i in alt["isbn"] if len(i) == 13 and i != isbn13(book.isbn)][:6]
                    cover = self.cover(book, [("DNB (andere Ausgabe)", DNB_COVER % i) for i in isbns])

        subjects, seen = [], set()
        for src in (dnb, ol, search):
            for s in (src or {}).get("s") or []:
                if norm(s) not in seen:
                    seen.add(norm(s))
                    subjects.append(s)
        first = lambda field: next((s[field] for s in (ol, search, dnb) if s and s.get(field)), None)
        if not (ol or dnb or search or cover):
            return {"c": 0, "t": int(time.time() * 1000)}, None
        rec = {
            "c": (ol and ol["c"]) or (search and search["c"]) or 0, "k": (dnb or {}).get("k") or [],
            "w": first("w") or "", "a": first("a") or "", "s": subjects[:30],
            "y": (search and search.get("y")) or first("y"), "p": pages,
            "t": int(time.time() * 1000),
        }
        if cover:
            rec["img"] = "data/covers/" + cover["file"]
        return rec, cover


# ---------- Themen ----------
def theme_keys():
    """Gültige Themenschlüssel stehen in js/model.js (GENRES) – nur dort pflegen."""
    src = io.open(os.path.join(APP, "js", "model.js"), encoding="utf-8").read()
    block = src[src.index("const GENRES = ["):src.index("const GENRE = {}")]
    return re.findall(r'\{ key: "(\w+)", label: "([^"]+)"', block)


def load_themes(rows):
    """data/themen.csv lesen, neue Bücher als leere Zeilen anhängen. → {Book Id: [Schlüssel]}"""
    labels = dict(theme_keys())
    table, order = {}, []
    if os.path.exists(THEMES):
        text = io.open(THEMES, encoding="utf-8-sig").read()
        head = text.split("\n", 1)[0]
        for r in csv.DictReader(io.StringIO(text), delimiter=";" if head.count(";") >= head.count(",") else ","):
            bid = (r.get("Book Id") or "").strip()
            if bid:
                table[bid] = (r.get("Themen") or "").strip()
                order.append(bid)
    out, unknown = {}, set()
    for bid, raw in table.items():
        keys = [k for k in re.split(r"[\s,|/]+", raw.lower()) if k]
        unknown.update(k for k in keys if k not in labels)
        keys = [k for k in keys if k in labels and k != "none"]
        if keys:
            out[bid] = keys[:5]
    if unknown:
        print("  ! Unbekannte Themen in themen.csv (ignoriert):", ", ".join(sorted(unknown)))
        print("    Gültig sind:", ", ".join(k for k in labels if k != "none"))
    by_id = {(r.get("Book Id") or "").strip(): r for r in rows}
    new = [bid for bid in by_id if bid and bid not in table]
    if new or not os.path.exists(THEMES):
        with io.open(THEMES, "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f, delimiter=";")
            w.writerow(["Book Id", "Titel", "Autor", "Themen"])
            for bid in order + new:
                r = by_id.get(bid)
                if r:  # Bücher, die nicht mehr im Export stehen, fallen raus
                    w.writerow([bid, short_title(r.get("Title")), r.get("Author", ""), table.get(bid, "")])
        if new:
            print("  themen.csv: %d neue Bücher ohne Thema angehängt (leer = automatisch)." % len(new))
    return out


def main():
    for stream in (sys.stdout, sys.stderr):  # Windows-Konsole: Umlaute und Häkchen nicht als Fehler
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv", nargs="?", default=os.path.join(APP, "data", "goodreads_library_export.csv"))
    ap.add_argument("--out", default=os.path.join(APP, "data", "books.js"))
    ap.add_argument("--offline", action="store_true", help="nichts nachschlagen (nur Cache und themen.csv)")
    ap.add_argument("--retry", action="store_true", help="auch erneut suchen, was zuletzt nicht gefunden wurde")
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
    books = [Book(r) for r in rows if (r.get("Title") or "").strip()]

    cache = json.load(io.open(CACHE, encoding="utf-8")) if os.path.exists(CACHE) else {}
    en = Enricher(cache, args.retry, args.offline)
    os.makedirs(COVER_DIR, exist_ok=True)
    if not Image:
        print("Hinweis: Pillow fehlt (pip install pillow) – Cover bleiben in Originalgröße.")

    enrichment, sources = {}, {}
    if not args.offline:
        print("Bücher:", len(books), "· schlage nach …")
        en.prefetch_ol(books)
    done = [0]

    def work(book):
        try:
            rec, cover = en.enrich(book)
        except Exception as e:  # Netzfehler: Buch bleibt ohne Anreicherung
            rec, cover = None, None
            print("  ! %s → %s" % (book.title[:60], e))
        done[0] += 1
        if rec is not None and not args.offline:
            mark = "✓" if cover else "·"
            print("  %s %3d/%d  %s%s" % (mark, done[0], len(books), book.title[:60], "  [" + cover["src"] + "]" if cover else ""))
        return book, rec, cover

    with cf.ThreadPoolExecutor(max_workers=1 if args.offline else 6) as pool:
        for book, rec, cover in pool.map(work, books):
            if rec is not None:
                enrichment[book.key] = rec
            if cover:
                sources[cover["src"]] = sources.get(cover["src"], 0) + 1
    en.save()

    themes = load_themes(rows)
    for b in books:
        if b.id in themes:
            enrichment.setdefault(b.key, {"c": 0, "t": int(time.time() * 1000)})["th"] = themes[b.id]

    data = {"generated": dt.datetime.now(dt.timezone.utc).isoformat(), "source": "goodreads",
            "rows": rows, "enrichment": enrichment}
    js = ("// Erzeugt von tools/build_books.py – ohne private Notizen.\n"
          "window.BOOKSHELF_DATA = " + json.dumps(data, ensure_ascii=False) + ";\n")
    io.open(args.out, "w", encoding="utf-8").write(js)

    covers = sum(1 for b in books if enrichment.get(b.key, {}).get("img"))
    pages = sum(1 for b in books if int(re.sub(r"\D", "", b.row.get("Number of Pages") or "") or 0)
                or enrichment.get(b.key, {}).get("p"))
    print("books.js: %d Bücher · %d mit Cover · %d mit Seitenzahl · %d mit Thema von Hand · %d KB → %s"
          % (len(books), covers, pages, sum(1 for b in books if b.id in themes), round(len(js) / 1024), args.out))
    if sources:
        print("Cover von:", ", ".join("%s %d" % kv for kv in sorted(sources.items(), key=lambda kv: -kv[1])))
    missing = [b.title for b in books if not enrichment.get(b.key, {}).get("img")]
    if missing:
        print("Ohne Cover (%d): %s%s" % (len(missing), "; ".join(t[:40] for t in missing[:12]), " …" if len(missing) > 12 else ""))


if __name__ == "__main__":
    main()
