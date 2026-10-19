# KVB Haltestellen – Sammel-App

Web-App zum Sammeln von Haltestellen der Kölner Stadtbahn, optimiert fürs iPhone.
Design und Bedienlogik wie *ICE Taufnamen* (`../ice_taufe`) und *ICE Verbindungen*
(`../ice-routes`).

**Spielregel:** Eine Haltestelle zählt nur, wenn man dort **einsteigt**, **aussteigt**
oder **umsteigt**. Wer nur durchfährt, sammelt sie nicht – die App zeigt solche Halte
aber als „durchfahren“ an.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | App-Shell (iOS-optimiert, PWA-Meta-Tags) |
| `style.css` | iOS-inspiriertes Design, Light/Dark Mode |
| `app.js` | Logik: Sammeln, Fahrten mit Umstiegen, Routenvorschlag, Sheets, Statistik, localStorage |
| `map.js` | Netzkarte als SVG (Gleisverlauf, Haltestellen, Beschriftung mit Kollisionsvermeidung) |
| `data.js` | 247 Haltestellen, 12 Linien (13 Laufwege), Gleisverlauf je Abschnitt – erzeugt von `tools/build_data.py` |
| `geo.js` | Basiskarte: Gemeinde- und Stadtbezirksgrenzen, Rhein – erzeugt von `tools/build_data.py` |
| `icons/` | Homescreen-Icons (120/152/167/180 px), erzeugt von `tools/make_icons.py` |
| `standalone.html` | Einzeldatei-Variante (alles inline), erzeugt von `tools/build_standalone.py` |
| `tools/` | Python-Skripte für Datenabruf und Build |

## Features

- **Haltestellen** (Startansicht, wie die Taufnamen-Liste): alle 247 Halte mit
  Linien-Plaketten in KVB-Farben, Stadtteil, Tunnel-Kennzeichen „U“ und einem
  Haltestellenschild, das sich beim Sammeln einfärbt.
  - Kreis antippen → **Abhaken ohne Fahrt**: Eingestiegen / Ausgestiegen /
    Umgestiegen, Datum frei wählbar (gut zum Nachtragen alter Besuche).
  - Filter: Gesammelt/Fehlt, je Linie, Umsteigehalte, Tunnel, Endhalte, Köln/Umland.
  - Sortierung: A–Z, Linienverlauf (bei gewählter Linie), zuletzt, Häufigkeit.
- **Fahrt eintragen** (＋): Einstieg → Linie → Umstieg → Linie → … → Ausstieg.
  - Die App schlägt die Linien vor, die zwei Halte direkt verbinden; fahren mehrere,
    wählt man die tatsächlich genutzte.
  - Gibt es keine direkte Linie, fügt **„Umstieg vorschlagen“** die Verbindung mit
    den wenigsten Umstiegen ein (Dijkstra über das Liniennetz).
  - **Fußweg** als Teilstrecke für Umstiege zwischen getrennten Halten
    (z. B. *Bf Deutz/Messe* ↔ *Bf Deutz/LANXESS arena*).
  - In der Haltestellenauswahl stehen die direkt erreichbaren Halte bzw. die Halte der
    vorgewählten Linie oben; schon gesammelte sind mit einem grünen Punkt markiert.
- **Linien**: alle 12 Linien mit Fortschritt (gesammelte Halte), Länge und Fahrten.
  Im Detail: Mini-Karte, befahrene Abschnitte, gefahrene km und der komplette
  Linienverlauf mit Umsteigelinien – gesammelt (grün), nur durchfahren (Ring), offen.
- **Karte**: das Netz mit echtem Gleisverlauf, Rhein, Gemeinde- und
  Stadtbezirksgrenzen. Befahrene Abschnitte in Linienfarbe, gesammelte Halte grün.
  Halt oder Linie antippen → Info-Leiste → Detail. „Farbe“ zeigt das ganze Netz in
  Linienfarben, „City“/„Netz“ springen zur Innenstadt bzw. aufs ganze Netz.
