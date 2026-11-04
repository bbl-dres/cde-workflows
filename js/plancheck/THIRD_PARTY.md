# Prüf-Engine für DWG-Pläne (`js/plancheck/`) — Herkunft und Lizenzen

Der Ordner `js/plancheck/` ist eine Portierung der Engine des Prototyps
**Plan Checker / Prüfplattform Flächenmanagement** (https://github.com/bbl-dres/plan-check, MIT-Lizenz, siehe [LICENSE](LICENSE))
in DOM-freie ES-Module für die CDE-Bund-Prototyp-Anwendung. Übernommen wurden:

| Datei hier | Quelle in plan-check | Inhalt |
|---|---|---|
| `geometry.js` | `js/geometry.js` (unverändert) | Polygonfläche mit Bulges, Punkt-in-Polygon, Selbstüberschneidung, kanonischer Hash, Affintransformationen, Bogen-/Spline-Abtastung, Pole of Inaccessibility |
| `util.js` | `js/utils.js` (nur DOM-freie Teile) | AutoCAD-Farbindex → Hex, Schweizer Zahlenformat |
| `rules.js` | `js/rules.js` + `locales/de.json` (`rule.*`) | Regelkatalog (40 Regeln, 10 Kategorien) mit deutschen Texten, Score |
| `dwg.js` | `js/dwg-processing.js` | DWG lesen (LibreDWG WASM), Modellbereich, Blöcke/INSERT auflösen, Render-Primitive, Zeichnungsfakten |
| `validate.js` | `js/validation.js` (Extraktion und Regeln, ohne Seitenpanel-UI) + `locales/de.json` (`msg.*`) | Räume/Flächen/Abzüge, AOID-Zuordnung, alle Prüfregeln |
| `kpi.js` | `js/kpi.js` | Kennzahlen SIA 416 (GF, KF, NGF, NF, HNF, NNF, VF, FF) |
| `viewer.js` | `js/renderer.js`, `js/camera.js`, `js/selection.js` | Canvas-Viewer (Pan, Zoom, Pinch, Auswahl, Hervorhebung, Raum-/Flächen-Overlay, Massstab, Popup) als Klasse |
| `index.js` | `js/app.js` (Dateiverarbeitung) | `checkDwg(buffer)`: Parsen → Aufbereiten → Prüfen → kompaktes Ergebnis |

Nicht übernommen: PDF-/Excel-Export (jsPDF, SheetJS von CDN), i18n (FR/IT/EN), Erklärfilm, API-Doku, `prototype1/`.

## Gebündelte Drittsoftware

| Komponente | Version | Lizenz | Ort | Verwendung |
|---|---|---|---|---|
| [@mlightcad/libredwg-web](https://github.com/mlightcad/libredwg-web) (LibreDWG, kompiliert zu WebAssembly) | 0.7.11 | **GPL-3.0**, siehe [`js/vendor/libredwg-web/LICENSE`](../vendor/libredwg-web/LICENSE) | `js/vendor/libredwg-web/` (dist/, wasm/, README mit Quell-URLs und SHA-256) | DWG-Dateien im Browser lesen |

LibreDWG ist ein GNU-Projekt unter GPL-3.0-or-later. Bei Weitergabe der Anwendung sind Lizenztext und Hinweise zusammen mit dem
WebAssembly-Build zu behalten. Der Build wird erst beim ersten Prüfen eines Plans geladen (`import()` in `dwg.js`, ~10 MB);
`.wasm` sollte als `application/wasm` ausgeliefert werden (Python `http.server`, GitHub Pages tun das).

## Musterdateien (`assets/plans/`)

| Datei | Herkunft | Verwendung |
|---|---|---|
| `CAD.V01-CAFM-Plan-DE.dwg` | plan-check `assets/test-files/`, CAFM-Musterplan BBL (Anhang CAD.V01 der CAD-Richtlinie) | Vorbefüllte Geschosse UG, 1. OG, 2. OG; «Musterplan laden» |
| `2011-DM-0-A04-6A1.dwg` | plan-check `assets/test-files/`, Testdatei mit Büro-Layerstruktur | Vorbefülltes EG (Beispiel einer nicht richtlinienkonformen Lieferung) |

Die Dateien werden ausschliesslich lokal im Browser verarbeitet; nichts wird an einen Server gesendet.
Die CAD-Richtlinie BBL V1.0 sowie SIA 416 / DIN 277 sind nicht Teil dieses Repositories.
