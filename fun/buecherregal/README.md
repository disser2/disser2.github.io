# Bücherregal

Interaktives Bücherregal aus dem Goodreads-Export. Bücher stehen als Rücken oder
mit dem Cover nach vorn im Regal. Sie lassen sich sortieren, filtern und
durchsuchen und hüpfen dabei an ihren neuen Platz. Ein Klick zieht das Buch aus
dem Regal und schlägt es auf. Läuft komplett im Browser, ohne Build und ohne
bezahlte API.

## Eigene Bücher einspielen

Goodreads: *My Books → Import and export → Export Library* liefert
`goodreads_library_export.csv`. Danach gibt es drei Wege:

| Weg | Wie | Für wen |
|---|---|---|
| **Im Browser importieren** | *Daten → Goodreads-CSV importieren* oder die CSV aufs Regal ziehen | nur dieser Browser (localStorage), sofort |
| **CSV ins Repo legen** | Datei nach `fun/buecherregal/data/goodreads_library_export.csv` hochladen | alle Besucher:innen; Cover werden im Browser gesucht und dort gecacht |
| **books.js erzeugen** (empfohlen) | `python tools/build_books.py --include-to-read` → `data/books.js` + `data/covers/` | alle; Cover liegen lokal, Seitenzahlen und Themen sind aufgelöst, der Browser fragt nichts mehr nach |

Reihenfolge beim Laden: lokaler Import → `data/books.js` → `data/goodreads_library_export.csv` → Beispieldaten.

Nach einem neuen Goodreads-Export: CSV nach `data/` legen und `build_books.py` erneut
starten. Der Lauf schlägt nur neue Bücher nach (Cache in `tools/.enrich_cache.json`)
und hängt sie ohne Thema an `data/themen.csv` an. *Daten → books.js für die Website
erzeugen* im Regal geht weiterhin, kennt aber nur Open Library und keine lokalen Cover.

> **Datenschutz:** Die Goodreads-CSV enthält die Spalte *Private Notes*. Wer die
> rohe CSV ins öffentliche Repo legt, veröffentlicht sie. Der Import im Browser
> und beide Wege zu `books.js` entfernen private Notizen; `build_books.py`
> lässt außerdem „Will ich lesen“ weg (`--include-to-read` nimmt sie mit).

## Cover & Themen

* **`tools/build_books.py`** fragt pro Buch kostenlose Quellen ohne Key, in dieser
  Reihenfolge: Open Library per ISBN → Deutsche Nationalbibliothek (DNB) per ISBN
  → Open Library per Titel + Autor:in → DNB per Titel (andere Ausgabe, z. B. das
  gedruckte Buch zur Kindle-Ausgabe). Ein Treffer zählt nur, wenn Titel bzw.
  Autor:in passen. Die DNB liefert für deutsche Ausgaben Cover, Seitenzahl,
  Sachgruppe und Schlagwörter, die Open Library meist fehlen.
* **Cover** liegen als `data/covers/<Book Id>.jpg` im Projekt (die DNB lässt sich
  nicht per `<img>` einbinden). Ein eigenes Bild unter diesem Namen wird nie
  überschrieben – so lässt sich ein fehlendes oder falsches Cover ersetzen. Fehlt
  die Datei, nimmt das Regal das Cover von Open Library.
* **Im Browser** (CSV-Import ohne `books.js`) sucht das Regal nur bei Open Library
  und cachet in `localStorage` (Schlüssel `bs.ol.v1`).
* **Fehlt ein Cover**, gestaltet das Regal Rücken und Einband selbst. Die Farbe
  kommt aus dem Thema mit deterministischem Zufall je Buch, dazu Titeltypografie
  und Motive aus Kreis, Punkteraster, Band oder Rahmen.
* **Themen von Hand:** `data/themen.csv` (Semikolon-getrennt, öffnet in Excel)
  ordnet jedem Buch ein bis drei Themen zu, das erste ist das Hauptthema und
  bestimmt Brett und Einbandfarbe:

  ```
  Book Id;Titel;Autor;Themen
  18736925;Capital in the Twenty First Century;Thomas Piketty;wirtschaft
  23692271;Sapiens;Yuval Noah Harari;geschichte, anthropologie
  ```

  Gültige Schlüssel (siehe `GENRES` in `js/model.js`): `politik`, `gesellschaft`,
  `feminismus`, `wirtschaft`, `business`, `geschichte`, `welt`, `ki`,
  `wissenschaft`, `natur`, `anthropologie`, `medizin`, `psychologie`, `ratgeber`,
  `philosophie`, `biografie`, `sachbuch`, `roman`, `klassiker`, `historisch`,
  `krimi`, `scifi`, `fantasy`, `horror`, `romance`, `jugend`, `comic`, `lyrik`,
  `humor`. Nach einer Änderung `build_books.py` neu starten (mit `--offline` in
  Sekunden).
* **Themen automatisch:** Bleibt die Spalte leer (neue Bücher) oder gibt es keine
  `books.js`, sortiert das Regal selbst: eigene Goodreads-Regale zählen stark,
  Schlagwörter von DNB und Open Library sowie Wörter im Titel schwach. Ein Buch
  kann mehrere Themen haben.
