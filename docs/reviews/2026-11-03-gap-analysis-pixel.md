# Gap-Analyse II: Pixelgenauer Abgleich mit der CDE Bund

Stand: 3. November 2026 · Fortsetzung von `2026-11-03-design-review-cde-r.md` (Tokens, Komponenten, Begriffe)
Status: **umgesetzt** = im Prototyp · **offen** = Entscheid oder fehlende Referenz

## 1. Ziel und Vorgehen

Der Prototyp soll die produktive CDE Bund (cde-r.bbl.admin.ch) pixelgenau nachbilden: Masse, Abstände, Schriften,
Hover-Zustände und das responsive Verhalten. Grundlage sind erstmals Referenz-Screenshots in bekannter Fenstergrösse
(1x, Windows, Brave) sowie die öffentlichen Stylesheets und Templates der CDE Bund.

Vorgehen

1. **Referenz ablegen.** Screenshots unter `docs/reference/cde-r/` (per `.gitignore` ausgeschlossen, siehe
   `docs/reference/README.md`): Startseite 1528 px, Aufgaben 1537 px, Informationslieferplan 1534 px; weitere Seiten
   (Dokumente, LOIN, Aktivitäten/Logs, Einstellungen, Mitglieder, Erstellen-Drawer) lagen nur als Bild im Chat vor.
2. **Gleiche Fenstergrösse.** `node tests/refshots.mjs` rendert den Prototyp in denselben Grössen und legt
   Vergleichsbilder (Referenz | Prototyp) in `docs/reference/compare/` ab.
3. **Messen statt schätzen.** Ein Python-Skript (Pillow) tastet beide Bilder mit denselben Sonden ab: Farbläufe pro
   Zeile/Spalte (Topbar, Suchfeld, Seitenmenü, Kacheln, Karten), Zeilen mit Textpixeln (Glyphen-Oberkante/-Unterkante)
   und Bounding-Boxes (Logo, Avatar, Icons). Differenzen werden in CSS übertragen und erneut gemessen.
4. **Werte aus dem Code.** Tailwind-Build (`tailwind-*.css`), `app-*.css`, Ant-Theme (`theme-*.css`) und die
   Angular-Templates (Klassenlisten, i18n-Schlüssel) liefern Breakpoints, Hover-Farben, Schriftgrössen und Gewichte.

Wichtige Erkenntnis zur Schrift: Die CDE Bund rendert unter Windows in **Segoe UI** (Systemstapel), die Studie in
Noto Sans. Gleich grosse Schrift hat in Noto Sans rund 10 % höhere Glyphen; ein Vergleich der Glyphenhöhen täuscht
dann andere Schriftgrössen vor. Der Prototyp verwendet deshalb jetzt den Schriftstapel der CDE Bund
(`-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial, Noto Sans`), Noto Sans bleibt Fallback.

## 2. Messwerte Referenz vs. Prototyp (nach der Umsetzung)

Alle Angaben in CSS-Pixeln ab Oberkante Topbar (der rote Prototyp-Hinweis liegt darüber und wird für den Vergleich
abgeschnitten). Referenz = Screenshot der CDE Bund, Prototyp = `docs/reference/compare/ours-*.png`.

Korrektur während der Analyse: Der Startseiten-Screenshot ist oben um 3 px beschnitten (Topbar dort 47 px, Suchfeld
nicht zentriert). Die beiden anderen Referenzen zeigen die Topbar mit **50 px** und das 28-px-Suchfeld zentriert
(y 11–38). Der Prototyp verwendet 50 px; die Messwerte der Startseite sind um 3 px korrigiert.

### 2.1 Topbar (Startseite, 1528 px)

| Element | Referenz | Prototyp | Status |
|---|---|---|---|
| Höhe | 50 px (Farbfläche y 0–49), Inhalt zentriert | 50 px (vorher 48) | umgesetzt |
| Logo | x 21–46, y 10–38 (26 × 29) | x 20–44, y 11–38 | ±1 px |
| «Projekte» (aktiv) | x 83–127, Glyphen y 22–33, 14 px, Gewicht regulär/medium | x 83–131, y 22–34; Gewicht 500 statt 700, 2 px tiefer gesetzt | umgesetzt |
| Suchfeld | Innenfläche y 12–37 (28 px mit 1 px Rahmen), Ende x 1172, Knopf 28 px | y 12–37, Ende x 1170 | umgesetzt |
| Icons Glocke · Handbuch · Einstellungen | 20 px, Glocke ab x 1238, Abstand 64 | ab x 1232, Abstand 64 | umgesetzt |
| Avatar · Name | 28 px Kreis ab x 1416, Name 13 px / 600 bis x 1516, rechts 12 px | 28 px, 13 px / 600 (Name länger: Paula Muster) | umgesetzt |

