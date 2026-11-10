# Plane Spotting – Sichtungen sammeln

Web-App zum Festhalten gespotteter Flugzeuge, optimiert fürs iPhone.
Design und Bedienlogik wie die beiden ICE-Apps (`../ice-routes`, `../ice_taufe`).

Eingetippt wird **nur der Code** – ein Kennzeichen (`D-AIMA`, `HB-JHA`, `N12345`)
oder eine Flugnummer (`LH400`, `DLH400`). Alles andere setzt die App selbst:

| Angabe | Woher |
|---|---|
| Zeit | Uhr des Geräts |
| Ort | GPS (Standortfreigabe beim ersten Eintragen) |
| Flughafen | nächster Platz zur Position aus `data.js`, große Plätze leicht bevorzugt; ohne GPS der Flughafen der letzten Sichtung |
| Staat | Kennzeichen-Präfix (offline) |
| Airline | Flugnummer-Präfix (offline) bzw. Halter (online) |
| Typ, Hersteller, Foto | online über adsbdb.com, auch **von Hand wählbar** |
| Route | bei Flugnummern online über adsbdb.com |

Zeit und Flughafen lassen sich über „ändern“ korrigieren. Bei Flugnummern mit
bekannter Route wird Start- oder Zielflughafen genommen, wenn man dort steht.

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | App-Shell (iOS-optimiert, PWA-Meta-Tags, Homescreen-Icons) |
| `style.css` | iOS-inspiriertes Design, Light/Dark Mode |
| `app.js` | Logik: Eintragen, Listen, Sammlung, Detail- und Statistik-Sheets, localStorage |
| `lookup.js` | Code-Auflösung: Kennzeichen/Flugnummer erkennen, Offline-Tabellen, Online-Abfrage mit Cache |
| `map.js` | Weltkarte (Mercator, SVG): Spotting-Flughäfen und Routen als Großkreisbögen |
| `geo.js` | Basiskarte: Landflächen und Seen weltweit (Natural Earth, stark vereinfacht) |
| `data.js` | 7.011 Flughäfen, 1.248 Airline-Codes, 192 Kennzeichen-Präfixe, 100 Typen der Sammelliste |
| `icons/` | Homescreen-Icons (120/152/167/180 px), erzeugt von `tools/make_icons.py` |
| `apple-touch-icon.png` | Kopie von `icon-180.png` – iOS fragt diese Datei von selbst ab, wenn die App an der Wurzel der Domain liegt |
| `standalone.html` | Einzeldatei-Variante (alles inline), erzeugt von `tools/build_standalone.py` |
| `tools/` | Python-Skripte, mit denen `data.js`, `geo.js` und die Icons erzeugt wurden |

## Features

- **Spotten**: Code eintippen, speichern. Die Auflösung erscheint live unter dem
  Eingabefeld (offline sofort, online ergänzt).
- **Flugzeugtyp**: kommt automatisch aus der Online-Abfrage, kann aber jederzeit
  von Hand gewählt werden – aus der Sammelliste (gruppiert nach Kategorie, mit
  Suche) oder als beliebiger ICAO-Typcode. Ein von Hand gewählter Typ bleibt
  erhalten (`tm` im Datensatz) und lässt sich über „Automatisch“ zurücksetzen.
- **Sichtungen**: kompakte Tabelle mit festen Spalten Kennzeichen · Typ ·
  Airline · Ort (IATA) · Datum. Filter Kennzeichen/Flugnummern und nach Jahr.
  Antippen öffnet die Sichtung (dort steht auch die Uhrzeit).
- **Sammlung**: Flugzeuge (gleiche Tabelle, mit Anzahl und letzter Sichtung),
  Typen (Sammelliste: gesammelt/fehlt, nach Kategorie) und Airlines. Detail-Sheets
  mit Foto (Tipp = Großansicht), Kennwerten und allen eigenen Sichtungen;
  „Nochmal gesehen“ trägt dasselbe Flugzeug mit einem Tipp erneut ein.
- **Karte**: Weltkarte mit allen Spotting-Flughäfen (grün) und den Routen der
  eingetragenen Flüge. Flughafen antippen → Sichtungen dort.