* **Stichworte** der DNB bzw. von Open Library stehen im aufgeschlagenen Buch
  unter den Themen; ein Klick sucht danach.
* **Maße:** Die Rückenbreite folgt linear der Seitenzahl. Die Höhe hängt vom
  Buchtyp ab (gebunden > Taschenbuch > Mass Market) und streut leicht.
  Taschenbücher haben manchmal Leseknicke im Rücken.

## Bedienung

* **Ansichten:** Rücken · Cover (frontal wie im Buchladen) · Liste (sortierbare
  Tabelle, auch als zugängliche Alternative). Beim Wechsel drehen sich die
  Bücher nacheinander um 90°.
* **Bretter je …** Lesejahr (ein Brett pro Jahr als Zeitachse, „Gerade auf dem
  Nachttisch“ oben), Thema, Buchtyp, Bewertung, Jahrzehnt oder Autor:in. Kleine
  Gruppen teilen sich ein Brett mit Trennkarten; ein Klick darauf filtert.
* **Sortieren:** Lesedatum, Titel, Autor:in, Seitenzahl, Erscheinungsjahr,
  Bewertung, Goodreads-Schnitt, Farbe (Regenbogen), Größe, Zufall.
* **Filter** (Schublade, Taste `f`): Lesejahr, Buchtyp, Thema, Seitenzahl und
  Erscheinungsjahr als Doppelregler mit Histogramm, Mindestbewertung, Autor:in,
  eigene Regale und Status. Die Zahlen an den Chips sind Facettenzähler: Sie
  zählen unter allen *anderen* aktiven Filtern.
* **Suche** (Taste `/`) mit Feldsyntax, kombinierbar, `-` schließt aus:

  ```
  autor:king   titel:dune   verlag:diogenes   reihe:dune   regal:favoriten
  seiten>500   seiten:200-350   jahr<1950   jahr:1990-1999   jahr:19*
  gelesen:2024   gelesen:2023-05   gelesen:ohne   isbn:9780441
  thema:fantasy   typ:hörbuch   bewertung>=4   -thema:horror   autor:"le guin"
  ```

* **Buch anklicken:** Es wird herausgezogen, dreht sich vom Rücken zum Cover
  und klappt auf. Links stehen Exlibris, Ausgabe, ISBN und Themen, rechts
  Sterne, Rezension (Spoiler verschwommen) und „Mehr von …“. `←`/`→` blättern
  zum nächsten Buch, `Esc` stellt es zurück ins Regal.
* **Statistik** (Taste `s`): Kennzahlen (inkl. Regalmeter), Lesejahre als
  Bücherstapel (Bücher oder Seiten, nach Buchtyp), Lesemonate als Heatmap,
  Themen, Seitenzahl, Erscheinungsjahrzehnt, „Meine Sterne vs. Goodreads“ mit
  Korrelation und die meistgelesenen Autor:innen. Die Diagramme filtern beim
  Anklicken mit (Crossfilter), jede Karte hat eine Tabellenansicht.
* `r` schlägt ein Zufallsbuch auf. Die Leselampe oben rechts schaltet auf das
  dunkle Abenddesign, der Doppelpfeil daneben auf die breite Ansicht über die
  ganze Fensterbreite (beides merkt sich der Browser).
* Sucht das Regal bei Open Library nach Covern, hat die Meldung unten links
  einen Knopf *Stopp* (und danach *Fortsetzen*). Dauerhaft aus: *Daten → Cover
  von Open Library laden*. Der Zustand steckt in der URL (`#g=genre&q=…`) und lässt
  sich so teilen.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html`, `style.css` | Seite, Design (hell/dunkel), Regal, 3D-Buch |
| `js/util.js` | Hash/Zufall, Farben, Formatierung, DOM-Helfer |
| `js/csv.js` | CSV lesen/schreiben (Zeilenumbrüche in Rezensionen, `;`-Exporte) |
| `js/model.js` | Goodreads → Buch, Themen, Buchtypen, Suchsyntax, Filter, Sortierung, Gruppen |
| `js/covers.js` | Open-Library-Anreicherung mit Warteschlange & Cache |
| `js/spine.js` | Maße, Einbandfarben, Rückenstile, generierte Cover |
| `js/shelf.js` | Bretter füllen, FLIP-Animationen, Deko, Tastatur-Navigation |
| `js/reader.js` | aufgeklapptes 3D-Buch |
| `js/stats.js` | Kennzahlen & Diagramme |
| `js/ui.js`, `js/app.js` | Hero, Filter-Schublade, Liste, Import/Export, Verdrahtung |
| `data/demo.js` | Beispieldaten im Goodreads-Format (`tools/make_demo.py`) |
| `data/books.js` | die eigenen Bücher samt Anreicherung (leer = CSV oder Demo) |
| `data/covers/` | Cover als `<Book Id>.jpg` |
| `data/themen.csv` | Themen von Hand je Buch |
| `tools/build_books.py` | CSV → `books.js`, `covers/` und `themen.csv` (Open Library + DNB) |

Lokal testen: `python3 -m http.server` im Repo-Wurzelverzeichnis und
`http://localhost:8000/fun/buecherregal/` öffnen. Über `file://` funktioniert
alles außer dem automatischen Laden der CSV.