### 2.2 Projektmenü (Informationslieferplan, 1534 px)

| Element | Referenz | Prototyp | Status |
|---|---|---|---|
| Breite | 240 px (Aufgaben/Projekte: 232 px) | 240 / 232 px (vorher 236) | umgesetzt |
| Projektname · «Projekt» | 18 px / 500, Zeile 28; 12 px grau; Glyphen y 65–76 / 88–95 | 18 px / 500 (max. 2 Zeilen), 12 px; y 67–83 | umgesetzt |
| Einträge | 40 px Raster, Text y 145–156 / 187–196 / 227–236; Icon 20 px bei x 16, Text bei x 52; 14 px / 500 | y 145–155 / 185–195 / 226–235; Icon x 16, Text x 52 | umgesetzt |
| Untereinträge | Icon x 38, Text x 72, Hervorhebung x 26–226 | Icon x 38, Text x 70 | umgesetzt |
| Aktiv / Hover | `#d1d5db` fett / `hover:bg-gray-200` `#e5e7eb`, Text `#0b2538` | gleich | umgesetzt |
| Listen-Sidebars (Aufgaben) | Titel 18 px, Icon bei x 12, Hervorhebung ab x 1 | Titel 18 px, Icon x 12 | umgesetzt |

### 2.3 Seitenkopf, Kacheln, Tabelle (Informationslieferplan)

| Element | Referenz | Prototyp | Status |
|---|---|---|---|
| Inhaltsabstand | 8 px (Titel ab x 248) | 8 px (vorher 10/12) | umgesetzt |
| Titel | 20 px / 500, Glyphen y 61–80; Breadcrumb 12 px rechts, y 64–76 | y 62–81; Breadcrumb y 64–76 | umgesetzt |
| Kacheln | 5 Spalten ab x 252, Abstand 12, y 119–237 (118 px + Rand), Innenabstand 18/24, Titel 16 px y 145–156, Zahl 30 px / 700 y 189–209; aktiv 2 px Rahmen `#551d92` | ab x 251, y 118–237, Titel y 145–155, Zahl y 189–209 | umgesetzt |
| Kachel-Hover | `hover:shadow-md hover:shadow-gray-400 hover:-translate-y-0.5` | Schatten + 2 px Anhebung | umgesetzt |
| Suchfeld · Knopf | y 274–300 (28 px), Knopf navy 28 px rechts | y 274–300 | umgesetzt |
| Tabelle | Kopf `#fafafa` 36 px ab y 334, Zeilen weiss ab y 370, Beschreibung einzeilig | ab y 370; Zeilen 44 px fix, Zellen mit Ellipse | umgesetzt |

### 2.4 Startseite (1528 px)

| Element | Referenz | Prototyp | Status |
|---|---|---|---|
| Seitenabstand | links 16, rechts 12 | 16 / 12 | umgesetzt |
| «Hallo …» | 20 px / 500, y 75–88; Untertitel 12 px y 111–122 | y 75–89; y 110–121 | umgesetzt |
| Kennzahlen-Karte | 487 × 94 ab x 1030, y 67–160; Trennlinien eingerückt (nicht bis zum Rand) | 487 × 94, x 1029, y 66–159; Trennlinien mit 16 px Abstand | umgesetzt |
| «Meine Projekte» | 20 px / 500 y 189–206; «Alle anzeigen» 12 px teal | y 189–208; 12 px | umgesetzt |
| Projektkarten | `sm:grid-cols-3 md:grid-cols-5 gap-4` → 287 px breit, 125 px hoch, Titel 14 px / 600, Innenabstand 24 | Raster 5 Spalten, 287 px; Karten mit Beschreibung sind höher | umgesetzt (Beschreibung = Daten) |
| Einblicke | 1002 × 400 zentriert (x 265–1266), Rahmen 1 px `#2f4356`, **kein weisser Hintergrund**, Titel 20 px (29 px unter Oberkante), Raster 2 × 2 mit Linien `#2f4356`, Zahlen 30 px / 700, Karte 488 px | gleich (x 265, Titel 29 px, Hintergrund transparent); Box 18 px tiefer, weil die Projektkarten mit Beschreibung höher sind | umgesetzt |
| Karte | Mapbox-Streets in der CDE Bund | swisstopo-Vektorkarte (MapLibre, ohne Schlüssel) | offen (bewusst) |

### 2.5 Aufgaben (1537 px)

