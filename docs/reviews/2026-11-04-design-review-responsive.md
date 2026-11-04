# Design-Review: Responsive Design und Mobile

Stand: 4. November 2026 · Review aus Sicht Design/UX mit Fokus auf responsives Verhalten und Bedienung auf
Touch-Geräten. Geprüft wurde der Prototyp auf drei Breiten unterhalb der Referenz (Phone 375 px, Tablet 768 px,
kleines Notebook 1024 px) gegen die Breakpoints der CDE Bund (Tailwind: sm 640, md 768, lg 1024, xl 1280) und gegen
das Verhalten der Angular/NG-Zorro-Komponenten, die die CDE Bund verwendet (`nz-sider` mit Breakpoint lg,
`nz-table` mit horizontalem Scrollen).

Status: **behoben** = im Code umgesetzt · **offen** = Empfehlung, bewusst nicht umgesetzt (mit Begründung)

## 1. Vorgehen

1. **Automatisierte Messung** mit Headless Edge 156 über das DevTools-Protokoll (`tests/responsive-audit.mjs`): für
   17 Seiten je Breite ein Screenshot der ganzen Seite und Messwerte — Scrollbreite gegen Fensterbreite (horizontaler
   Überlauf), die Elemente, die über den rechten Rand laufen, Bedienelemente unter 24 × 24 px, Text unter 11 px,
   Eingabefelder unter 16 px (iOS zoomt beim Fokus) und ob die Sidebar off-canvas ist.
2. **Sichtprüfung** der Screenshots: Startseite, Projekte (Karten und Liste), Aufgaben, Überblick, Informationslieferplan,
   Kostenvoranschlag (Übersicht, Erfassung, Prüfung), Ökobilanz, Planlieferung DWG, Dokumente, Mitglieder, LOIN,
   Einstellungen; Sidebar geöffnet; Benachrichtigungen.
3. **Code-Lektüre** der Stylesheets (Breakpoints, feste Breiten, `100vh`, Hover-only-Muster) und der Shell
   (`js/shell.js`, `js/app.js`).
4. Umsetzung, zweite Messung, Browser-Tests (`tests/e2e.mjs`, neu 14 Prüfungen bei 375 px).

Was bereits gut war: Off-Canvas-Sidebar mit Backdrop unter 1024 px, Kachel- und Kartenraster mit Stufen 5/3/2/1,
Benachrichtigungs-Drawer und Menüs mit `max-width: 100vw`, die grossen Datentabellen (Lieferplan, Aufgaben, Projekte,
Erfassungs- und Vergleichstabellen) in Scrollcontainern mit Mindestbreite, Planprüfung gestapelt unter 1024 px,
Skip-Link, `aria-expanded` und `aria-current` in der Navigation.

## 2. Messwerte vor und nach dem Review

| Messung | vorher | nachher |
|---|---|---|
| Seiten mit horizontalem Überlauf bei 375 px | 2 (DWG-Erfassung 468 px, Dokumente 484 px) | 0 von 17 |
| Seiten mit horizontalem Überlauf bei 1024 px | 3 (Überblick 1048 px, Dokumente 1040 px, Einstellungen 1032 px) | 0 von 17 |
| Eingabefelder unter 16 px bei 375 px | Kostenvoranschlag 33 von 33, Ökobilanz 50 von 50, Prüfung 1 von 1 | 0 |
| Tabellen, deren Spalten auf 375 px zusammenfielen | 4 (Projektaufgaben, Dokumente, Dateien, Mitglieder) | 0 (scrollen) |
| Bedienelemente unter 24 px bei 375 px (Aufgabenliste) | 41 von 109 | 42 von 109 — Textlinks in Zeilen und Zeilen-Checkboxen; die Zeile selbst ist 34–44 px hoch, Buttons und Icon-Knöpfe sind jetzt 32–36 px |
| Browser-Tests | 221 | 238 |

## 3. Befunde

### Hoch

