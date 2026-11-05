# Code-Review: gesamte Anwendung (dritte Fassung)

Stand: 5. November 2026 · Senior-Developer-Review nach der Umsetzung der Ökobilanz mit Erstellung und Betrieb (Design vom
05.11.2026). Gesucht wurden Bugs und Fehler; dazu als Review-Themen Zustand und Persistenz, Rollen und Sperren,
Importe, Planprüfung (Engine, Zähler, Viewer, PDF), Barrierefreiheit und Tastatur, Layout auf 375/768/1024 px,
Datenkonsistenz, tote Pfade, Leistung.

Status: **behoben** = im Code umgesetzt · **offen** = Empfehlung, bewusst nicht umgesetzt (mit Begründung)

## 1. Vorgehen

Drei Review-Agenten haben den Code unabhängig voneinander nur lesend geprüft, jeden Befund mit Datei und Zeile belegt und
ihn wo möglich mit Node-Skripten gegen die echten Module oder im Headless-Browser reproduziert:

| Agent | Umfang |
|---|---|
| Modell, Zustand, Aktionen | `js/store.js`, `js/router.js`, `js/app.js`, `js/actions.js`, `js/format.js`, `js/model/*`, die konsumierten `data/*.json` |
| Planprüfung | `js/plancheck/*` (ohne Vendor), `js/plansession.js`, `js/model/plan.js`, `js/views/plan.js`, `data/plans.json` |
| Oberfläche, CSS, Barrierefreiheit | `index.html`, `js/ui.js`, `js/shell.js`, `js/study.js`, `js/views/**`, `css/*` |

Ergänzend eigene Prüfungen: ein Headless-Crawl über alle 688 Routen der Anwendung in zwei Rollen (keine Ausnahme, kein
Konsolenfehler, keine fehlgeschlagene Anfrage, keine leere Seite), der Responsive-Audit der neuen Ökobilanz-Tabs
(`tests/responsive-audit.mjs`), die Renderzeit des View-Modells (`compute()` 2.2 ms pro Render bei 41 KB Zustand) und die
Vendor-Feldnamen von LibreDWG 0.7.11. Jeder Befund wurde vor der Umsetzung verifiziert; die behobenen Punkte haben
Unit-Tests (`tests/model.test.mjs`, `tests/actions.test.mjs`) oder Checks im Browser-Test (`tests/e2e.mjs`).