- **Statistik**: Fortschrittsring über die Typen-Sammelliste, Kacheln für
  Sichtungen / Flugzeuge / Airlines, Top-Typen, -Airlines, -Flughäfen, Staaten,
  Sichtungen je Monat. Schalter für die Online-Abfrage.
- Export/Import der Sichtungen (JSON, via Teilen/Zwischenablage), Speicherung in
  `localStorage`.

### Online-Abfrage

Ist sie an (Standard), fragt die App zu jedem Code einmal bei
[adsbdb.com](https://www.adsbdb.com/) an (frei, ohne Schlüssel) und legt das
Ergebnis im localStorage-Cache ab – dasselbe Kennzeichen wird nie zweimal
abgefragt, Routen nach 90 Tagen neu. Dabei verlässt nur der eingetippte Code das
Gerät, nie die Position. Wer das nicht will, schaltet sie in der Statistik aus;
dann bleiben Staat (Kennzeichen) und Airline (Flugnummer) aus den Offline-Tabellen.

## Lokal starten

```bash
python -m http.server 8125
```

Dann <http://localhost:8125> öffnen. Die Standortabfrage funktioniert nur über
`localhost` oder HTTPS, nicht beim Öffnen per Doppelklick.

## Aufs iPhone bringen

Die App ist statisch – am einfachsten über GitHub Pages (liefert HTTPS, das
braucht die Standortabfrage):

1. Repo anlegen, Dateien pushen (inklusive `icons/`), in den Repo-Einstellungen
   *Pages* aktivieren.
2. URL in Safari öffnen → Teilen → **„Zum Home-Bildschirm"**.

Auf dem Homescreen erscheint das blaue Flugzeug-Icon (`apple-touch-icon`,
120/152/167/180 px), und die App startet im Vollbild ohne Safari-Leisten. Die
Sichtungen bleiben im localStorage des Geräts (Tipp: gelegentlich über
„Exportieren" ein Backup sichern).

`standalone.html` per AirDrop geht auch, dann aber ohne GPS (Safari gibt den
Standort an lokal geöffnete Dateien nicht heraus) – der Flughafen muss dann von
Hand gewählt werden.

## Datenbasis

- Flughäfen: [OurAirports](https://ourairports.com/data/) (gemeinfrei) – alle
  großen und mittleren Plätze weltweit, kleine mit Linienverkehr sowie alle
  kleinen Plätze in Deutschland, Österreich und der Schweiz.
- Airline-Codes: [OpenFlights](https://openflights.org/data.html) (ODbL), mit
  einer kuratierten Korrekturliste aktueller Gesellschaften in `tools/build_data.py`.
- Kennzeichen-Präfixe, deutsche Kennzeichenklassen und die Typen-Sammelliste:
  von Hand gepflegt in `tools/build_data.py`.
- Kartengrundlage: [Natural Earth](https://www.naturalearthdata.com/) 1:50m, gemeinfrei.

### Daten aktualisieren

```bash
cd tools
python fetch_airports.py     # OurAirports -> airports.json
python fetch_airlines.py     # OpenFlights -> airlines.json
python build_data.py         # -> ../data.js
python fetch_geo.py          # Weltkarte -> ../geo.js (nur nötig, wenn sie fehlt)
python make_icons.py         # Homescreen-Icons -> ../icons/
python build_standalone.py   # -> ../standalone.html
```

Die Rohdaten (`ourairports.csv`, `openflights_airlines.dat`, `ne50_*.json`)
werden beim ersten Lauf geladen und danach wiederverwendet; zum Aktualisieren
einfach löschen.

### Icons

`tools/make_icons.py` zeichnet das Icon ohne Fremdpakete aus Rechtecken, Kreisen
und Polygonen und schreibt das PNG direkt mit `zlib`. Raster und Signaturband
(Strecke mit zwei Halten) sind identisch mit dem Icon von *ICE Verbindungen*:
statt der Wortmarke „ICE“ steht dort ein Flugzeug in Draufsicht, statt Rot ein
blauer Verlauf.

iOS speichert Homescreen-Icons pro URL zwischen. Darum hängen die Icon-Links in
`index.html` eine Versionsnummer an (`icons/icon-180.png?v=2`). Nach jeder
Icon-Änderung die Nummer hochzählen, die App vom Homescreen löschen und neu
hinzufügen – sonst zeigt iOS weiter das alte (oder ein leeres) Icon.
