# Filmregal

Interaktives Filmregal aus dem Trakt-Export, das Geschwister des
[Bücherregals](../buecherregal/). Filme stehen als Hüllenrücken oder mit dem
Cover nach vorn im Regal. Sie lassen sich sortieren, filtern und durchsuchen
und hüpfen dabei an ihren neuen Platz. Ein Klick zieht die Hülle aus dem Regal
und klappt sie auf. Läuft komplett im Browser, ohne Build und ohne bezahlte API.

## Eigene Filme einspielen

Trakt: *Settings → Data → Export your data* liefert eine ZIP-Datei. Danach gibt
es zwei Wege:

| Weg | Wie | Für wen |
|---|---|---|
| **Im Browser importieren** | *Daten → Trakt-Export importieren* oder die ZIP aufs Regal ziehen | nur dieser Browser (localStorage), sofort |
| **movies.js erzeugen** (empfohlen) | `python tools/build_movies.py export.zip` → `data/movies.js` | alle Besucher:innen; Laufzeiten, Regie, Genres und Plakat-Adressen sind aufgelöst, der Browser fragt nichts mehr nach |

Reihenfolge beim Laden: lokaler Import → `data/movies.js` → leeres Regal mit
Import-Hinweis.

Nach einem neuen Export: `build_movies.py` erneut starten. Der Lauf schlägt nur
neue Filme nach (Cache in `tools/.enrich_cache.json`) und hängt sie ohne Genre
an `data/genres.csv` an. *Daten → movies.js für die Website erzeugen* im Regal
schreibt dieselbe Datei aus dem, was der Browser gefunden hat.

> **Datenschutz:** Der Export enthält auch Serien, Follower, Profil und
> Einstellungen. Beide Wege lesen nur die Film-Dateien (`watched-movies`,
> `watched-history`, `ratings-movies`, Watchlist, eigene Listen und eigene
> Kommentare zu Filmen). Die ZIP selbst gehört nicht ins Repo (`data/*.zip`
> steht in `.gitignore`).

## Was der Export hergibt – und was dazukommt

* **Aus Trakt:** Titel, Jahr, IMDb-/TMDB-ID, jede Sichtung mit Zeitpunkt,
  Bewertung von 1 bis 10, Watchlist, Listen, Kommentare.
* **Sichtungen ohne echtes Datum:** Trakt setzt 1970 für „irgendwann“, und beim
  Anlegen des Kontos landen oft hunderte Filme am selben Tag. Tage mit acht
  oder mehr Filmen gelten deshalb als Sammelimport (`BULK_DAY` in
  `js/model.js`). Diese Filme zählen als gesehen, stehen aber auf dem Brett
  „Früher gesehen · ohne Datum“ und fehlen in Jahres-, Monats- und
  Wochentagsdiagrammen.
* **Aus Wikidata** (über die IMDb-ID, kostenlos und ohne Key): deutscher Titel,
  Laufzeit, Genres, Regie, Besetzung, Produktionsland, Sprache und der
  Wikipedia-Artikel. Eine SPARQL-Abfrage holt 40 Filme auf einmal, die ganze
  Sammlung braucht rund 15 Anfragen.
* **Plakate** stammen aus dem englischen Wikipedia-Artikel (`pageimages`) und
  werden von Wikimedia eingebunden, nicht kopiert.
  `build_movies.py --download-posters` legt sie stattdessen als
  `data/posters/<Trakt-Id>.jpg` ab. Ein eigenes Bild unter diesem Namen wird
  nie überschrieben – so lässt sich ein fehlendes oder falsches Plakat ersetzen.
  Filmplakate sind in der Regel urheberrechtlich geschützt; das Herunterladen
  ins öffentliche Repo ist deshalb bewusst nur eine Option.
* **Ohne `movies.js`-Anreicherung** fragt der Browser beim ersten Besuch selbst
  nach und cachet in `localStorage` (Schlüssel `fr.wd.v1`).
* **Fehlt ein Plakat**, gestaltet das Regal Rücken und Cover selbst. Die Farbe
  kommt aus dem Genre mit deterministischem Zufall je Film.
* **Hülle nach Ära:** Trakt kennt kein Medium. Die Hülle richtet sich nach dem
  Erscheinungsjahr – VHS (bis 1996), DVD (1997–2007), Blu-ray (2008–2015),
  4K (ab 2016). Das ist Dekoration, keine Aussage über den Besitz.
* **Rückenbreite:** folgt der Laufzeit. Ein Dreistünder steht als dicke Box im
  Regal.
