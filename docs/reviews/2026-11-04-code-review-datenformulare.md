# Code-Review: Datenformulare, Zustand, Oberfläche (zweite Fassung)

Stand: 4. November 2026 · Senior-Developer-Review nach der Umsetzung der zweiten Design-Fassung (Kostenelemente,
Ökobilanz als Emissionsquellen). Gesucht wurden Bugs und Fehler, Möglichkeiten, ähnlichen Code in wiederverwendbare
Funktionen und Module zusammenzuziehen, und Verbesserungen der Robustheit. Zusätzliche Themen: Barrierefreiheit,
Datenkonsistenz, Testqualität, Repository-Hygiene.

Status: **behoben** = im Code umgesetzt · **offen** = Empfehlung, bewusst nicht umgesetzt (mit Begründung)

## 1. Vorgehen

Vier spezialisierte Review-Agenten haben den Code unabhängig voneinander nur lesend geprüft und ihre Befunde mit
Dateipfad, Zeile und Codeauszug belegt:

| Agent | Umfang |
|---|---|
| Modell, Zustand, Aktionen | `js/model/*`, `js/actions.js`, `js/store.js`, `js/app.js`, `js/format.js`, `js/data.js` |
| Views, CSS, Barrierefreiheit | `js/ui.js`, `js/shell.js`, `js/views/**`, `css/*`, `index.html` |
| Daten, Tests, Dokumentation | `data/*.json`, `tests/*`, `README.md`, `docs/*` |
| Router, Planprüfung, Robustheit | `js/router.js`, `js/links.js`, `js/plansession.js`, `js/views/plan.js`, Karten, `js/model/plan.js` |

Die Befunde wurden anschliessend verifiziert, priorisiert und umgesetzt; jeder behobene Punkt hat einen Unit-Test
(`tests/model.test.mjs`, neu `tests/actions.test.mjs`) oder einen Check im Browser-Test (`tests/e2e.mjs`). Ergänzend wurde
das Rendern profiliert (Node, `compute()` pro Render).