Umfang: 60 JS-Module (≈13'000 Zeilen inkl. CSS), 18 JSON-Dateien. Ergebnis: 57 Befunde, davon 46 behoben, 11 offen.

## 2. Zusammenfassung

| Nr. | Schwere | Thema | Status |
|---|---|---|---|
| B1 | hoch | Seite bleibt `inert` (nichts klickbar), wenn ein Dialog (Excel-Import, Bestellen) durch Zurück, Deep-Link oder grossgeschriebenen Code nicht mehr gerendert wird | behoben |
| B2 | hoch | Pflicht-Regel beim Bestellen nimmt die Anlagekosten des Studien-Panels (24.6 Mio) statt des Projekts; Tenero (0.9 Mio) und Zollikofen zeigen «Muss» | behoben |
| B3 | mittel | Zwischentotal «A–Z Anlagekosten» ohne Hauptgruppe A | behoben |
| B4 | mittel | Excel-Import «Nur leere Felder füllen» übernimmt nichts | behoben |
| B5 | mittel | Persistierter Zustand verdrängt neue Projekte/Geschosse bis zum manuellen Versionssprung | behoben |
| B6 | mittel | Offene Formulare können die Pflichtdokumente nie erfüllen: Importe bringen keine Dateien mit | behoben |
| B7 | niedrig | Benachrichtigung und Doku nennen 25 Emissionsquellen (es sind 22) | behoben |
| B8 | mittel | `setMap`, `formGroupVal`, `formNewVal`, `formDropNew`, `thgHead`, `thgVal` schreiben auch in gesperrte Formulare (nur die View schützt) | behoben |
| B9 | – | Tool-Export bringt bewusst entfernte Emissionsquellen zurück | offen |
| B10 | mittel | «Zustand zurücksetzen und neu laden» auf der Fehlerseite ohne Wirkung (Listener erst nach dem Laden der Daten) | behoben |
| B11 | niedrig | Excel-Dialog bleibt beim Wechsel KV-32 → KS-31 am falschen Formular | behoben |
| B12 | niedrig | Transiente Felder als `null` gespeichert statt weggelassen | behoben |
| B13 | niedrig | Nutzungsgrad/JAZ 0 wird stillschweigend als Wert akzeptiert | behoben |
| B14 | niedrig | `num()` akzeptiert «12abc», «5 %», «0x10» als Zahl | behoben |
| B15 | niedrig | Query-Werte mit «=» werden abgeschnitten | behoben |
| B16 | niedrig | Auf-/Zuklappen unter «Nur fehlende Werte» ohne sichtbare Wirkung, Zustand kippt beim Ausschalten des Filters | behoben |
| B17 | niedrig | Offene Kostenformulare verlangen A Grundstück und H (immer 0) als Eingabe | behoben |
| B18 | kosmetisch | `FMT(-0.4)` ergibt «-0» | behoben |
| B19 | Hinweis | `save()` serialisiert den ganzen Zustand bei jedem Emit (0.1 ms, wächst mit DWG-Ergebnissen) | offen |
| U1 | hoch | Menü «Importieren» mit der Maus nicht klickbar: der eigene Backdrop (z-index 60) liegt über dem Menü (z-index 6) | behoben |
| U2 | hoch | Jedes Rendern (Toast-Timer nach 4 s, Hintergrundprüfung) verwirft Text, der gerade in ein Feld getippt wird | behoben |
| U3 | hoch | Alle Rollen sehen Freigeben/Zurückweisen und können die Prüfung starten, auch externe Lieferverantwortliche | behoben |
| U4 | mittel | Skip-Link «Zum Inhalt» führt auf die 404-Seite | behoben |
| U5 | mittel | Links «der Erfassung / der Übersicht» nach dem Excel-Import springen immer zum KV-32 von Musterhausen | behoben |
| U6 | mittel | Fokus geht nach «Aufschlüsseln» über den Chevron verloren (Fokus-Selektor trifft die Zeile ohne tabindex) | behoben |
| U7 | niedrig | Escape schliesst das Importieren-Menü nicht | behoben |
| U8 | niedrig | Kontrolle Ökobilanz (375 px), Vorlagen-Tabelle und Studienseiten laufen horizontal über | behoben |
| U9 | niedrig | Kontraste: gedämpfter Text auf Zebra-Zeilen 4.4:1, Nur-Lese-Felder 3.1:1; Linkfarbe 2.9:1 (Token der CDE Bund) | behoben / offen |
| U10 | niedrig | Stammdaten zeigen den Datenwert der Anlagekosten, die Regel den Studienwert | behoben |
| U11 | niedrig | Toter Code: beschriebenes «Zurücksetzen», `orderCards`/`glBg`, CSS-Klassen ohne Verwendung | behoben |
| U12 | a11y | Vorlagenzeilen als `role="button"` mit verschachteltem Schalter; «Valide» nur als Icon; Attrappen ohne Funktion (Spans als Buttons, Anker ohne href, Buttons ohne Aktion) | behoben |
| U13 | a11y | Menü-ARIA (Kopf, Trenner), `aria-controls` auf ein nicht vorhandenes Element; Typ-Menü ohne Pfeiltasten | behoben / offen |
| U14 | – | Doppelte Markups (Key/Value-Zeilen, Pager, Rastertabellen) | offen |
| P1 | hoch | Unlesbare Dateien (Zufallsbytes, DXF, abgeschnittene DWG) gelten als geprüfter Plan «INVALI (No DWG)», 28/40 bestanden | behoben |
| P2 | hoch | Die vorherige Zeichnung eines Geschosses wird vor dem Parsen verworfen: eine fehlgeschlagene Prüfung zerstört den Viewer des gültigen Ergebnisses | behoben |
| P3 | mittel | Duplizierte Raumpolygone lösen zusätzlich den Fehler AOID_001 aus (Einreichen gesperrt) | behoben |
| P4 | mittel | EBF 0 (unbeheiztes Geschoss) auf drei Ansichten verschieden: «0.0 m²», «—», «—» | behoben |
| P5 | mittel | GEOM_002 erkennt keine erhöhten LWPOLYLINE/HATCH (Höhe steht in `elevation`) | behoben |
| P6 | mittel | GEOM_003 sieht keine verbotenen Entitäten in Blöcken (Bürobeispiel: 694 SPLINE, 4 POLYLINE3D) | behoben |
| P7 | mittel | Attributtexte einer Blockreferenz behalten Layer «0» und werden als TEXT_001 gemeldet (502 von 508 Treffern) | behoben |
| P8 | mittel | Prüfbericht ohne Zeichnungsbilder, wenn er vom Sub-Tab Kennzahlen oder während des Ladens ausgelöst wird | offen |
| P9 | niedrig | LAYOUT_001 meldet die Zahl der Paper-Space-Objekte als Zahl der Layout-Tabs | behoben |
| P10 | niedrig | GEOM_005: Textumriss ist ein Quadrat um den Ankerpunkt, lange linksbündige Texte gelten als ausserhalb des Rahmens | behoben |
| P11 | niedrig | Abzugsflächen ohne Begrenzung (negative Raumflächen); verschachtelte Räume zählen doppelt | behoben / offen |
| P12 | niedrig | Zähler je Blockreferenz statt je Entität (STYLE_001/002, POLY_006); VONBLOCK unter VONLAYER gilt als «nicht VONLAYER» | behoben |
| P13 | – | Parsen und Prüfen auf dem Hauptthread (keine Worker); englische OOM-Meldung des Vendors im Toast | offen |
| P14 | niedrig | Gate-Text «30 Räume mit AOID erkannt» mit rotem Kreuz bei AOID_001 | behoben |
| P15 | niedrig | Regelzeilen wirken klickbar, obwohl nichts zu lokalisieren ist | behoben |
| P16 | – | Folgeregeln (POLY_008, GPOLY_004, LAYOUT_002, DIM_001) feuern zusätzlich zu einem fehlenden Pflicht-Layer | offen |
| P17 | niedrig | Hochladen, Musterplan, Entfernen ignorieren die Sperre der Lieferung | behoben |
| P18 | – | Viewer wird bei jedem Rendern neu angehängt (Suche im Plan wird bei grossen Plänen träge) | offen (O2 der zweiten Fassung) |
| P19 | – | Kein Limit für den Zeichnungs-Cache der Session | offen |
| E1 | – | Eigene Befunde: `package.json` ohne `"type": "module"` (Node-Warnung je Test), 404-Seite ohne Umbruch des Pfads, Kartenkopf der Zielwerte auf dem Handy | behoben |

## 3. Modell, Zustand, Aktionen (B)

- **B1** `focusOverlay()` leitete `inert` aus `ui.dialog` ab, `overlays()` rendert einen Dialog aber nur, wenn sein `when(ctx)`
  stimmt. Neu schliesst `renderPage()` einen Dialog, der nicht zur Seite gehört, und `inert` gilt nur, wenn wirklich ein
  Dialog im DOM ist; der Import-Dialog gehört zum Formular, aus dem er geöffnet wurde (`imp.form`), der Code wird
  kleingeschrieben verglichen (B11).
- **B2** `ak` kommt nur im Detailprojekt aus dem Studien-Panel, sonst aus `project.anlagekostenMio`; die Stammdaten zeigen
  denselben Wert (U10).
- **B3** A–Z = A Grundstück (ohne MWST) + B–Y × (1 + MWST), gemäss Z01 «MWST auf B–Y».
- **B4** `impApply` übernimmt im Modus «leer» nur Positionen ohne Wert und zählt diese.
- **B5** `store.load()` mischt jede Objekt-Scheibe des Zustands eine Ebene tief (`projects`, `plans`, `tplOn`, `ui` …), so
  dass neue Projekte oder Geschosse der Daten ihre Vorgaben erhalten; `STATE_VERSION` 14 für die neue Form der Formulare.
- **B6** `forms[kind].docs` sammelt die Dateien der Importe (Tool-Export, Rechenhilfe, Excel) mit Person und Datum; sie
  erscheinen unter Dokumente und zählen für die Prüfung der Pflichtdokumente (der Bericht bleibt offen, solange er nicht
  hochgeladen ist; Hochladen ist im Prototyp ohne Funktion, darum sperrt ein fehlendes Dokument das Einreichen nicht).
- **B8** Alle Eingabe-Aktionen prüfen `editable(kind)`; Sperre gilt damit auch für die Konsole und Deep-Links.
- **B9** offen: der Tool-Export ist der Abgleich mit dem Tool; eine entfernte Quelle, die das Tool weiterhin liefert, kommt
  zurück und wird als «1 Emissionsquellen übernommen» protokolliert. Eine Sperrliste entfernter IDs wäre die Alternative.
- **B13/B14/B18** Strenge Zahlenerkennung (`^[-+]?\d+(\.\d+)?$` nach Normalisierung), Nutzungsgrad ≤ 0 zählt als fehlend
  mit rotem Rahmen, `FMT` rundet −0.4 auf «0».
- **B17** A Grundstück und H Nutzungsspezifische Anlage bleiben auch auf offenen Formularen 0 (sie sind in allen
  Beispielprojekten 0); Vollständigkeit eines offenen KV-32 ist damit 2 von 27.

## 4. Oberfläche, Tastatur, Barrierefreiheit (U)

- **U1** `.dd-menu` liegt mit z-index 61 über dem Backdrop; der Browser-Test klickte per `el.click()` am Hit-Testing vorbei.
- **U2** `render()` verschiebt sich, solange das aktive Feld (`data-change`, nicht die Live-Suche) ungespeicherten Text hat
  (`value !== defaultValue`); der `change`-Handler synchronisiert `defaultValue`, `focusout` holt das Rendern nach.
- **U3** `formModel(state, data, project, user)` und `planForm(plan, data, user)` kennen die angemeldete Person: Checkliste,
  Freigeben und Zurückweisen nur für BBL-Personen (`user.internal`), die Aktionen prüfen dasselbe (`isInternal()`).
- **U4** Skip-Link mit `data-action="skipToMain"` (fokussiert `<main>`), statt `#main` dem Router zu übergeben.
- **U5** `impGoto` erhält echte Pfade des aktuellen Formulars.
- **U6** Chevron mit `data-fid`, damit der Fokus nach dem Rendern auf dem Button landet.
- **U8/U9** `.pf-filters` bricht um, die Vorlagen-Tabelle liegt in `.scroll-x`, die Studienseiten haben eine Spalte unter
  1024 px; `--muted` von #6b7280 auf #656c7a (4.8:1 auf #f3f4f6), Nur-Lese-Felder in `--muted`. Offen bleibt die Linkfarbe
  `--link` #2ba89f (2.9:1): sie ist das Token der CDE Bund, eine Änderung wäre ein Entscheid des Design-Systems.
- **U11** Das «Zurücksetzen» der Prüfung wurde am 05.11. bewusst aus der Oberfläche genommen; die Doku beschreibt es nicht mehr
  (`formResetReview`/`planResetReview` bleiben für Tests und Konsole). `[data-screen-link]` wird von den Annotationen in
  `data/screens.json` verwendet und bleibt.
- **U12** Alle Attrappen sind echte `<button>` mit `data-action="proto"` (Toast «Im Prototyp ohne Funktion», per Tastatur
  erreichbar) oder reiner Text; Vorlagenzeilen ohne `role="button"`, der Name ist ein Button mit `aria-pressed`; «Valide»
  mit Screenreader-Text.
- **U13** Kopf, Beschriftung und Trenner des Benutzermenüs mit `role="presentation"`/`"separator"`; `aria-controls` nur,
  solange die Vorschlagsliste gerendert ist. Offen: Pfeiltasten im Typ-Menü der Aufgaben (CSS-Hover-Menü der CDE Bund).
- **U14** offen: Key/Value-Zeilen (`delivery.js`, `overview.js`, `section.js`), Pager und Rastertabellen teilen sich noch
  keinen Helfer (siehe O1 der zweiten Fassung).

## 5. Planprüfung (P)

- **P1** `parseDwg` wirft ab `DWG_ERR_CRITICAL` (128, «Klassen nicht gefunden» und schlimmer) sowie bei 0 Entitäten und
  0 Layern; LibreDWG liefert auch für Müll eine Datenbank.
- **P2** `checkFile` verwirft die vorherige Zeichnung erst nach einer erfolgreichen Prüfung.
- **P3/P5/P6/P7/P9/P10/P12** Regeln korrigiert; die Seeds in `data/plans.json` wurden mit der Engine neu erzeugt: der Plan mit
  Büro-Layerstruktur hat jetzt 4 Fehler und 44 Warnungen in 14 Regeln (GEOM_003 zählt die SPLINE in Blöcken), 26/40,
  Score 65 %; der Musterplan CAD.V01 bleibt bei 0 Fehlern und 3 Warnungen. Zähler sind je Entität (Set der Handles),
  VONBLOCK unter einer VONLAYER-Referenz gilt als VONLAYER, Attribute übernehmen den Layer der Referenz, Texte werden am
  Ankerpunkt gegen den Planrahmen geprüft, LAYOUT_001 nennt Tabs und Objekte getrennt.
- **P4** `formatArea`/`formatShare` zeigen 0 als «0 m²»/«0 %» (nur `null` als Strich), damit EBF eines unbeheizten
  Geschosses überall gleich erscheint.
- **P11** Abzugsflächen sind auf 0 begrenzt; offen: verschachtelte Raumpolygone (innerer Raum zählt doppelt zur NGF), dafür
  bräuchte es eine Enthaltenseins-Prüfung mit eigener Warnung (Regelkatalog ändert sich).
- **P14/P15/P17** Gate-Text nennt die Räume ohne AOID; Regelzeilen sind nur dann als klickbar markiert, wenn ein Treffer ein
  Handle oder einen Raum hat; Hochladen, Musterplan und Entfernen prüfen die Sperre.
- **P8** offen: Bilder für den Prüfbericht kommen aus dem sichtbaren Viewer; vom Sub-Tab Kennzahlen aus gibt es keinen.
  Empfehlung: Offscreen-Canvas fester Grösse für die drei Ansichten, Auswahl danach wiederherstellen.
- **P13/P18/P19** offen (Worker, Viewer über Renders behalten, Cache-Limit): Aufwand und Risiko ohne Nutzerfeedback nicht
  gerechtfertigt; die Engine braucht für den 28'000-Elemente-Plan unter einer Sekunde.
- **P16** offen: Folgeregeln sind im Regelkatalog der CAD-Richtlinie bewusst eigene Regeln; eine Unterdrückung müsste mit
  der Fachstelle abgestimmt werden.

## 6. Eigene Prüfungen (E)

- Crawl über 688 Routen in zwei Rollen: keine Ausnahme, kein Konsolenfehler, keine 404, keine leere Seite.
- `package.json` mit `"type": "module"` (keine Node-Warnung mehr), 404-Seite bricht lange Pfade um, Kartenköpfe mit langen
  Hinweisen (Zielwerte) brechen auf dem Handy um.
- `compute()` 2.2 ms pro Render, `initialState()` 0.2 ms, Zustand 41 KB.

## 7. Tests

- `tests/model.test.mjs`: Rollen (externe Person kann nicht prüfen), Nutzungsgrad 0, Query mit «=», offene Kostenformulare
  (A und H bleiben 0), neue Seeds der Planprüfung.
- `tests/actions.test.mjs`: neu «only BBL users review» und «review 05.11.» (strenge Zahlen, −0, Zustand mischt je
  Scheibe, A–Z mit A, Importmodus «leer», Dokumente der Importe, gesperrte Eingaben); Dokumente nach Tool-Export und
  Rechenhilfe.
- `tests/e2e.mjs`: Seeds (4 Fehler) nachgezogen; die Verifikation der Oberflächen-Befunde (Hit-Testing des Menüs, kein
  `inert` nach Zurück, getippter Text, Skip-Link, Rollen, Fokus auf dem Chevron, 375 px) lief als Headless-Skript.

## 8. Prüfung

`node --test`: 34 Tests · `node tests/e2e.mjs`: 261 Checks bestanden (Edge headless, 05.11.2026).
