# Code-Review: Prototyp «Datenlieferungen KV und THG»

Stand: 3. November 2026 · Autor: Senior-Developer-Review im Rahmen des Prototyps
Status: **behoben** = im Code umgesetzt · **offen** = Empfehlung, bewusst nicht im Prototyp umgesetzt

## 1. Ziel und Vorgehen

Gesucht wurden in erster Linie Bugs und Fehler. Zusätzlich wurden die Themen Routing/Zustand, Lebenszyklus und
Performance, Sicherheit (Templating), Barrierefreiheit, Datenkonsistenz, toter Code und Testabdeckung geprüft.
Auslöser war ausserdem die Meldung «die Karte scheint kaputt zu sein».

Vorgehen

- Vollständiges Lesen von `js/` (Bootstrap, Router, Links, Actions, Shell, Model, alle Views), `css/` und `data/`.
- Syntaxprüfung aller Module mit `node --check`, Suche nach ungenutzten Exporten und Importen.
- Karte: Diagnose im Headless-Browser über das DevTools-Protokoll (Container- und Canvas-Grössen, `position`,
  Style-Ladezustand, Anzahl WebGL-Canvases nach mehrfachem Seitenwechsel).
- Verhalten: bestehender E2E-Test (`tests/e2e.mjs`, 62 Checks) als Regressionsnetz; neue Checks für jeden Befund.
- Modell: neuer Unit-Test (`tests/model.test.mjs`) für View-Model, Router und Screen-Zuordnung.

