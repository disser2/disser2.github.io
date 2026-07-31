# Forest Runner

Ein Pixel-Art Jump'n'Run im Stil der Vorlage (`Gemini_Generated_Image_*.png`) — komplett in
einer einzigen Datei, ohne Build-Schritt und ohne externe Assets. Alle Grafiken werden zur
Laufzeit auf ein 336x460-Canvas gezeichnet und pixelgenau hochskaliert.

## Starten

Einfach `index.html` im Browser öffnen (Doppelklick genügt), oder per lokalem Server:

```bash
python3 -m http.server 8123
```

Dann http://localhost:8123 aufrufen.

## Steuerung

| Aktion       | Tastatur                  | Touch        |
|--------------|---------------------------|--------------|
| Laufen       | ← → bzw. A / D            | ◀ ▶          |
| Springen     | Leertaste, ↑, W oder Z    | A            |
| Sprinten     | Shift oder X              | B            |
| Ton an/aus   | M                         | ♪            |
| Neustart     | R (nach Game Over)        | A            |

Sprunghöhe ist variabel: kurz antippen = kleiner Hüpfer, gedrückt halten = voller Sprung.
Zusätzlich gibt es Coyote-Time und einen Input-Buffer, damit Sprünge an Kanten nicht verschluckt werden.

## Spielinhalt

- **3 Level** (140 / 152 / 168 Tiles breit) mit Bodenabschnitten, Schluchten mit Wasserfall
  und Plattform-Etagen zum Hochklettern.
- **6 Herzen**, 5 Leben, Zeitlimit 300 s pro Level.
- **Münzen** (+100), **Gegner stampfen** (+200), **Ziel-Flagge** (+1000 plus Zeitbonus).
- Zwei Gegnertypen: laufende Stachel-Kreatur (dreht an Kanten und Wänden um) und eine springende Variante.
- Kontakt von der Seite kostet ein Herz, Wasser kostet ein Herz und setzt am letzten
  Bodenabschnitt zurück (Checkpoint).
- Chiptune-Sounds über die WebAudio-API, keine Sounddateien.

## Aufbau von `index.html`

- **Pixel-Font** (5x7 Bitmap) für HUD und Overlays
- **Level-Daten** als kompakte Specs (`solids`, `coins`, `enemies`, `trees`, `goal`) in Tile-Koordinaten;
  `SHIFT` hebt die komplette Geometrie an, damit die Schlucht unter dem Boden sichtbar bleibt
- **Physik**: fester 120-Hz-Zeitschritt, AABB-Kollision gegen das Tile-Grid (X dann Y)
- **Rendering**: Parallax-Ebenen (Himmel/Wolken → ferne Baumreihe → Büsche → Hecke) → Wasser →
  Baumstämme → Tiles → Entities → Blätterdach im Vordergrund → HUD

Neue Level lassen sich anlegen, indem dem `LEVELS`-Array ein weiterer Eintrag hinzugefügt wird —
Bodenreihe ist 25, Plattform-Etagen liegen auf 22 / 19 / 16 / 13 (max. 3 Tiles Höhenunterschied
pro Sprung).
