# Referenz: Prüfplattform plan-check vs. Prototyp (Planlieferungen DWG)

Die Planprüfung des Prototyps ist eine Portierung der Prüfplattform [plan-check](https://github.com/bbl-dres/plan-check)
(MIT) in die Lieferungsseite der CDE Bund. Dieser Ordner hält die Referenz fest: Screenshots beider Anwendungen mit
demselben Musterplan (`CAD.V01-CAFM-Plan-DE.dwg`, 5. OG, 30 Räume, 38/40 Prüfregeln) und die Unterschiede.

Aufgenommen am 04.11.2026 mit Headless Edge (1400 px breit, DevTools-Protokoll): plan-check lokal aus
`C:\Users\david\Documents\GitHub\plan-check` (Datei über `#file-input`), der Prototyp über
`#/projects/musterhausen/deliveries/dwg-eg/erfassung` › «Musterplan laden».

## Screenshots

| Ansicht | plan-check | Prototyp |
|---|---|---|
| Prüfregeln | [plan-check-rules.png](plan-check-rules.png) | [prototyp-rules.png](prototyp-rules.png) |
| Fehlermeldungen | [plan-check-errors.png](plan-check-errors.png) | [prototyp-issues.png](prototyp-issues.png) |
| Layer | [plan-check-overview.png](plan-check-overview.png) | [prototyp-layers.png](prototyp-layers.png) |
| Räume | [plan-check-rooms.png](plan-check-rooms.png) | [prototyp-rooms.png](prototyp-rooms.png) |
| Flächen / Geschossflächen | [plan-check-areas.png](plan-check-areas.png) | [prototyp-areas.png](prototyp-areas.png) |
| Kennzahlen | [plan-check-kpi.png](plan-check-kpi.png) | [prototyp-kpi.png](prototyp-kpi.png) |
| Statusfilter aktiv | [plan-check-rules-filter-errors.png](plan-check-rules-filter-errors.png) (Fehler) | [prototyp-rules-filter-warnungen.png](prototyp-rules-filter-warnungen.png) (Warnungen) |
| Suche in der Liste | [plan-check-layers-search.png](plan-check-layers-search.png) | [prototyp-layers-suche.png](prototyp-layers-suche.png) |
| Räume ausgeblendet | – | [prototyp-rooms-ausgeblendet.png](prototyp-rooms-ausgeblendet.png) |

## Unterschiede

Stand nach dem Abgleich vom 04.11.2026. «Übernommen» heisst: im Prototyp jetzt gleich gelöst wie in plan-check.

| Bereich | plan-check | Prototyp | Stand |
|---|---|---|---|
| Ergebnisleiste | Räume, NGF, Score (38/40), Bericht mit Buttons «PDF» und «Excel» | Räume, NGF, Score (38/40), Fehler, Warnungen; der Prüfbericht (PDF) ist ein Button in der Aktionsleiste der Lieferung, links von «Musterplan laden» | bewusst anders: in der CDE gehört der Bericht zur Lieferung, nicht zur Kennzahlenleiste; Excel-Export offen |
| Sub-Tabs | Prüfregeln (38/40), Fehlermeldungen (3), Layer (17), Räume (30), Flächen (1), Kennzahlen; Zähler in Klammern | Prüfregeln «2 offen», Fehlermeldungen 3, Räume 30, Geschossflächen 1, Layer 17, Kennzahlen; Zähler als Pille | bewusst anders: Räume vor Layer, weil die Lieferung die Raumpolygone liefert; Zähler folgen wie in plan-check dem Statusfilter |
| Statusfilter «Alle / Warnungen / Fehler» rechts der Sub-Tabs | Segmentknöpfe, `aria-pressed`; filtert alle Listen: Prüfregeln und Fehlermeldungen nach Schweregrad (bestandene Regeln nur ohne Filter), Räume und Flächen nach Status, Layer nur bei «Warnungen» (unbekannte Layer); Zähler der Tabs folgen dem Filter | gleich (`data-action="planFilter"`, Logik in `js/model/plan.js › planLists`); leere Listen zeigen «Keine Einträge mit Fehlern/Warnungen.» statt einer leeren Fläche | übernommen |
| Suche über der Liste | `input[type=search]` mit Platzhalter je Tab (Prüfregel, Fehler, Layer, Raum, Fläche suchen…), filtert Zeilen nach Code, Text und Referenz; Tab-Wechsel leert die Suche | gleich (`.plan-search`, Zustand in `ui.planSearch`, Fokus bleibt beim Neuzeichnen) | übernommen |
| «Alle ein-/ausblenden» neben der Suche | Nur auf Layer, Räume, Flächen; Checkbox mit Zwischenzustand, wirkt auf die gerade gelisteten Zeilen (nach Suche/Filter) | gleich (`[data-plan-toggle-all]`); Räume und Geschossflächen haben wie in plan-check neu eine Checkbox je Zeile, ausgeblendete Zeilen sind gedimmt, ein Klick auf die Zeile blendet das Polygon wieder ein | übernommen |
| Prüfregeln-Liste | Gruppen «Nicht bestanden 2/40» und «Bestanden 38/40» einklappbar (Chevron); Klick auf eine gefallene Regel wechselt zu Fehlermeldungen und setzt die Suche auf den Code | Gruppen fest; Zeile zeigt zusätzlich die Anzahl Befunde («1×»), Klick springt direkt zum ersten Befund im Viewer | bewusst anders (kürzerer Weg zum Befund); Einklappen offen |
| Fehlermeldungen | Icon, Code, Referenz (AOID, Layer, Handle), Meldung | gleich | gleich |
| Layer-Zeilen | Checkbox, Status, leeres Farbfeld, Name, «30 Objekte» | Checkbox, Status, Farbfeld in der Layerfarbe, Name, «30 Objekte» | übernommen («Objekte»); Farbfeld bewusst farbig |
| Räume / Flächen | Checkbox, Status, AOID, Fläche (eine Dezimale) | gleich; Flächen heissen «Geschossflächen» und tragen «Bruttogeschossfläche» als Zusatz | übernommen |
| Viewer-Werkzeuge | Vollbild, Hell/Dunkel, Zoom +/−, Zoom auf Auswahl; Massstabsleiste unten links | Zoom +/−, Gesamtansicht; Massstabsleiste unten links; Koordinaten oben links | offen: Vollbild; Dunkelmodus nicht vorgesehen |
| Kennzahlen | Zwei Spalten ohne Viewer: Gebäudevolumen, Gebäudeflächen, Flächen DIN 277 ‖ Wirtschaftlichkeitskennzahlen, Donut HNF/KF, Objektübersicht | gleich, plus Hinweis zur HNF-Zuordnung ohne Raumstempel | übernommen |
| Listenbreite | 35 % (280–420 px) neben dem Viewer | 400 px (320 px unter 1280 px; unter 1024 px Liste über dem Viewer) | gleichwertig |
| Protokollzeile, Hinweistext | Log unter dem Viewer | entfernt | bewusst anders |

Nicht portiert, weil in der CDE Bund nicht gebraucht: Excel-Export, Vollbild, Dunkelmodus, Sprachumschaltung, Kameraaufnahme.