* **Genres von Hand:** `data/genres.csv` (Semikolon-getrennt, öffnet in Excel)
  ordnet einem Film ein bis vier Genres zu, das erste bestimmt Brett und
  Hüllenfarbe:

  ```
  Trakt Id;Titel;Jahr;Genres
  4891;The Fast and the Furious: Tokyo Drift;2006;action
  48;Blade Runner;1982;scifi, krimi
  ```

  Gültige Schlüssel (siehe `GENRES` in `js/model.js`): `action`, `abenteuer`,
  `animation`, `komoedie`, `krimi`, `doku`, `drama`, `familie`, `fantasy`,
  `historie`, `horror`, `musik`, `romanze`, `scifi`, `thriller`, `krieg`,
  `western`, `superhelden`, `sport`, `biografie`. Nach einer Änderung
  `build_movies.py` neu starten (mit `--offline` in Sekunden). Bleibt die
  Spalte leer, sortiert das Regal nach den Genre-Bezeichnungen von Wikidata.

## Bedienung

* **Ansichten:** Rücken · Cover · Liste (sortierbare Tabelle, auch als
  zugängliche Alternative). Beim Wechsel drehen sich die Hüllen um 90°.
* **Bretter je …** Jahr gesehen (ein Brett pro Jahr als Zeitachse), Genre, Ära,
  Bewertung, Jahrzehnt oder Regie. Kleine Gruppen teilen sich ein Brett mit
  Trennkarten; ein Klick darauf filtert.
* **Sortieren:** Gesehen am, Titel, Regie, Laufzeit, Erscheinungsjahr,
  Bewertung, wie oft gesehen, Farbe (Regenbogen), Zufall.
* **Filter** (Schublade, Taste `f`): Jahr gesehen, Ära, Genre, Laufzeit und
  Erscheinungsjahr als Doppelregler mit Histogramm, Mindestbewertung, Regie,
  Trakt-Listen und Status (die Watchlist ist anfangs ausgeblendet). Die Zahlen
  an den Chips sind Facettenzähler: Sie zählen unter allen *anderen* aktiven
  Filtern.
* **Suche** (Taste `/`) mit Feldsyntax, kombinierbar, `-` schließt aus:

  ```
  titel:alien   regie:nolan   mit:"tom hanks"   land:frankreich   imdb:tt0083658
  laufzeit>150   laufzeit:90-110   jahr<1980   jahr:1990-1999   jahr:19*
  gesehen:2024   gesehen:2023-05   gesehen:ohne   tag:sonntag   mal>1
  genre:scifi   ära:vhs   bewertung>=8   liste:favoriten   -genre:horror
  ```

* **Film anklicken:** Die Hülle wird herausgezogen, dreht sich vom Rücken zum
  Cover und klappt auf. Links stehen Kinokarte, Laufzeit, Regie, Besetzung und
  Genres, rechts Bewertung, Kommentar und „Mehr von …“. `←`/`→` blättern zum
  nächsten Film, `Esc` stellt ihn zurück ins Regal.
* **Statistik** (Taste `s`): Kennzahlen (inkl. „Tage am Stück“), Filmjahre als
  Hüllenstapel (Filme oder Stunden, nach Ära), Filmmonate als Heatmap, Genres,
  Bewertungen, Laufzeit, Erscheinungsjahrzehnt, Wochentage sowie meistgesehene
  Regie und Gesichter. Die Diagramme filtern beim Anklicken mit (Crossfilter),
  jede Karte hat eine Tabellenansicht.
* `r` klappt einen Zufallsfilm auf. Die Lampe oben rechts schaltet auf das
  dunkle Design, der Doppelpfeil daneben auf die breite Ansicht (beides merkt
  sich der Browser). Der Zustand steckt in der URL (`#g=genre&q=…`) und lässt
  sich so teilen.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html`, `style.css` | Seite, Design (hell/dunkel), Regal, 3D-Hülle |
| `js/util.js` | Hash/Zufall, Farben, Formatierung, DOM-Helfer |
| `js/trakt.js` | Trakt-ZIP entpacken und Film-Dateien zu Zeilen zusammenführen |
| `js/model.js` | Zeile → Film, Genres, Ären, Suchsyntax, Filter, Sortierung, Gruppen |
| `js/enrich.js` | Wikidata/Wikipedia-Anreicherung mit Stapeln & Cache |
| `js/spine.js` | Maße, Hüllenfarben, Rückenstile, gestaltete Cover |
| `js/shelf.js` | Bretter füllen, FLIP-Animationen, Deko, Tastatur-Navigation |
| `js/reader.js` | aufgeklappte 3D-Hülle |
| `js/stats.js` | Kennzahlen & Diagramme |
| `js/ui.js`, `js/app.js` | Hero, Filter-Schublade, Liste, Import/Export, Verdrahtung |
| `data/movies.js` | die eigenen Filme samt Anreicherung |
| `data/genres.csv` | Genres von Hand je Film |
| `data/posters/` | optionale lokale Plakate als `<Trakt-Id>.jpg` |
| `tools/build_movies.py` | ZIP → `movies.js` und `genres.csv` (Wikidata + Wikipedia) |

Lokal testen: `python3 -m http.server` im Repo-Wurzelverzeichnis und
`http://localhost:8000/fun/filmregal/` öffnen.
