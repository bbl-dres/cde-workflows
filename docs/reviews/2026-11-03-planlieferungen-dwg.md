# Planlieferungen DWG für das CAFM — Integration von plan-check

Stand 03.11.2026. Projekt «Verwaltungszentrum Musterhausen» (`musterhausen`). Ein Grundriss = eine Lieferung.

## Was integriert wurde

Die Prüf-Engine des Prototyps [plan-check](https://github.com/bbl-dres/plan-check) («Prüfplattform Flächenmanagement», MIT)
wurde als DOM-freie ES-Module nach `js/plancheck/` portiert; die Zuordnung Datei ↔ Quelle steht in
[`js/plancheck/THIRD_PARTY.md`](../../js/plancheck/THIRD_PARTY.md), die MIT-Lizenz in `js/plancheck/LICENSE`.

| Ordner / Datei | Inhalt |
|---|---|
| `js/plancheck/geometry.js`, `util.js`, `rules.js`, `dwg.js`, `validate.js`, `kpi.js`, `index.js` | DWG parsen (LibreDWG), Blöcke auflösen, Render-Primitive, Räume/Flächen/Abzüge/AOID extrahieren, 40 Prüfregeln, Score, Kennzahlen SIA 416; `checkDwg(buffer)` liefert Zeichnung (für den Viewer) und ein kompaktes JSON-Ergebnis (für den Zustand) |
| `js/plancheck/viewer.js` | Canvas-Viewer als Klasse (Pan, Zoom, Pinch, Auswahl, Hervorhebung von Befunden, Raum-/Flächen-Overlay, Massstab, Popup); wird nach jedem Re-Render der App an das neue `<canvas>` gehängt, Kamera und Auswahl bleiben erhalten |
| `js/vendor/libredwg-web/` | `@mlightcad/libredwg-web` 0.7.11 (LibreDWG → WebAssembly, **GPL-3.0**), unverändert kopiert inkl. LICENSE und README mit SHA-256; wird per `import()` beim ersten Prüfen geladen (~10 MB), genau wie in plan-check (kein Build, kein Worker nötig) |
| `assets/plans/CAD.V01-CAFM-Plan-DE.dwg` (373 KB), `assets/plans/2011-DM-0-A04-6A1.dwg` (1.9 MB) | Musterdateien aus plan-check: der offizielle BBL-Musterplan CAD.V01 und ein Plan mit Büro-Layerstruktur |
| `js/plansession.js` | Browser-Sitzung: Zwischenspeicher der geparsten Zeichnungen, Laden der Musterdateien, Prüfen hochgeladener Dateien (lokal, nichts wird hochgeladen) |
| `js/model/plan.js` | View-Model pro Geschoss: Status, Pill, Prüfregeln (bestanden / nicht bestanden), Gate, Stepper, Checks, Kennzahlen, Verlauf, Meta |
| `js/views/plan.js` | Tabs Erfassung und Prüfung; `mountPlan()` verdrahtet Viewer, Drag & Drop, Listen-Klicks (Befund → Hervorhebung) ohne Store-Roundtrip |
| `css/plan.css` | Styles (nach `views-d.css` eingebunden) |
| `data/plans.json` | Geschosse, Stammdaten der Lieferung, Checkliste, Stepper und **seeds**: unveränderte Engine-Ergebnisse der Musterdateien |
| `data/ilp.json`, `data/tasks.json`, `data/notifications.json` | fünf ILP-Zeilen, fünf Aufgaben (Typ «Aufgabe», Kategorie CAFM), drei Benachrichtigungen; Status über `plan: "EG"` an den Zustand gebunden |
| `js/links.js`, `js/views/delivery.js`, `js/actions.js`, `js/model/{state,index}.js`, `js/data.js`, `index.html` | Routen/Tabs (`DELIVERY_TABS`, Default-Tab nach Rolle), Lieferseite mit `mount/unmount`, Aktionen, Zustand (`plans`, `STATE_VERSION` 7), Laden der Daten |
| `assets/icons/` | Lucide 0.460.0: `zoom-in`, `zoom-out`, `maximize`, `layers`, `file-check`, `loader-circle`, `ruler` (ISC) |

Nicht übernommen: PDF-/Excel-Export (jsPDF/SheetJS von CDN), Sprachen FR/IT/EN, Erklärfilm, API-Doku, `prototype1/`.
Die Studien-Screens B1/B2 (`s10.js`, `s11.js`, FV-32 › «Geschosse und Pläne») sind unverändert.

## Workflow

Lieferungen `DWG-UG`, `DWG-EG`, `DWG-OG1`, `DWG-OG2`, `DWG-DG` (Lieferverantwortlich Alex Beispiel, Muster Architekten AG; Gewerk Architektur;
«DWG nach BBL CAD-Richtlinie · Prüfregeln Flächenmanagement»). Tabs: Erfassung, Prüfung, Beteiligte, Dokumente, Verlauf.
Routen `#/projects/musterhausen/deliveries/dwg-eg[/erfassung|pruefung|beteiligte|dokumente|verlauf]`; ohne Tab wird für externe
Personen `/erfassung`, für BBL-Personen `/pruefung` kanonisiert (wie KV-32/THG-32).

1. **Erfassung** (Lieferverantwortlicher): DWG per Drag & Drop oder Dateiauswahl, «Musterplan laden» als Demo-Pfad. Die Datei wird im Browser
   geparst und gegen die 40 Regeln der CAD-Richtlinie BBL V1.0 geprüft. Ergebnisleiste (Räume, NGF, Score, Fehler, Warnungen), Sub-Tabs
   Prüfregeln / Fehlermeldungen / Räume / Layer / Kennzahlen, Viewer mit Hervorhebung (Klick auf Befund oder Raum), Layer ein-/ausblenden.
   Rechts «Lieferung», «DWG-Datei», «Prüfung vor dem Einreichen», Knopf **Einreichen zur Prüfung**.
2. **Gate**: Einreichen ist erst möglich, wenn eine Datei geprüft ist und **keine Prüfregel mit Schweregrad Fehler** verletzt ist.
   Warnungen sind zulässig und werden dem Prüfer angezeigt (Semantik der Richtlinie: «Fehler: Plan wird nicht freigegeben; Warnung:
   Plan kann mit Warnungen freigegeben werden»). Ein striktes «alle 40 Regeln» würde auch den offiziellen BBL-Musterplan blockieren
   (38/40: TEXT_001 Texte auf A_ELEKTRO/V_REFERENZPUNKT, STYLE_002 Farbe nicht VONLAYER auf V_PLANLAYOUT/V_BEMASSUNG).
3. **Einreichen** → Status «Eingereicht», Erfassung gesperrt (kein Upload, kein Entfernen), Verlauf- und ILP-Eintrag, Toast; «Zurücksetzen» für die Demo.
4. **Prüfung** (Projektleitung BBL, Persona PM): Stepper Bestellt → In Bearbeitung → Eingereicht → In Prüfung → Freigegeben → An CAFM übertragen,
   Prüfergebnis schreibgeschützt (gleiche Listen und Viewer), automatische Checks, Checkliste «Plan entspricht CAD-Richtlinie BBL V1.0»
   und «Flächen plausibel», Kommentar, **Freigeben** (erst nach Checkliste) / **Zurückweisen**, dann «An CAFM übertragen» → Abgeschlossen.
   Nicht eingereichte Lieferungen zeigen dem BBL kein Ergebnis. Zurückgewiesen → Erfassung wieder offen, erneut einreichen möglich.

Status je Geschoss im Zustand (`state.plans[key].status`): `offen`, `bearbeitung`, `eingereicht`, `pruefung`, `freigegeben`, `uebertragen`,
`zurueck`; Anzeige: Offen, In Bearbeitung, Eingereicht, In Prüfung, Freigegeben, Abgeschlossen, Zurückgewiesen. Die Kacheln des
Informationslieferplans zählen diese Status mit.

## Regeln

Unverändert aus plan-check (`docs/pruefregeln-de.md` dort): LAYER 001–008, POLY 001–008, GPOLY 001–005, AOID 001–006, GEOM 001–005,
TEXT 001–002, STYLE 001–002, LAYOUT 001–002, DIM 001, HATCH 001; Fehler/Warnung je Regel, Score = bestandene Regeln / 40.
Deutsche Texte aus `locales/de.json` sind in `rules.js` und `validate.js` eingebettet.

## Daten (Demo-Vorbelegung)

| Lieferung | Status | Datei (Anzeige) | Geometrie / Ergebnis |
|---|---|---|---|
| DWG-UG | Abgeschlossen | 9999.AA.U1_CAFM.dwg | Musterplan CAD.V01 · 38/40, 0 Fehler, 3 Warnungen, 30 Räume, NGF 517 m², GF 572 m² |
| DWG-EG | In Bearbeitung | 9999.AA.00_CAFM.dwg | 2011-DM-0-A04-6A1.dwg (Büro-Layerstruktur) · 27/40, 3 Fehler (R_RAUMPOLYGON, R_AOID, R_GESCHOSSPOLYGON fehlen), 0 Räume → Einreichen gesperrt |
| DWG-OG1 | Abgeschlossen | 9999.AA.01_CAFM.dwg | Musterplan CAD.V01 |
| DWG-OG2 | In Prüfung | 9999.AA.02_CAFM.dwg | Musterplan CAD.V01 |
| DWG-DG | Offen | – | noch keine Datei |

Die seeds in `data/plans.json` sind die unveränderten Ergebnisse der Engine; `node --test` prüft sie gegen die Engine (LibreDWG läuft
auch unter Node). Neu erzeugen, falls die Engine ändert:

```js
// node --input-type=module < gen.mjs  (aus dem Projektordner)
import { readFileSync } from 'node:fs';
const { checkDwg } = await import('./js/plancheck/index.js');
const buf = readFileSync('assets/plans/CAD.V01-CAFM-Plan-DE.dwg');
const { result } = await checkDwg(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), { name: 'CAD.V01-CAFM-Plan-DE.dwg', size: buf.length });
console.log(JSON.stringify({ ...result, src: 'assets/plans/CAD.V01-CAFM-Plan-DE.dwg' }));   // → data/plans.json › seeds.cadv01
```

## Was gemockt ist

- Die Anzeigenamen der vorbelegten Dateien (9999.AA.xx_CAFM.dwg) sind fiktiv; Geometrie und Prüfergebnis stammen aus den beiden Musterdateien.
- Hochgeladene Dateien bleiben nur im Speicher der Browser-Sitzung (nichts wird hochgeladen oder gespeichert). Das Prüfergebnis liegt im
  Zustand (sessionStorage); nach einem Neuladen zeigt der Viewer «Zeichnung nicht mehr im Speicher», bis die Datei erneut gewählt wird.
- Benachrichtigungen, Beteiligte, Dokumente, Übergabe an das CAFM und der Kommentar an den Lieferanten sind statisch bzw. ohne Funktion.
- Es gibt keinen PDF-/Excel-Prüfbericht (in plan-check über CDN-Bibliotheken; hier bewusst weggelassen).

## Offene Punkte

- Produktentscheid Gate: nur Fehler blockieren (umgesetzt) oder zusätzlich bestimmte Warnungen (z. B. LAYER_008 unbekannte Layer)?
- Abgleich der Ebene (EE) in der AOID mit dem Geschoss der Lieferung (im Musterplan Ebene 05) als zusätzliche Regel; Abgleich der
  Summen GF/NGF mit FV-32 (Studie B1 «Summen in FV-32 übernehmen») — im Prototyp noch nicht verbunden.
- Nutzungsarten (HNF/NNF/VF/FF) kommen erst mit dem Raumstempel R_RAUMSTEMPEL der Prüfstelle; bis dahin zählen alle Räume zur HNF.
- Grosse Pläne (hier 28 000 Primitive) werden bei jedem Re-Render der App neu gezeichnet; bei sehr grossen Dateien wäre ein
  Offscreen-Cache oder ein Worker sinnvoll. Die GPL-3.0 des LibreDWG-Builds ist bei einer Weitergabe der Anwendung zu beachten.
- Aufgabentyp: die Lieferungen erscheinen als Typ «Aufgabe» (Kategorie CAFM); ein eigener Typ «Plan (DWG)» wäre ein Produktentscheid.

## Tests

- `node --test`: drei neue Tests (Daten/Status, Gate und Review-Fluss, seeds = Engine).
- `node tests/e2e.mjs`: Abschnitt «10. Planlieferungen (DWG)»: ILP-Zeilen und Kacheln, kanonische URLs, Fehlerliste und gesperrtes
  Einreichen, WASM-Parse im Viewer, Befund lokalisieren, Musterplan laden (38/40), Kennzahlen, Räume, Einreichen, Verlauf/Dokumente,
  Upload über das echte Datei-Eingabefeld (`DOM.setFileInputFiles`), Prüfung als PM (Checkliste, Freigeben, Übertragen), Zurückweisen,
  erneutes Einreichen, Aufgabenliste. Abschnitt 1 zählt im ILP neu 12 statt 7 Zeilen (die einzige Änderung an bestehenden Checks).