| Nr. | Bereich | Befund | Massnahme | Status |
|---|---|---|---|---|
| H1 | Topbar ≤ 639 px | Das Suchfeld schrumpft auf rund 20 px, der Suchknopf liegt auf der Glocke; der Name des Benutzers ist zwar ausgeblendet, aber Hilfe und Einstellungen (im Prototyp statisch) nehmen Platz | Suche als Icon (Feld ausgeblendet, Knopf als Topbar-Icon), Abstände reduziert, Hilfe/Einstellungen unter 480 px ausgeblendet | behoben |
| H2 | Tabellen ohne Scrollcontainer | Überblick › Projektaufgaben: Spalten auf zwei Buchstaben («A… A… A…»); Dokumente: die Spalte Name bekommt bei 1024 und 375 px 0 px, die Zeilenaktionen laufen 16 px über; Dateien und Mitglieder quetschen | `.scroll-x` mit Mindestbreite je Tabelle (520 / 680 / 560 / 480 px); Zeilenaktionen bleiben sticky | behoben |
| H3 | Überlauf der Seite | DWG-Erfassung bei 375 px: Dateiname und Metadaten (`nowrap`) laufen unter die Knöpfe und verbreitern die Seite auf 468 px; Überblick bei 1024 px: Werte der Projektdaten werden abgeschnitten; Einstellungen bei 1024 px: Tabs 8 px über | `card-hint` umbricht; `meta-row` mit `minmax(0, 1fr)` und Umbruch in den Werten; Tabs scrollen bis 1279 px | behoben |
| H4 | Zweispaltige Layouts 1024–1279 px | Überblick zeigt neben der Sidebar zwei Spalten auf 770 px (Projektbild und Projektdaten auf 300 px); Dokumente: Baum 308 px + Tabelle 430 px | eine Spalte unter 1280 px (`.overview`, `.two-pane`) | behoben |
| H5 | Planprüfung | Der Statusfilter «Alle / Warnungen / Fehler» steht rechts in der scrollenden Tab-Zeile und ist auf Phone, Tablet und 1024 px nicht sichtbar | Tab-Leiste `.plan-tabbar`: unter 1280 px rutscht der Filter unter die Tabs, die Tabs behalten 560 px und zeigen alle sechs Reiter | behoben |
| H6 | Banner und Footer ≤ 639 px | Banner zweizeilig in 28 px fester Höhe; Footer mit zwei Einträgen bricht um und wird abgeschnitten | Banner mit Kurztext «Prototyp – nur zur Demonstration»; Footer mit automatischer Höhe und Umbruch | behoben |

### Mittel

| Nr. | Bereich | Befund | Massnahme | Status |
|---|---|---|---|---|
| M1 | Horizontal scrollende Tabellen | Lieferplan, Aufgaben, Projekte, Vergleichs- und Erfassungstabellen (660 / 1000 px) scrollen, zeigen das aber nicht an: kein Scrollbalken auf Touch, kein Hinweis am Rand | Ausblendkante am Rand, der noch Inhalt verdeckt, per Scroll-Timeline (`animation-timeline: scroll(self inline)`, ohne JavaScript, hinter `@supports`); dünner Scrollbalken; bei sticky Aktionsspalte nur links | behoben |
| M2 | Touch-Ziele | Buttons 28 px, Icon-Knöpfe 24 px, kleine Buttons 22 px, Checkboxen 14–15 px, Topbar-Icons 20 px, Blätter-Knöpfe 28 px, Kartenpins 16 px (WCAG 2.5.8: 24 px, Apple: 44 pt) | `css/responsive.css`: unter `(pointer: coarse)` 32–44 px für Buttons, Icon-Knöpfe, Felder, Navigation, Tabs, Checkboxen, Viewer-Werkzeuge, Pins; der Desktop behält seine Dichte | behoben |
| M3 | Eingabefelder auf Phones | Felder mit 12.5–13 px: iOS zoomt beim Fokus in die Seite (33 Felder im Kostenvoranschlag, 50 in der Ökobilanz) | 16 px für Text-, Zahl- und Auswahlfelder unter 768 px auf Touch-Geräten (kein `maximum-scale`, das würde das Zoomen blockieren) | behoben |
| M4 | Karte | MapLibre reagiert nur auf `window.resize`; nach einem Umbruch des Rasters (Breakpoint, nachgeladenes Bild) blieb der Canvas schmaler als die Box (768 px: ≈ 400 von 750 px; 1024 px: ≈ 350 von 450 px) | `ResizeObserver` im Karten-Slot ruft `map.resize()`; Browser-Test (Box verkleinern ohne Fenster-Resize) | behoben |
| M5 | Off-Canvas-Sidebar | Die Seite dahinter scrollt mit; Escape schliesst Menüs, aber nicht die Sidebar | `body.side-open { overflow: hidden }`; Escape und `closeMenus` schliessen die Sidebar | behoben |
| M6 | Toolbar Lieferplan ≤ 767 px | Suchfeld und Suchknopf brechen getrennt um (Knopf allein auf neuer Zeile) | `searchBox` als Einheit `.search-wrap` | behoben |
| M7 | Projektdaten | Labelspalte 190 px: Werte quetschen bei 1024 px, auf 375 px brechen Labels im Wort («Projektbezeichnun g») | 150 px unter 1280, 130 px unter 480 px; Umbruch nur in Werten | behoben |

