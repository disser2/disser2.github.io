# ICE Taufnamen – Sammel-App

Web-App zum Sammeln gesichteter benannter IC/ICE-Fahrzeuge (Zugtaufen auf Städte
und Regionen), optimiert für das iPhone. Inspiriert vom Look der
Kennzeichen-Sammel-App (siehe `kennzeichen/`).

## Dateien

| Datei | Zweck |
|---|---|
| `index.html` | App-Shell (iOS-optimiert, PWA-Meta-Tags) |
| `style.css` | iOS-inspiriertes Design, Light/Dark Mode |
| `app.js` | Logik: Suche, Filter, Sortierung, Detail-/Statistik-Sheets, localStorage |
| `data.js` | 269 Taufnamen mit Taufdatum, Taufort, Baureihe, Triebzug, Wappen-URL und Namensträger-Historie |
| `tools/` | Python-Skripte, mit denen `data.js` aus Wikipedia generiert wurde |

## Features

- 269 Taufnamen (232 Städte/Gemeinden, 37 Regionen), Stand 08/2026
- Wappen von Wikimedia Commons (243 Einträge; Regionen ohne Wappen bekommen einen Platzhalter-Schild)
- Gesehen-Toggle mit Datum (nachträglich änderbar), Speicherung in `localStorage`
- Suche über Taufname, Triebzugnummer, Taufort und Baureihe
- Filter: Gesehen/Fehlt, Städte/Regionen, aktuell vergebene Namen, Zugtyp
- Sortierung: Name, Taufdatum, letzte Sichtung
- Detail-Sheet mit kompletter Namensträger-Historie (z. B. Nürnberg: ICE-TD 5504 → ICE 1 111 → ICE 1 175)
- Statistik-Sheet: Fortschrittsring, Auswertung nach Zugtyp und Kategorie, Sichtungen der letzten 12 Monate
- Export/Import der Sammlung (JSON, via Teilen/Zwischenablage)

## Lokal starten

```bash
python -m http.server 8123
```

Dann <http://localhost:8123> öffnen. (Direktes Öffnen der `index.html` per
Doppelklick funktioniert auch, nur die Wappen brauchen eine Internetverbindung.)

## Aufs iPhone bringen

Die App ist statisch (4 Dateien) – am einfachsten über GitHub Pages:

1. Repo anlegen, Dateien pushen, in den Repo-Einstellungen *Pages* aktivieren.
2. URL in Safari öffnen → Teilen → **„Zum Home-Bildschirm"**.

Die App läuft dann im Vollbild wie eine native App; die Sammlung bleibt im
localStorage des Geräts erhalten. (Tipp: gelegentlich über „Exportieren" ein
Backup der Sammlung sichern.)

## Datenbasis

- [Wikipedia: Liste benannter IC/ICE-Fahrzeuge](https://de.wikipedia.org/wiki/Liste_benannter_IC/ICE-Fahrzeuge)
  (Tabellen „Ursprüngliche Zugtaufen", „Nachträgliche Änderungen",
  „Übertragung von Namen" sowie „Namensgebung IC/ICE-Züge nach Regionen")
- Wappen: Wikimedia Commons (via Wikipedia-API, PageImages + Artikel-Bildlisten)

### Daten aktualisieren

Im Ordner `tools/`:

```bash
cd tools
curl -s "https://de.wikipedia.org/w/index.php?title=Liste_benannter_IC/ICE-Fahrzeuge&action=raw" -o wiki_raw.txt
python parse_wiki.py      # Wikitext -> parsed.json
python aggregate.py       # parsed.json -> entries.json (ein Eintrag pro Taufname)
python fetch_wappen.py    # Wappen via PageImages -> entries_wappen.json
python fetch_wappen2.py   # zweiter Durchlauf über Artikel-Bildlisten
python fetch_wappen3.py   # kuratierte Spezialfälle (Berlin, Wien, ...)
python build_data.py      # -> ../data.js
```