- **Fahrten**: Liste nach Datum (mit Umstiegen und km), Filter „mit Umstieg“ und Jahr.
- **Statistik**: Fortschrittsring, Fahrten, genutzte Linien, km, Umstiege,
  Netzabdeckung (km), Ein-/Aus-/Umstiege, Halte je Linie, Fahrten je Linie,
  Kölner Stadtbezirke, Umland, meistgenutzte Halte, neu gesammelt je Monat,
  **Erfolge** (Endstation, Untergrund, Rheinquerer – alle drei Stadtbahn-Rheinbrücken,
  Innenstadt komplett, alle Stadtbezirke, …).
- Export/Import (JSON, via Teilen/Zwischenablage), Speicherung im `localStorage`.

### Wie gezählt wird

Eine Fahrt besteht aus Halten `s[0..n]` und Teilstrecken `l[0..n-1]` (Linie oder Fußweg).
Rollen ergeben sich nur aus den **gefahrenen** Teilstrecken: Start der ersten Fahrt
= Einstieg, Ende der letzten = Ausstieg, alles dazwischen = Umstieg. Ein Halt, an dem
nur ein Fußweg beginnt oder endet, zählt nicht. Zwischenhalte einer Teilstrecke werden
als „durchfahren“ geführt (nicht gesammelt), ihre Abschnitte zählen aber für Karte,
Netzabdeckung und Kilometer. Bei Linien mit zwei Laufwegen (Linie 15: Chorweiler bzw.
Longerich Friedhof) nimmt die App den kürzesten passenden.

## Lokal starten

```bash
python -m http.server 8125
```

Dann <http://localhost:8125> öffnen. (Doppelklick auf `standalone.html` funktioniert
ebenfalls, ganz ohne Server und offline.)

## Aufs iPhone bringen

Wie bei den ICE-Apps über GitHub Pages: Repo anlegen, Dateien pushen (inkl. `icons/`,
ohne `tools/raw/`), *Pages* aktivieren, URL in Safari öffnen → Teilen →
**„Zum Home-Bildschirm“**. Die Daten bleiben im localStorage des Geräts – gelegentlich
über „Exportieren“ ein Backup sichern.

## Datenbasis

- **OpenStreetMap** (© OpenStreetMap-Mitwirkende, ODbL), Stand 18.10.2026:
  Route-Relationen der KVB-Linien (Haltepositionen und Gleise), Linienfarben,
  Gemeinde-, Stadtbezirks- und Stadtteilgrenzen, Rhein.
- Haltestellen werden über den Namen zusammengeführt (z. B. Neumarkt oben und im
  Tunnel = eine Haltestelle). Ausnahme wie im KVB-Netzplan: *Bf Deutz/Messe* (1, 9)
  und *Bf Deutz/LANXESS arena* (3, 4) sind zwei Halte.
- Beide Fahrtrichtungen einer Linie werden zu einem Laufweg vereinigt; fehlt ein Halt
  in einer Richtung (OSM-Lücke), wird er ergänzt. Kurzläufer (12 bis Niehl Nord)
  entfallen, echte Äste (15 bis Longerich Friedhof) bleiben als zweiter Laufweg.
- Gemeinde, Stadtbezirk und Stadtteil per Punkt-in-Polygon aus den OSM-Grenzen;
  außerhalb von Köln/Bonn ersatzweise das VRS-Ortsteil-Tag.
- Lage „Tunnel“: Haltepositionen/Bahnsteige mit `level`/`layer` < 0, `tunnel=yes`
  oder `location=underground`.
- Namen folgen dem KVB-Netzplan (`ALIAS` in `tools/build_data.py`, z. B.
  „Bahnhof Mülheim“ → „Bf Mülheim“).

### Daten aktualisieren

```bash
cd tools
python fetch_osm.py          # Rohdaten -> raw/ (Overpass, mit Wiederholung bei Überlast)
python build_data.py         # -> ../data.js und ../geo.js, druckt alle Laufwege zum Gegenlesen
python make_icons.py         # Homescreen-Icons (nur nach Icon-Änderung)
python build_standalone.py   # -> ../standalone.html
```

Gespeicherte Fahrten referenzieren Haltestellen über ihre ID (z. B. `neumarkt`),
nicht über die Position in `data.js`. Benennt OSM eine Haltestelle um, besser einen
Eintrag in `ALIAS` ergänzen, damit die ID gleich bleibt.

*Private Sammel-App – kein Angebot der KVB.*