### Niedrig

| Nr. | Bereich | Befund | Massnahme | Status |
|---|---|---|---|---|
| N1 | `100vh` | Mobile Browser rechnen die Adressleiste mit: Seitenkarte und Body zu hoch, Sprung beim Scrollen | `100dvh` hinter `@supports` | behoben |
| N2 | Bewegung | Spinner, Slide-ins und Hover-Transitions laufen auch bei «weniger Bewegung» | `prefers-reduced-motion: reduce` schaltet Transitions und Animationen ab | behoben |
| N3 | Notch / Home-Indicator | kein `viewport-fit`, keine Safe-Area-Ränder | `viewport-fit=cover`, `env(safe-area-inset-*)` am Rahmen | behoben |
| N4 | Breadcrumb | Glieder bis 260 px: auf Phones nur ein Glied lesbar | 180 px unter 1280, 130 px unter 640 px | behoben |
| N5 | Tabs der Lieferung | sechs Tabs laufen zwischen 1024 und 1279 px über (Einstellungen: 8 px) | Tabs scrollen bis 1279 px, mit Ausblendkante | behoben |

### Offen (Empfehlungen für die Produktion)

| Nr. | Thema | Empfehlung | Begründung, warum nicht umgesetzt |
|---|---|---|---|
| O1 | Erfassungstabellen auf dem Phone | Unter 640 px eine Kartenansicht je Position (Code, Bezeichnung, Menge, Betrag untereinander) statt der 660 / 1000 px breiten Tabelle; alternativ Erfassung nur auf Tablet/Desktop anbieten | Datenformulare sind Schreibtischarbeit (Excel-Import, viele Spalten); die Kartenansicht wäre eine zweite Formular-Implementierung für den Prototyp |
| O2 | Aufgabenliste auf dem Phone | Listenansicht mit Name, Status, Fällig statt neun scrollender Spalten; der vorhandene Spalten-Dialog könnte je Breite einen Standardsatz setzen | Spaltenlogik ist produktseitig (CDE Bund) zu entscheiden |
| O3 | Sticky erste Spalte | In breiten Tabellen bleibt die Namensspalte beim Scrollen sichtbar | Die Grid-Tabellen bräuchten eine zweite sticky Zelle mit Hintergrund; Aufwand gegen Nutzen im Prototyp |
| O4 | Fokus in Overlays | Off-Canvas-Sidebar und Drawer fangen den Fokus nicht; die Sidebar hat keinen Schliessen-Knopf (Backdrop, Escape, Hamburger) | Fokusfalle ist ein Thema der Komponentenbibliothek (nz-drawer) |
| O5 | Projektkarten unter 480 px | Bild oben statt rechts, damit der Titel mehr als 140 px bekommt | bewusst wie die CDE Bund (Bild rechts, feste Kartenhöhe) belassen |
| O6 | Dialoge auf kleinen Höhen | Bestell- und Spalten-Dialog mit `max-height` und scrollendem Body prüfen | in dieser Runde nicht gemessen |
| O7 | Touch-Gesten im DWG-Viewer | `touch-action: none` und Pointer-Events sind vorhanden; Pinch-Zoom und Zwei-Finger-Pan auf einem echten Gerät prüfen | nur emuliert getestet |

