# Design-Review: Farbe, Kontrast, Komponenten und Tokens

Stand: 6. November 2026 · Review aus Sicht von Design und UX, Schwerpunkt Farbe und Kontrast, dazu Wiederverwendung und
Tokens.

**Grenze des Auftrags:** Das Design der CDE Bund (Referenz: `docs/reference/cde-r/`: Topbar, Seitenleiste, Aufgaben,
Dokumente, LOIN, Statuspillen, gemessene Tokens) bleibt unverändert. Geändert wurde nur, was dieser Prototyp selbst
vorschlägt: die Datenformulare (Übersicht, Erfassung, Prüfung, Beteiligte, Dokumente, Verlauf, Planlieferungen), der
Import-Dialog und die Fusszeile. Bei CDE-Dateien wurde höchstens ein Wert unverändert benannt (`#21485c` → `--navy-border`,
ohne sichtbare Änderung).

## 1. Vorgehen

- Kontrastmessung im Browser (`tests/…` nicht dauerhaft, Skript im Review): für jeden sichtbaren Text von 20 Seiten und
  Zuständen (KV, KS gesperrt, THG inkl. Betrieb, Pläne mit allen Unter-Tabs, Import-Dialog Schritt 1 und 2) Vordergrund gegen den
  tatsächlichen Hintergrund (durch alle Ebenen und Deckkraft gemischt), WCAG 2.x, AA (4.5:1, 3:1 für grossen Text).
- Inventur aller Farbwerte im Code der Formulare: 207 Hex-Werte, 59 verschiedene, davon rund 40 fast gleiche Grautöne.
- Durchsicht des Token-Systems und der Wiederholungen in CSS und Views.

## 2. Befunde zum Kontrast

Vorher 5 bis 9 Funde je Seite, 15 verschiedene Kombinationen unter 4.5:1.