| Element | Referenz | Prototyp | Status |
|---|---|---|---|
| Hintergrund | Seite `#f2f5f9`, Inhalt als weisse Fläche mit 8 px Rand | weisse `.page-card`, 8 px | umgesetzt |
| Filterzeile | y 63–91 (28 px Elemente), Icons rechts ohne Rahmen | y 64–91 | umgesetzt |
| Tabelle | Kopf `#fafafa` ab y 97, Zeilen 34 px, Zeilentext y 145–151, Checkbox 14 px bei x 266 | Kopf y 98, Zeilentext y 143–156, Checkbox x 264 | umgesetzt |
| Seitenmenü-Icons | 18–20 px bei x 12 | x 15 | ±3 px |
| Zeilenaktionen | fixe Spalte rechts, durchgehender Schatten (`ant-table-cell-fix-right`) | `position: sticky` + `::after` mit `inset -10px 0 8px -8px` | umgesetzt |

## 3. Schriften (aus Tailwind-Klassen und Messung)

| Element | CDE Bund | Prototyp |
|---|---|---|
| Grundschrift | 12 px (Ant compact), Systemstapel | 12 px, Systemstapel (neu) |
| Topbar-Links | `text-sm` 14 px, aktiv semibold | 14 px, aktiv 600 |
| Seitentitel | `text-xl` 20 px / 500 | 20 px / 500 |
| Abschnittstitel (Meine Projekte, Einblicke) | `text-xl` 20 px / 500 | 20 px / 500 |
| Sidebar-Titel | `text-lg` 18 px / 500 | 18 px / 500 |
| Menüeinträge | `text-sm` 14 px / 500, aktiv 600 | gleich |
| Kacheln | `text-base` 16 px Titel, `text-3xl` 30 px / 700 Zahl | gleich |
| Tabellen | 12 px, Kopf 500 | gleich |
| Knöpfe, Chips | 12 px / 600, 28 px | gleich |
| Breadcrumb, Hinweise | `text-xs` 12 px | gleich |

## 4. Hover- und Fokus-Zustände (Ant-Theme und `app-*.css` der CDE Bund)

| Element | CDE Bund | Prototyp |
|---|---|---|
| Knopf default | Rand und Text `#0b2538` (`blue-dark`) | gleich |
| Knopf primary | Hintergrund `#0b2538` | gleich |
| Knopf dangerous | `#cc1044` (`status-danger-dark`) | gleich (vorher `#ff597a`) |
| Link | `#4cb5ab`, keine Unterstreichung; Tabellen-Links unterstrichen (`.table-column-link:hover`) | gleich (vorher immer unterstrichen) |
| Tabellenzeile | `#fafafa`, Übergang .3 s; sortierbarer Kopf `rgba(0,0,0,.04)` | gleich |
| Eingabefelder, Selects | Rand `#21485c`; Fokus `0 0 0 2px rgba(16,56,79,.2)` | gleich, neu auch Suchfelder und Filterfelder |
| Paginierung | Rand `#10384f` | gleich |
| Tabs | Text `#21485c` | gleich |
| Breadcrumb | Text `rgba(0,0,0,.85)` | gleich |
| Menüeintrag | `hover:bg-gray-200`, `hover:text-blue-dark` | gleich |
| Kachel | Schatten `shadow-md shadow-gray-400`, `-translate-y-0.5` | gleich |
| Projektkarte | `hover:border-blue-dark` | gleich |
| Übergänge | Ant `all .3s cubic-bezier(.645,.045,.355,1)`; Tailwind `transition` 150 ms | 150–300 ms |

## 5. Responsives Verhalten

Breakpoints der CDE Bund (Tailwind-Build): `sm` 640, `md` 768, `lg` 1024, `xl` 1280, `2xl` 1536 px. Verwendete
responsive Klassen: Raster (`sm:grid-cols-1…6`, `md:grid-cols-3/4/5`, `lg:grid-cols-3`, `2xl:grid-cols-12`), Spalten
(`col-span-*`), `lg:flex`, `xl:flex-row`, `lg:px-8`, `lg:w-[500px]`, `md:block`. Der Seitenmenü-Container ist
NG-ZORROs `nz-sider` mit `nzBreakpoint`/`nzCollapsedWidth`; der konkrete Wert ist im Bundle nur als Binding sichtbar
(nicht verifiziert), üblich ist `lg` mit eingeklapptem Menü (Breite 0) und Auslöser in der Kopfzeile.

Umgesetzt im Prototyp

- `< 1024 px`: Projekt- und Listen-Sidebar off-canvas (fixiert, `translateX(-100%)`), Menü-Knopf links in der Topbar,
  Hintergrund-Abdunklung, schliesst nach Navigation; Breadcrumb unter den Titel; Kacheln 3 Spalten; Startseite
  einspaltig (Kennzahlen unter der Begrüssung, Karte unter den Einblicken); Überblick und Zwei-Spalten-Seiten
  (Dokumente, LOIN) einspaltig; Einstellungen einspaltig.