Umfang: 61 JS-Module (~3'300 Zeilen), 9 CSS-Dateien (~700 Zeilen), 15 JSON-Dateien.

## 2. Zusammenfassung

| Nr. | Schwere | Thema | Status |
|---|---|---|---|
| B1 | hoch | Karte wird nicht angezeigt (Container 0 px hoch), WebGL-Kontext pro Besuch neu erzeugt | behoben |
| B2 | hoch | `#/tasks/all?type=…` mit unbekanntem Typ wirft `TypeError` und lässt die Seite leer | behoben |
| B3 | mittel | Aktivitäten-Feed und Überblick verlinken auf `#undefined` (Projekt Musterhausen) | behoben |
| B4 | mittel | Unbekannter Studien-Kurzlink (`#s99`) lässt eine leere Seite zurück | behoben |
| B5 | mittel | Fehlerhafte Prozent-Kodierung im Hash wirft `URIError` beim Routing | behoben |
| B6 | mittel | Lieferung ohne Tab-Segment: zwei URLs für dieselbe Ansicht, keine Studien-Annotation | behoben |
| B7 | mittel | Zeilenaktionen der Aufgabenliste zunächst nur bei Hover sichtbar und nicht per Tastatur erreichbar | behoben |
| B8 | niedrig | Paginierung «1-10 von 21» statisch, stimmt nicht mit der Liste überein | behoben |
| B9 | niedrig | Fehlermeldungen beim Start/Rendern werden unescaped in den DOM geschrieben | behoben |
| B10 | niedrig | Projektstammdaten doppelt (`project.json` und `projects.json`) | behoben |
| B11 | niedrig | Fokus wandert nicht in Dialoge und Drawer; `aria-modal` fehlt teilweise | behoben |
| B12 | niedrig | Toter Code: `stub.js`, `deliveryTabs`, `fvTabs`, `KV_CRUMBS`, ungenutzte Importe, ungenutzte JSON-Felder | behoben |
| B13 | niedrig | Studien-Farbe `#313d4e` hart kodiert statt Token `--navy` | behoben |
| B14 | niedrig | Debug-Haken `host.__map` an einem DOM-Element | dokumentiert |
| B15 | mittel | Keine Unit-Tests für das Rechenmodell; E2E deckt die Review-Befunde nicht ab | behoben |

## 3. Die Karte (B1)

Symptom: Auf der Startseite erscheint unter «Einblicke» nur die Ortsliste (Fallback) oder ein leerer Kasten;
im Browser sichtbar ist eine Karte mit 300 px Höhe, die aus dem Kasten herausragt oder gar nicht gezeichnet wird.

Diagnose (Headless Edge, DevTools-Protokoll)

```
host: [488, 390]   container: [488, 0]   containerPos: 'relative'
containerClasses: 'dash-map-canvas maplibregl-map'   canvasCss: ['488px', '300px']
```

Drei Ursachen

1. **CSS-Reihenfolge.** `index.html` lud `maplibre-gl.css` nach `css/app.css`. MapLibre setzt auf dem Container
   `.maplibregl-map { position: relative }`. Diese Regel hat dieselbe Spezifität wie
   `.dash-map-canvas { position: absolute; inset: 0 }` und gewinnt, weil sie später kommt. Der Container verliert
   damit seine Ausdehnung (`inset: 0` wirkt nur bei `absolute`), ist 0 px hoch, und MapLibre fällt auf seine
   Default-Canvas-Grösse von 300 px zurück.
2. **Kein Lebenszyklus.** `mount()` erzeugte bei jedem Rendern der Startseite eine neue `maplibregl.Map`, ohne die
   alte zu entfernen. Jeder Zustandswechsel (Persona, Benachrichtigungen, Toast) und jeder Rückweg zur Startseite
   legte einen weiteren WebGL-Kontext an; Browser begrenzen diese auf etwa 16 und geben danach «WebGL context lost».
3. **Zu breiter Fallback.** Der Fehler-Handler wechselte bei *jedem* Fehler mit «load» oder «fetch» im Text auf den
   OpenFreeMap-Style, auch bei einem einzelnen fehlenden Sprite oder Tile. So wurde die swisstopo-Karte durch eine
   Weltkarte ersetzt, obwohl der Style geladen war.

Nebenbefund: Die Screenshots mit `--virtual-time-budget` zeigten die Karte nie, weil das virtuelle Zeitbudget abläuft,
bevor der Style geladen ist. Der neue E2E-Check wartet real (bis 15 s) auf `map.loaded()`.

Umsetzung

- `index.html`: Vendor-CSS (MapLibre) vor dem eigenen CSS; `.dash-map-canvas` mit explizitem `width/height: 100%`
  und `position: absolute !important` (dokumentierte Ausnahme, weil die Vendor-Regel gleich spezifisch ist).
- `js/views/dashboard.js`: Die Map-Instanz überlebt Re-Renders der Startseite. Das Karten-Element wird in den neuen
  DOM verschoben (`appendChild`) statt neu gebaut; `map.resize()` nach dem Umhängen. Beim Verlassen der Seite ruft
  `app.js` neu `view.unmount()` auf, der `map.remove()` ausführt. Nach drei Besuchen bleibt genau ein Canvas im DOM,
  nach dem Verlassen keines (E2E «one map canvas after re-visits», «map removed when leaving»).
- Fallback nur noch, wenn der Style selbst nicht geladen werden kann (Fehler-URL beginnt mit der Style-URL oder
  Meldung enthält «style») und `isStyleLoaded()` falsch ist.
- `host.__map` bleibt als Test- und Diagnose-Haken, im Code als solcher kommentiert (B14).

## 4. Befunde im Detail

### B2 · Unbekannter Aufgaben-Typ wirft (hoch)

`js/views/tasks.js` las `TYPES.find(t => t[0] === type)[1]`. Für `?type=xyz` ist das Ergebnis `undefined`, der
Zugriff `[1]` wirft, `render()` fängt den Fehler und zeigt «Fehler beim Rendern». Jeder getippte oder veraltete Link
brach die Seite. Behoben: unbekannte Typen fallen auf «Alle Typen» zurück. E2E «unknown ?type falls back».

### B3 · Links auf `#undefined` (mittel)

`appModel` übernahm für das ausgearbeitete Projekt `base.auRows` ohne `href`; die projektübergreifende Liste
(`allTasks`) hatte den `href`, die Projektliste nicht. Der Aktivitäten-Feed (`activities`) und damit der Überblick
verlinkten auf `#undefined`. Behoben: `auRows` erhalten den `href` einheitlich aus `delivery` bzw. der
Aufgabenseite. E2E «no undefined links», «activity links resolve»; Unit-Test prüft alle `href` der Zeilen.

### B4 · Unbekannter Kurzlink (mittel)

`onHashChange` übergab jede `#sNN`-Adresse an `actions.studyGo`; für eine unbekannte Id fand diese keinen Eintrag
und renderte nichts. `render()` kehrt bei `legacy`-Routen ohnehin früh zurück, also blieb die Seite leer. Behoben:
unbekannte Ids werden per `replaceHash('/')` auf die Startseite geführt. E2E «unknown legacy id → start page».

### B5 · `decodeURIComponent` ungeschützt (mittel)

`matchRoute` und `parseHash` dekodierten Segmente und Query-Werte direkt; `#/projects/%E0%A4%A/overview` wirft
`URIError` ausserhalb jeder Fehlerbehandlung. Behoben: `safeDecode` gibt bei ungültiger Kodierung den Rohwert zurück.
Unit-Test «malformed percent-encoding does not throw».

### B6 · Lieferung ohne Tab (mittel)

`#/projects/musterhausen/deliveries/kv-32` und `…/kv-32/erfassung` zeigten dieselbe Ansicht, aber
`screenIdFor()` lieferte für die kurze Form `null`: keine Studien-Annotation, keine Markierungen, zwei Adressen für
einen Zustand. Der Default-Tab war zudem in `delivery.js` lokal definiert. Behoben: `links.js` exportiert
`DELIVERY_TABS` und `defaultDeliveryTab(code, user)`; `app.js` ersetzt die kurze Form per `location.replace` durch
die kanonische Adresse (kein History-Eintrag). E2E «canonical delivery URL (intern → Prüfung / extern → Erfassung)».

### B7 · Zeilenaktionen per Tastatur (mittel)

Die neuen Zeilenaktionen (Öffnen, Bearbeiten, Löschen am Zeilenende) waren zunächst mit `visibility: hidden`
ausgeblendet und nur bei Hover sichtbar. Unsichtbare Elemente sind nicht fokussierbar, Tastaturnutzende erreichten sie
nie; der E2E-Check hat das aufgedeckt. Die CDE Bund zeigt die Aktionen zudem immer. Behoben: die Aktionen sind eine
immer sichtbare, klebende Spalte (`position: sticky; right: 0`) mit Zeilenhintergrund und Schatten, die über den
scrollenden Spalten liegt; die Kopfzeile hat die passende leere Zelle.

### B8 · Statische Paginierung (niedrig)

`vm.pagination` kam aus `tasks.json` («1-10 von 21») und passte weder zur Projektliste (9 Zeilen) noch zur
gefilterten Liste. Behoben: die gemeinsame Tabelle berechnet «1-n von n»; das Feld wurde aus den Daten entfernt.

### B9 · Unescapte Fehlermeldungen (niedrig)

`app.js` schrieb `e.message` und `e.stack` per `innerHTML`. Die Texte stammen aus eigenem Code, nicht aus
Benutzereingaben; trotzdem ist das die einzige Stelle, an der das Escaping der `html`-Templates umgangen wurde.
Behoben: Escaping über `esc()`.

### B10 · Projektstammdaten doppelt (niedrig)

`data/project.json` trug Name, Phase, Anlagekosten des Musterprojekts parallel zu `projects.json`;
`state.js` las `anlagekostenMio` aus der alten Datei. Behoben: `project.json` enthält nur noch die Studienwerte
(Stand, MwSt, Kostenziel, Anlagekosten); der Initialzustand liest das ausgearbeitete Projekt aus `projects.json`.
`tasks.json` verlor die ungenutzten Felder `notifications` und `pagination`.

### B11 · Fokus-Management (niedrig)

Dialoge, Drawer und Menü wurden gerendert, der Fokus blieb auf dem auslösenden Button. Behoben: `focusOverlay()`
setzt den Fokus beim Öffnen auf das erste Element des Dialogs (`[autofocus]`, Schliessen-Button, erster Button) und
beim Schliessen zurück auf den Seiteninhalt; `aria-modal="true"` am neuen Spaltendialog. Offen: kein Fokus-Trap.

### B12 · Toter Code (niedrig)

Entfernt: `js/views/stub.js`, `deliveryTabs` und `markerAt` in `shell.js`, `fvTabs` in `s10.js`, `KV_CRUMBS`/`KV_TABS`
in `s03.js`, `escapeTo`/`render` der Overlay-Views `s03c`/`s03d`, ungenutzte Importe (`pageHead`, `data`, `pill`,
`breadcrumb`) in neun Views, Popover-Styles in `views-a.css`, Felder in `tasks.json`. `s02.js` (alter Bestell-Dialog
der Studie) bleibt als Referenz, ist im Dateikopf entsprechend markiert und wird nicht mehr geladen.

### B13 · Harte Farben (niedrig)

`#313d4e` (Navy der Studie) stand nach dem Design-Review noch an 25 Stellen: `ui.js` (Radio, Toggle), die
Modell-Module (Stepper-Punkte, Import-Tabs, Vorlagen-Chips, KS-31-Balken), `shell.js`, `order.js`, `s03c`, `s06`,
`s10`, `section.js` und `study.css`, obwohl die Anwendung auf `--navy` (`#10384f`) umgestellt ist. Alle Stellen sind
Inline-Style-Werte, daher behoben mit `var(--navy)`. Offen: Icon-Farben wie `#1f2937`/`#3a4350` in Views;
Empfehlung `currentColor` plus Farbe am Elternelement.

### B15 · Tests (mittel)

Das Rechenmodell (KV, THG, SIA 416, KS-31, Import, DWG) war nur über den Browser-Test abgedeckt. Neu:
`tests/model.test.mjs` (node:test, 11 Tests): Datenkonsistenz (Mitglieder, Projekt-Referenzen, Status-Schlüssel),
KV-Total `18'490'000` und Summe der Positionen, BKP-Variante, THG-Summe und Prüf-Status, FV-Ableitungen, Dashboard
(«offen = on track + verspätet»), alle Zeilen-Links, Router-Muster, Query-Overrides, Round-Trip jedes Studien-Screens
(`LEGACY` → Route → `screenIdFor`), Default-Tab pro Rolle, Spaltenkonfiguration. `tests/e2e.mjs` wuchs von 62 auf
85 Checks (Karte, Spaltendialog, Zeilenaktionen, kanonische URLs, Robustheit).

## 5. Weitere Review-Themen

**Architektur.** Klare Trennung Daten → Store → `compute()` → Views → Event-Delegation. Die Views sind reine
Funktionen über `ctx`; Zustand liegt ausschliesslich im Store. `appModel` und das Studienmodell werden in jedem
Render komplett neu gerechnet (rund 1 ms), das ist bei dieser Grösse richtig. Zwei Punkte sind für eine Weiterführung
relevant: (1) Jeder Zustandswechsel ersetzt den gesamten DOM (`innerHTML`); der Fokus wird über `data-fid` gerettet,
Scroll-Positionen innerhalb von Tabellen nicht. (2) Views ohne `unmount()` sind in Ordnung, solange nur die Karte
Ressourcen hält; weitere Mounts (Charts, Editoren) sollten das Muster aus `dashboard.js` übernehmen.

**Routing.** Hash-Router mit den URLs der CDE Bund. Query-Parameter, die keine Routen-Parameter sind, patchen den
Zustand genau einmal beim Betreten (Deep-Links). Das ist praktisch für Screenshots, aber ein Deep-Link bleibt nach dem
Patch in der Adresszeile stehen; `?review=freigegeben` wird nicht entfernt. Offen (bewusst): ein `replaceHash` nach
dem Patch würde Reload-Verhalten ändern.

**Sicherheit.** Das `html`-Tag escaped alle Interpolationen; `raw()` wird nur für selbst erzeugte Fragmente genutzt.
Geprüft wurden alle 23 `raw(`-Aufrufe und `Popup.setHTML` (escaped via `esc()`). Keine Benutzereingabe erreicht ein
Attribut ohne Escaping. Externe Ressourcen: MapLibre (cdnjs, Version gepinnt), swisstopo-Vektorkacheln, Google Fonts.

**Barrierefreiheit.** Tabellen sind `div`-Gitter ohne `role="table"`; die Fake-Selects (`.field`) sind nicht
fokussierbar; Markierungen der Studie tragen `title`. Tastatur: `Enter`/`Space` auf `[role]`-Elementen und `Escape`
sind zentral behandelt. Offen: Rollen für Gitter, Fokus-Trap in Dialogen, `aria-sort` an Spaltenköpfen.

**Daten.** 8 Projekte mit Koordinaten, Mitgliedern und Lieferungen; Referenzen (Benachrichtigung → Projekt,
Portfolio → Projekt, Mitglied → Benutzer) werden jetzt im Unit-Test geprüft. Der Zustand in `sessionStorage` hat eine
Version (`__v`); sie wurde auf 5 erhöht, weil `taskCols` neu ist. Ältere Sitzungen starten frisch.

**CSS.** Tokens aus dem Design-Review; einzelne Views tragen noch Inline-Styles mit Pixelwerten (Spaltenbreiten,
Abstände), was der Studienvorlage geschuldet ist. Die Ausnahme `!important` ist auf die MapLibre-Kollision beschränkt.

## 6. Neue Funktionen aus diesem Review (Vorgabe aus der CDE Bund)

- **Zeilenaktionen als Overlay.** Öffnen, Bearbeiten, Löschen liegen als `position: sticky` Gruppe am rechten Rand der
  Zeile über der scrollenden Tabelle (Hintergrund der Zeile, Schatten nach links), immer sichtbar wie in der CDE Bund.
  Gilt für `#/tasks/*` und `#/projects/:pid/tasks` (gemeinsame Tabelle `js/views/parts/taskTable.js`).
- **Tabelle konfigurieren.** Das Zahnrad öffnet den Dialog der CDE Bund: «Alle auswählen» (mit Mischzustand),
  Spalten Anzeigen/Spalte/Anheften/Sortieren, «Name» fest aktiviert, Spalten ohne Daten im Prototyp (Bereich,
  Zugewiesen am, Gestartet am, …) ausgegraut. OK übernimmt die Auswahl in `state.taskCols` (persistiert), Abbrechen
  und Escape verwerfen den Entwurf. Anheften und Drag-Sortierung sind im Prototyp statisch.

## 7. Offene Empfehlungen

1. Fokus-Trap und `inert` für den Seiteninhalt bei offenem Dialog oder Drawer.
2. `role="table"/"row"/"columnheader"` und `aria-sort` für die Gitter; Fake-Selects als `button` mit `aria-haspopup`.
3. Icon-Farben über `currentColor` statt Hex-Werten in den Views.
4. Deep-Link-Overrides nach dem Anwenden aus der URL entfernen (Entscheid: Screenshot-Komfort vs. Reload-Semantik).
5. Sortieren und Filtern in den Listen real umsetzen, wenn der Prototyp zur Benutzerstudie geht.
6. ESLint (`eslint:recommended`, ESM) als optionales `npx`-Kommando, kein Build nötig.

## 8. Prüfen

```
python -m http.server 8080      # im Projektordner
node --test                     # Modell, Router, Screen-Zuordnung (11 Tests, tests/model.test.mjs)
node tests/e2e.mjs              # Headless-Browser, 85 Checks, Screenshots im Temp-Ordner
```