| Nr. | Befund | Wert vorher | Umsetzung |
|---|---|---|---|
| K1 | Links der Formulare («Zur Erfassung», «+ Kostenelement hinzufügen», «auswählen», «Erfassung wieder öffnen») in der Link-Farbe der CDE | 2.9:1 | Eigenes `--link-text` (#1c7c75) im Bereich der Formulare, 5.0:1. Die CDE-Linkfarbe `--link` bleibt |
| K2 | Dialog-Schritt «✓» weiss auf Grün #4c8c75 | 3.95:1 | Ein gemeinsamer Punkt (`.dot`), Navy wie im Verlauf |
| K3 | Avatare in Beteiligte: weiss auf #aab2bc | 2.1:1 | Hintergrund `--muted`, 5.3:1 |
| K4 | Gedämpfter Text auf der getönten, gesperrten Tabelle (#e9ecf0) | 4.45:1 | Tönung `--surface-locked` (#eceff3), 4.6:1; der Text in gesperrten Bereichen ist `--muted` |
| K5 | Gedämpfter Text auf dem grünen Dateikasten des Imports (#e2efed) | 4.47:1 | Text dort `--green-dark`, 8.5:1 |
| K6 | Deaktivierte Hauptschaltflächen («Zur Prüfung einreichen», «Importieren») grau auf grau | 3.1:1 | `--muted`, 4.8:1 (deaktivierte Elemente sind von WCAG ausgenommen, wichtig sind sie trotzdem) |
| K7 | Fusszeile (Prototyp-Hinweis, Quellcode, CDE Bund) | 4.3:1 | `--text-3`, 8.4:1. Die Fusszeile ist nicht Teil der CDE |
| K8 | Platzhalter in Eingabefeldern der Formulare (#8c8c8c, #bfbfbf) | 1.8 bis 3.4:1 | `--muted` für Platzhalter, «fehlt» in `--rose-text` (7.4:1) |
| K9 | **Ränder der Eingabefelder** (#d9d9d9 auf weiss) | 1.4:1, WCAG 1.4.11 verlangt 3:1 | `--field-border` (#8c93a1) für Felder der Formulare: ein Feld ist als Feld erkennbar. Die CDE-Felder behalten `--line-2`. Im gesperrten Bereich ohne Rand |
| K10 | `#6b7280` (gedämpft, 10 Stellen) auf `#f3f4f6` | 4.39:1 | Zu `--muted` zusammengeführt (4.8:1) |

**Nachher:** Auf allen Seiten der Formulare keine Kombination unter 4.5:1 mehr. Es bleiben vier Kombinationen, die zur CDE
gehören und deshalb **nicht geändert** wurden: Avatar und Zähler der Topbar (weiss auf #ccc, weiss auf #e94d65) und die
Statuspillen «In Prüfung» (#d48806 auf #fffbe6, 2.8:1) und «Abgeschlossen» (#389e0d auf #f6ffed, 3.4:1) der Ant-Palette.
Empfehlung an die CDE: dunklere Textfarben für diese zwei Pillen (z. B. #ad6800 und #237804, je über 5:1).

Zu den Farben als Aussage (Produktgrundsatz «wir werten nicht»): Statusfarben stehen nur noch für Bestätigung (`--ok`),
Fehler und fehlende Werte (`--rose`, `--rose-text`) und Hinweise (`--amber-*`). Werte und Abweichungen sind neutral
(Balkendiagramme: Navy, Marken `--mark`). Die Ringsegmente der SIA 416 (`--sia-*`) sind Kategorien, keine Wertung.

## 3. Token-System

- **Neue Ebene «Datenformulare»** in `css/tokens.css` (13 Tokens plus 5 Ringfarben): `--ink`, `--surface-1/2/sel/hover/locked`,
  `--track`, `--band`, `--veil`, `--field-border`, `--link-text`, `--ok`, `--bar-credit`, `--navy-border`, `--sia-*`. Die
  gemessenen CDE-Tokens oben in der Datei sind unverändert.
- **Hartcodierte Farben in den Formularen:** 207 → 0. Jeder Wert ist ein Token. Ein Test (`design tokens` in
  `tests/model.test.mjs`) verhindert Rückfälle: kein Hex-Wert in den Formular-Dateien, jedes verwendete Token ist definiert.
  Farben im Modell (`model/form.js`, `plan.js`) sind `var(--…)`-Zeichenketten.
- **Zusammengeführt:** 59 Werte → 24 Tokens. Beispiele: sieben gedämpfte Grautöne → `--muted`; sieben Rahmen → `--line`,
  `--line-2`, `--line-3`; neun Flächen → `--surface-1/2/sel`; drei Grüne und zwei Rot-Töne für Status → `--ok`, `--rose-text`.
- **Doppelte Tokens entfernt (gleicher Wert, zweiter Name):** `--text-2`, `--row-alt-2`, `--line-5`, `--line-6`, `--navy-2`,
  `--green-line-2`, `--req`, `--disabled` (nicht verwendet). Bildschirm unverändert.
- **Offen (CDE-Dateien, nur mit Freigabe):** 52 Hex-Werte in `components.css`, 36 in `app.css`, 15 in `shell.css`, 36 in
  `model/pill.js`, 29 in `shell.js` und weitere in den CDE-Views. Sie sind gemessen und könnten wertgleich benannt werden;
  das ändert nichts am Aussehen und wurde nicht angefasst. Ebenso fehlen Tokens für Radien (4, 6, 999 px), Schatten der
  Formulare und Abstände (viele 6/8/10/14 px); dafür gilt dasselbe.

## 4. Wiederverwendbare Komponenten

| Komponente | Vorher | Jetzt |
|---|---|---|
| **Schrittpunkt** `.dot` (Zustände `is-done`, `is-cur`, `is-err`, Grösse `dot-lg`) | Zwei Varianten: `st-dot` im Verlauf (Farben inline aus dem Modell) und `imp-step-dot` im Import-Dialog (anderes Grün, andere Farben) | Eine Komponente, Zustand als Klasse; das Modell liefert `state` statt sechs Farbwerte; `.st-label` und `.imp-step` folgen demselben Zustand |
| **Status-Chip** `.chip` (`chip-changed`, `chip-note`, `chip-ignored`) | `imp-st` mit je drei Inline-Farben aus dem Modell | Klassen, Farben aus den Status-Tokens; Zeilen im Import mit `is-changed` und `is-note` |
| **Umschalter** `.imp-tab` | Farben per Inline-Style je Zustand | `aria-pressed` steuert die Farbe (Zustand und Darstellung nicht mehr doppelt) |
| **Eingabefeld-Zustände** | Hover, Fokus und Platzhalter für `.ent-input`, `.ent-text`, `.ent-select` je einzeln (drei Kopien), `.plan-search` und `.rv-textarea` mit eigenen Regeln | Eine Regelgruppe für alle Felder der Formulare (`:is(...)`), Fokusring aus `--primary-ring` |
| **Geltungsbereich** `.fx` | – | Klasse auf `fm-cols`, `fm-stack` und den Import-Dialogen: hier gelten die Formular-Tokens (Linkfarbe, Feldrand), ausserhalb bleibt alles wie in der CDE |

**Weitere Wiederholungen, bewusst nicht umgesetzt:** Die Rasterzeilen `.ar-tr`, `.cat-tr`, `.sm-tr`, `.fm-tr`, `.ov-row`
und die `ent-*`-Zeilen teilen Schriftgrösse, Zeilenhöhe und Trennlinie, unterscheiden sich aber in Spalten und
Interaktion; eine gemeinsame Tabellenkomponente wäre ein Umbau des Rasters und gehört in eine eigene Runde. Gleiches gilt
für die zwei Karten-Fusszeilen (`card-foot`) und die Balkenlisten (`ov-*`, `tz-*`, `tgt-*`), die schon dieselbe Geometrie
verwenden.

## 5. Weitere Beobachtungen

- Zustände sind nirgends nur durch Farbe kodiert: Symbole tragen Text für Screenreader (`srOnly`), «fehlt» steht als Text,
  gesperrte Bereiche zeigen Schloss und Wort.
- Die Leiste am Fuss und der Schleier der gesperrten Erfassung haben jetzt eine feste Ebenenordnung (Leiste über Schleier).
- Prüfen mit Windows-Kontrastmodus (`forced-colors`) und Dunkelmodus wurde nicht vorgenommen; die Tokens wären die richtige
  Stelle dafür (ein Satz Werte je Modus).

## 6. Test und Abnahme

Kontrastmessung wie oben (keine Funde in den Formularen), 39 Unit-Tests, 300 Browser-Checks, Test auf Token-Verwendung.
Screenshots der Erfassung, des gesperrten Bereichs und des Import-Dialogs vor und nach der Änderung geprüft.