## 4. Umsetzung

- `css/responsive.css` (neu, zuletzt geladen): Touch-Ziele unter `(pointer: coarse)`, 16-px-Felder auf Phones.
- `css/shell.css`: Suche als Icon, Kurz-Banner, Footer mit Umbruch, Tabs bis 1279 px scrollend, Breadcrumb-Breiten,
  `body.side-open`, `100dvh`, Safe-Area.
- `css/components.css`: `.scroll-x` mit Ausblendkante (`@property`, Scroll-Timeline), `.search-wrap`,
  `.meta-row` / `.meta-row-wide`.
- `css/app.css`, `css/form.css`, `css/plan.css`, `css/base.css`: eine Spalte unter 1280 px, `card-hint` umbricht,
  `.plan-tabbar`, `prefers-reduced-motion`.
- `js/shell.js` (Banner), `js/ui.js` (`searchBox`), `js/views/{overview,documents,section,s01,s06,projects,plan}.js`
  (Scrollcontainer, Tab-Leiste), `js/views/parts/map.js` (`ResizeObserver`), `js/app.js` / `js/actions.js` (Escape).
- `index.html`: `viewport-fit=cover`, `css/responsive.css`.
- `tests/e2e.mjs`: 14 Prüfungen bei 375 px (Überlauf auf neun Seiten, Filter und Suche im Sichtbereich, Banner/Footer/Suche,
  Sidebar off-canvas, öffnen mit Scroll-Sperre, Escape, Projektaufgaben scrollen, Karte füllt die Box, Karte folgt der Box
  ohne Fenster-Resize); `tests/responsive-audit.mjs` für Screenshots und Messwerte auf drei Breiten.

## 5. Nachtrag (Rückmeldung nach dem Review)

- **Kleine Notebooks (1024–1279 px)**: das Projektbild in voller Breite wirkte fremd. Unter 1280 px stehen Projektbild und
  Projektdaten jetzt nebeneinander (Verknüpfungen darunter in voller Breite); eine Spalte gibt es nur noch unter 640 px.
- **Standortkarte**: 340 px statt 260 px hoch (280 px auf Phones).
- **Sehr breite Bildschirme**: der Seiteninhalt hatte keine einheitliche Grenze (einzelne Karten 720–1100 px, Tabellen und die
  Suche in der Topbar ohne Limit). Neu gilt eine Inhaltsbreite von 1480 px (`--content-max`, `.app-main`, neben der Sidebar
  zentriert), 900 px für Lese- und Formularkarten (`--narrow-max`, `.card-narrow`: Lieferung, Verlauf, Dokumente der
  Lieferung, Stammdaten, Zeitplan, Einstellungen) und 760 px für die Suche in der Topbar; die Inline-Breiten der Karten sind
  entfernt. Browser-Tests bei 1100 und 2000 px.

## 6. Grenzen des Reviews

Gemessen wurde mit emulierten Breiten und Touch in Headless Edge; echte Geräte (iOS Safari, Android Chrome) wurden
nicht getestet, insbesondere nicht das Verhalten der Adressleiste, die Eingabe-Zoomstufe und die Gesten im Viewer.
Die Ausblendkante der Scrollcontainer braucht Scroll-Timelines (Chromium 115+, Safari 26, Firefox mit Flag); ohne
sie bleibt der dünne Scrollbalken.