Umfang: 58 JS-Module (5'233 Zeilen inkl. CSS), 18 JSON-Dateien. Ergebnis der Umsetzung: 67 Dateien geändert, netto
62 Zeilen weniger Code bei mehr Funktion und Tests.

## 2. Zusammenfassung

| Nr. | Schwere | Thema | Status |
|---|---|---|---|
| B1 | hoch | Excel-Import schreibt immer in den KV-32, auch aus dem KS-31 und in freigegebene Formulare | behoben |
| B2 | hoch | Aufklappen einer Hauptgruppe ohne Positionen (J, V, W, Y) nimmt ihren Betrag aus allen Totalen; auch auf gesperrten Formularen | behoben |
| B3 | hoch | Deep-Link mit falschem Typ (`?favorites=1`, `?__proto__.detailed=true`) bricht `compute()` und wird persistiert; danach jede Seite leer | behoben |
| B4 | hoch | Prüfkommentar geht bei jedem Rendern verloren; Fokus springt nach jeder Aktion an den Seitenanfang | behoben |
| B5 | hoch | Laufende Planprüfung (`busy`) und Toast werden persistiert: nach einem Reload bleibt das Geschoss gesperrt | behoben |
| B6 | mittel | «Zusammenfassen» einer Gruppe ohne Werte schreibt 0 CHF und zählt als erfasst | behoben |
| B7 | mittel | `advance` datiert den falschen Schritt; generierter Verlauf verdoppelt jede Aktion auf allen Formularen ohne eigene `history` | behoben |
| B8 | mittel | Aufgabenzähler der Topbar ändert sich mit der geöffneten Projektseite | behoben |
| B9 | mittel | Status «Entwurf» hat ein anderes Datenformat → undefinierte Farben, 404 auf `undefined.svg` | behoben |
| B10 | mittel | Fokusverwaltung greift den (unsichtbaren) Viewer-Popup statt Dialog/Drawer; Dialog ist `absolute` statt `fixed` | behoben |
| B11 | mittel | Fehlgeschlagener Download des Musterplans bleibt für die Session im Cache (kein Retry); Dateigrösse erst nach dem Lesen geprüft | behoben |
| B12 | mittel | 15 ms pro Render für `toLocaleString()` je Zelle (8 Projekte × 3 Formulare) | behoben |
| B13 | niedrig | Zwei Renders pro Navigation; Prüfregeln-Liste verliert Layer-Zustand; Tool-Export-Dokument über falsches Feld gesucht | behoben |
| A1 | hoch | Link-Aktionen ohne `href` (`<a data-action>`) sind per Tastatur unerreichbar; Fokusring 20 % Alpha unsichtbar | behoben |
| A2 | mittel | Modale Dialoge ohne `inert`, Fokus kehrt nicht zum Auslöser zurück; Tabs als `tablist` ohne Panels | behoben |
| A3 | mittel | Kontraste (Breadcrumb, Leerzustand, deaktivierte Schaltflächen), Icon-only-Bedeutung ohne Text | behoben |
| D1 | hoch | Bestellen-Drawer, Checkliste, ILP/Aufgaben/Projekte mit Texten der ersten Fassung («TP2», «Betrag je Hauptgruppe», FV-32) | behoben |
| D2 | mittel | Vorlagenversion 2.0 vs. «Version 3»; THG-Vorlage mit Hauptgruppen B–J; Schwellenwert 15 % der Vorlage nicht im Modell | behoben |
| D3 | niedrig | Erdsonden unter D05.02 (20 a) statt D05.01 (40 a); Datum der Benachrichtigung n7 vor dem Ereignis | behoben |
| C1–C10 | – | Duplikate: Vergleichsblöcke, Positionszeilen, Event-Logging, Gruppensummen, Plan-Statusregeln, Karten, Filterhelfer, toter Code | behoben |
| T1 | hoch | `js/actions.js`, `js/store.js`, `js/format.js` ohne Unit-Tests; Datenintegrität nur teilweise geprüft | behoben |
| H1 | mittel | Keine `.gitattributes` (CRLF-Checkout bricht die SHA-256-Prüfung der LibreDWG-Dateien), keine SRI-Hashes für CDN-Skripte | behoben |
| O1–O8 | – | Offene Empfehlungen (gridTable-Helfer, CSP, Viewer über Renders behalten, …) | offen |

## 3. Bugs und Fehler

### B1 Excel-Import war an den KV-32 gebunden und ignorierte die Sperre
`importItem` öffnete den Dialog auch für den KS-31, `impApply`/`impReset` schrieben immer nach `kvV` und in `forms.kv`,
der Importieren-Knopf war auch auf freigegebenen Formularen sichtbar. Jetzt merkt sich `state.imp.form` das Formular,
`impApply`/`impReset` arbeiten mit `KEYS[imp.form]`, der Dialog erscheint auf `kv-32` und `ks-31`, jeder Import prüft
`editable(kind)` (Schritt < 3) und der Knopf fehlt auf gesperrten Formularen. Test: `actions: Importieren`.

### B2 Hauptgruppen ohne Positionen
Für J, V, W, Y zeigte der Detailmodus nur hinzugefügte Kostenelemente; der Pauschalbetrag fiel aus dem Total, und auf
abgeschlossenen Formularen genügte ein Klick auf die Zeile, um die Erstellungskosten um Millionen zu senken. Jetzt ist der
Pauschalbetrag im Detailmodus eine nicht löschbare Zeile («Pauschalbetrag», Total invariant), beim Zusammenfassen werden
hinzugefügte Elemente in den Betrag gemerged, und `formMode`, `formAddPos`, `formRemovePos`, `thgAdd`, `thgRemove`,
`thgToggleHs` sind auf gesperrten Formularen wirkungslos (`canToggle: !locked`, kein Chevron). Tests: `actions:
Hauptgruppen toggle and sums`, E2E «group without positions opens with its Pauschalbetrag, total unchanged».

### B3 Deep-Links und Zustand
`routeOverrides` parst Query-Werte als JSON; `applyOverrides` schrieb sie ungeprüft in den Zustand, auch `__proto__`-Pfade,
und `store.set` persistierte das Ergebnis. Neu: `patchDotted(state, patch, { typed: true })` in `js/store.js` ersetzt einen
Wert nur durch einen Wert derselben Art (Array bleibt Array, Zahl bleibt Zahl, null darf gesetzt werden), verwirft
`__proto__`/`constructor`/`prototype` und `__v`. `render()` und `main()` fangen jeden Fehler und zeigen eine Fehlerseite mit
«Zustand zurücksetzen und neu laden» (`hardReset`, funktioniert ohne Store). Die dieselbe Funktion ersetzt das doppelte
`applyDotted` der Studien-Screens (C1). Tests: `store: version check, transient fields, dotted patches`, E2E Deep-Links.

### B4 Prüfkommentar und Fokus
Die `<textarea>` der Prüfung hatte keinen Zustand; jedes Setzen eines Prüfpunkts rendert die Seite neu und löschte den
Text. Neu `forms[kind].comment` bzw. `plans[key].comment` mit den Aktionen `formComment`/`planComment`. Die Fokuswiederherstellung
kannte nur Felder mit `data-fid`; jetzt wird jedes Steuerelement über die Signatur seiner `data-*`-Attribute wiedergefunden
(Chevrons, Prüfpunkte, Löschknöpfe, Tabs), und beim Schliessen eines Dialogs kehrt der Fokus zum Auslöser zurück.

### B5 Transiente Felder in sessionStorage
`busy` (laufende Prüfung) und `toast` werden beim Speichern ausgelassen (`TRANSIENT` in `store.js`); beim Laden werden neue
`ui`-Schlüssel mit ihren Defaults ergänzt. `runPlanCheck` meldet «Eine Prüfung läuft bereits» statt eine zweite Datei
stillschweigend zu verwerfen.

### B6–B9
`groupAmount()` (neu in `mock.js`, ersetzt `groupSum` und `groupAmounts`) liefert `null`, wenn keine Position einen Wert
hat. `advance` datiert `dates[step+1..to]` (Schritt 2 bleibt leer) und `instanceOf` generiert Verlauf und Dokumente aus
dem **initialen** Schritt der Instanz, nicht aus dem Live-Schritt (vorher erschien «Zur Prüfung eingereicht» doppelt).
`resolve` in `model/index.js` löst die Musterhausen-Zeilen von ILP und Aufgaben immer über `formsAll[detailed.id]` auf.
`PILL.Entwurf` hat jetzt die Tupel-Form der übrigen Status.

### B10–B13
Der Viewer-Popup ist `role="tooltip"`, `focusOverlay` sucht nur in `.overlay [role=dialog]`, `.drawer[role=dialog]` und
`.user-menu`; `.overlay` ist `position: fixed`, `.dialog` hat `max-width: calc(100vw - 32px)`. `plansession.loadAsset`
wiederholt einen fehlgeschlagenen Download, `checkFile` prüft die Grösse vor `arrayBuffer()`, pro Geschoss bleibt nur der
letzte Upload im Speicher, ein DWG, das neben die Drop-Zone fällt, navigiert nicht mehr weg. `format.js` nutzt einmal erzeugte
`Intl.NumberFormat`-Instanzen (15.6 → 1.4 ms pro Render für alle Formulare aller Projekte). `render()` löscht einen
ausstehenden Timer, Layer-Checkboxen lesen `viewer.hiddenLayers`, das Tool-Export-Dokument wird über `d[1] === 'Excel'`
gefunden.

## 4. Barrierefreiheit (A1–A3)

- `linkBtn()` in `js/ui.js` rendert Link-Aktionen als `<button class="btn-link">` («Kostenelement hinzufügen», «Entfernen»,
  «Erfassung wieder öffnen», «Zurücksetzen», «Musterplan laden», Import-Links); `iconBtn()` für Icon-Knöpfe mit Namen.
- `:focus-visible` in Navy mit 2 px Abstand (weiss auf Topbar und Banner); Skip-Link «Zum Inhalt»; `.sr-only` für die
  Bedeutung von Icons (Prüfregeln, Räume, Valide-Spalte); Datei-Eingaben sind fokussierbar (`.vh` statt `hidden`).
- Modale Dialoge und Drawer setzen `inert` auf Banner, Topbar, Seite und Footer; Tabs sind eine `<nav aria-label>` mit
  `aria-current="page"`; Plan-Untertabs haben `aria-controls` und ein `tabpanel`; statische Menüeinträge sind
  `role="menuitem" aria-disabled`; Checkboxen tragen `aria-disabled`.
- Kontraste: Breadcrumb und Leerzustand in `--muted` (4.8:1), deaktivierte Schaltflächen `#8c8c8c` auf `#f5f5f5`;
  Abweichungen in der Prüfung mit Klasse `.is-over` und `title` statt nur Farbe; Seitenzahlen des Audit-Logs sind Links.

## 5. Komplexität (C1–C10)

| Nr. | Vorher | Nachher |
|---|---|---|
| C1 | `applyDotted` (actions) + `applyOverrides` (app) | `patchDotted` in `store.js`, von Studie und Deep-Links genutzt |
| C2 | Positionszeilen zweimal (Basis, hinzugefügt) in `costPart` | eine Closure `addPos()` für Basis, Pauschalbetrag und Kostenelement |
| C3 | Vergleichstabellen in `costPart` und `thgPart` | `compareRows(groups, prev, kwOf, dv, limit)` |
| C4 | `egOf` in actions und model, Einheit/Amortisation doppelt berechnet | `egOf(data, code)` in `mock.js`; `thgVal` schreibt Name/Einheit/Amortisation, das Modell liest sie |
| C5 | `events: [...f.events, ev(…)]` achtmal | `logEv()`, `advance()`, `backToEntry()` |
| C6 | Plan-Statusregeln in `plan.js`, `form.js` (`PLAN_STEP`) und `actions.js` | `PLAN_STATUS[status].formStep`, exportierte `LOCKED`/`REVIEWABLE`; Aktionen prüfen `planModel`-Flags |
| C7 | `groupSum` (actions) ≈ `groupAmounts` (mock) | `groupAmount()` |
| C8 | Skalierungs-Ausdrücke `Math.max(1000, roundTo(… * scale * jit(…)))` sechsmal | `chf()`, `qty()` |
| C9 | `rv`/`bar`/`badges` je in `dataForm` und `planForm` | `reviewOf()`, `barOf()`, `badgesOf()` |
| C10 | Literale `3` für die Sperre | `LOCKED_FROM` importiert, `editable(kind)` |
| Views | `card`, `headLink`, `hint`, `filterBtn`, `filterField`, `sortIcon` in bis zu fünf Dateien | `js/ui.js` (`card` rendert den Kopf als `<h2>`) |
| Karten | Dashboard und Projektkarte je 40 Zeilen Lebenszyklus | `js/views/parts/map.js` (`mountMap`/`unmountMap`, ein AbortError-Guard, Fallback erst nach `load`) |
| Tot | `when`, `stepper`, `checkItem`, `pctS`, `setMap` (Store), `THG_KEYS`, `setSia`, `noop`, `nav`, `s02.js`, `meta2`, `btnLabel`, `isSubmitted`, `planStatusLabel`, `kvTitle`, `gf`/`ebf`, `impHints`, `importedOn`, `quotients`, ≈45 CSS-Regeln | entfernt |

## 6. Daten und Texte (D1–D3)

- Bestellen-Drawer liest Titel und Beschreibung aus `templates.json › orderOptions`; Checkliste der Planprüfung ohne FV-32;
  ILP/Aufgaben/Projekte sprechen von «Hauptgruppen und Kostenelemente eBKP-H (Menge + Kosten)» und «Emissionsquellen je
  Elementgruppe»; `documents.json` «(KV, THG, DWG)»; Screens s02/s05/s08/s10 und die Studiennotizen widersprechen der
  Anwendung nicht mehr. `delivery.js` nennt den Prüfenden des Projekts statt immer Paula Muster.
- Vorlage Kosten eBKP-H Version 3.0 (Einstellungen, Benachrichtigung n9, Datenformulare); THG-Vorlage mit Hauptgruppen
  B–G (SIA 2032); Schwellenwert der Abweichung je Formularart (`devPct`: KV 10 %, KS 15 %, THG 15 %) im Vergleich, in den
  automatischen Prüfungen (neu auch für den THG-32) und in der Fusszeile.
- Erdsonden als Elementgruppe D05.01 «Wärmequelle, -senke» mit 40 a (eBKP-H 2020; D05.02 Wärmeerzeugung bleibt 20 a);
  SIA-31-Wert der Hauptgruppe B angepasst; n7 datiert nach dem letzten «fertig gemeldet»; alle JSON-Dateien enden mit
  Zeilenumbruch.

## 7. Tests und Hygiene

- Neu `tests/actions.test.mjs` (9 Tests): Aufschlüsseln/Zusammenfassen, Kostenelemente, Emissionsquellen, Importe
  (Tool-Export, Excel, gesperrt), Workflow (Einreichen, Prüfung, Zurückweisen, Freigeben, Übertragen, Zurücksetzen,
  Studien-Screens), Plan-Freigabe über die Modell-Gates, Mock (deterministisch, kalibriert, `groupAmount`,
  `mergeToolExport`), Store (Version, transiente Felder, `patchDotted`), Formatierung.
- `tests/model.test.mjs`: Datenintegrität um Elementgruppen und Amortisation der Quellen, Vorlagenversion ↔ `vorlage`,
  Benachrichtigungen (Lieferung, Tab), Aufgaben ↔ ILP, `dates.length === step + 1` und einen Wächter gegen veraltete
  Begriffe erweitert; Schwellenwert 15 % des THG-32 und Pauschalbetrag abgedeckt.
- `tests/e2e.mjs` (205 Checks): Kommentar überlebt das Rendern, Fokus bleibt auf dem Prüfpunkt, Verlauf ohne Duplikate,
  Pauschalbetrag, gesperrte Formulare ohne Import/Chevron, Seitenlinks des Logs, Deep-Links mit falschem Typ und
  `__proto__`.
- `.gitattributes` (LF, Binärdateien), `.editorconfig`, `package.json` mit `npm test`, `npm run e2e`; SRI-Hashes und
  `crossorigin` für MapLibre (cdnjs); README mit Daten- und Kartenquellen; Pfad im Vendor-README korrigiert.

## 8. Offen (bewusst nicht umgesetzt)

| Nr. | Empfehlung | Begründung |
|---|---|---|
| O1 | Ein `gridTable()`-Helfer mit `--cols`-Variable für die 25 Inline-Spaltendefinitionen und die sieben Kopf/Zeilen-Klassenpaare; `.ent-cell` statt der `!important`-Kette in `form.css` | grosser Umbau aller Tabellen-Views ohne funktionalen Gewinn; separat angehen |
| O2 | Plan-Viewer über Renders behalten (wie die Karten) statt `attach()` bei jedem Zustandswechsel | betrifft nur die Erfassung eines DWG; Risiko für den Viewer-Zustand, erst mit Nutzerfeedback |
| O3 | Content-Security-Policy als `<meta>` (GitHub Pages) | braucht Freigabe aller Tile-, Sprite- und Glyph-Hosts von swisstopo/OpenFreeMap; ohne Test gegen die Produktionshosts riskant |
| O4 | MapLibre lazy laden statt `defer` im `<head>`, Fonts nicht render-blockend | Verhalten offline ist mit dem Text-Fallback akzeptabel; Lazy-Loading ändert das Timing der Kartentests |
| O5 | `screenIdFor` aus `LEGACY` ableiten; Routen-, Sektions- und Sidebar-Tabellen aus `PATTERNS` generieren | Tabellen sind klein und durch Tests abgesichert; Ableitung spart wenig |
| O6 | Anlagekosten 24.6 Mio (Stammdaten) vs. 20.65 Mio (A–Z der Erfassung) angleichen; externe Lieferverantwortliche als Mitglieder | fiktive Werte, Entscheid des Auftraggebers |
| O7 | «KBOB Gebäudetechnik 33» (Sanitäranlagen Büro) mit verifizierter Listen-ID | ID in den öffentlichen Quellen nicht belegt (siehe `data/thg.json › note`) |
| O8 | E2E: Zustand je Abschnitt zurücksetzen, feste `sleep()` durch Warten auf den Render ersetzen, Zählwerte aus `cde.data` lesen; `tests/lib/cdp.mjs` für den gemeinsamen Browser-Code von E2E und Refshots | Abschnitte bauen absichtlich aufeinander auf (ein Durchlauf des Workflows); Umbau separat |
| O9 | Wireframe-Zips (5.3 MB) aus dem Repository nehmen | Design-Exporte des Auftraggebers; das Zip vom 04.11. enthält die massgebende Komponente |

## 9. Prüfung

`node --test`: 25 Tests · `node tests/e2e.mjs`: 205 Checks bestanden (Edge headless, 04.11.2026).