- `< 768 px`: Karten 2 Spalten, Kacheln 2 Spalten, Suchfeld nur Icon, Toolbars umbrechend.
- `< 640 px`: Karten 1 Spalte, Benutzername ausgeblendet, Hinweis-Banner zweizeilig.
- Tabellen scrollen horizontal (Mindestbreiten), Zeilenaktionen bleiben rechts fixiert.
- E2E: «sidebar off-canvas at 900px», «sidebar opens/closes», «tiles 3 columns», «dashboard single column at 600px».

## 6. Weitere Abgleiche aus Screenshots (Chat)

| Seite | Umsetzung |
|---|---|
| Zeilenaktionen | immer sichtbar, fixe Spalte rechts, durchgehender Schatten |
| Dokumente (`/documents`) | Toolbar «Dokument importieren» + Suche; zwei Karten: Baum (Dokumente › Auftraggeber-Informationsanforderung, Sonstige) mit «Neues Dokument», Tabelle Name/Version/Status/Verantwortlich/Aktualisiert v…/Aktualisiert am mit Aktionen und Paginierung «1-n von n · 20 / Seite» |
| LOIN (`/loin`) | Titel «Level of Information Need», Tabs Alle Informationsschlüssel / Elemente / Parameter Sets / Parameter, Split-Button «Neuer Informationsschlüssel ···», Chips Valide/Invalide/Global, Karten Gruppierungen + Tabelle mit Sortier-Icons; leer für Projekte ohne Daten |
| Aktivitäten (`/timeline`, `/timeline/logs`) | Tabs Aktivitäten/Logs, Logs: Filterzeile (Aktion, Entitätstyp, Zeitraum, Benutzer, Suche, Icons), gestreifte Tabelle mit Entitäts-/Projekt-IDs, Paginierung «1-10 von n» |
| Einstellungen | Tabs Allgemein / Dateien / Kategorien / Verknüpfungen / Informationsanforderungen / Gefahrenzone; Allgemein = Projektdaten-Formular (Name, Beschreibung mit Zähler, Projektstatus, Details, Teilprojekt von, Geo Koordinaten, Projektbild); andere Tabs Platzhalter |
| Mitglieder | Split-Button «Mitglied hinzufügen», Suche, gestreifte Tabelle Name (gepunktet unterstrichen) / Rolle «···» / Löschen-Icon |
| Erstellen-Drawer | kein «Als Entwurf speichern» |
| KV-32 Erfassung | Hinweise «importiert am …» und «Nach dem Einreichen …» entfernt |
| Informationslieferplan | Beschreibung einzeilig mit Ellipse, feste Zeilenhöhe |
| Pfade | `delivery-plan`, `documents`, `loin`, `timeline` direkt unter `/projects/{id}/` wie in der CDE Bund; alte Pfade werden umgeleitet |
| Prototyp-Hinweis | roter Balken «Prototyp, fiktive oder öffentlich verfügbare Inhalte — nur zur Demonstration» über der Topbar; Fusszeile mit Quellcode-Link; kein schwebender «Studie»-Knopf mehr |

## 7. Abschlusskontrolle

Nach allen Korrekturen (`node tests/refshots.mjs`, Messskript): Topbar, Suchfeld, Seitenkopf, Breadcrumb, Kacheln
(Position, Höhe, Titel- und Zahlzeile), Suchzeile, Tabellenoberkante (y 370), Kennzahlen-Karte, Abschnittstitel,
Kartenraster und Einblicke-Box liegen innerhalb von 1–2 px der Referenz; Topbar-Icons und Avatar innerhalb von
6–10 px (abhängig von der Länge des Benutzernamens), Seitenmenü-Icons der Listen-Sidebar 3 px. Hover-Zustände und
Breakpoints sind durch E2E-Checks abgesichert (146 Checks inkl. Planlieferungen DWG, 0 Fehler).

## 8. Offene Punkte

1. Referenz-Screenshots für Dokumente, LOIN, Aktivitäten, Einstellungen, Mitglieder, Projekte (Liste/Karten) und den
   Erstellen-Drawer bitte in `docs/reference/cde-r/` ablegen (Schema `seite-breite.png`); dann lassen sich diese
   Seiten mit `node tests/refshots.mjs` genauso messen (Routen in `SHOTS` ergänzen).
2. Der exakte `nzBreakpoint` des Seitenmenüs und das Verhalten der Topbar unter 640 px sind nicht belegt.
3. Kachelfarben wurden aus dem Screenshot gelesen (`#e9e3f6`/`#551d92`, `#dde5ec`, Gelb, Grün, Rot); die Tailwind-Namen
   (`status-*`) der CDE Bund weichen leicht ab. Bei Bedarf gegen `tailwind-*.css` abgleichen.
4. Projektkarten mit Beschreibung sind höher als in der Referenz (dort ohne Beschreibung).
5. Karte: Mapbox-Streets der CDE Bund vs. swisstopo im Prototyp (Entscheid Design/Lizenz).
