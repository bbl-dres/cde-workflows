# Design-Review und Gap-Analyse: Prototyp vs. CDE Bund (cde-r.bbl.admin.ch)

Stand: 3. November 2026 · Autor: Design/UX-Review im Rahmen des Prototyps «Datenlieferungen KV und THG»
Status der Empfehlungen: **umgesetzt** = im Prototyp eingebaut · **offen** = Entscheid Produktteam / BBL

## 1. Ziel und Vorgehen

Ziel: Der Prototyp soll sich wie die produktive CDE Bund anfühlen, damit die neuen Datenformulare (Studie) im echten
Kontext beurteilt werden können. Verglichen wurde der Prototyp mit dem Referenzsystem **cde-r.bbl.admin.ch**.

Quellen

| Quelle | Was daraus gewonnen wurde |
|---|---|
| Screenshots des Referenzsystems (Startseite, Projekte Liste/Karten, Aufgaben, Überblick, Benachrichtigungen, Informationslieferplan mit «Erstellen»-Drawer) | Layout, Abstände, Farben (Pixelmessung), Beschriftungen, Verhalten |
| Öffentliche Assets des Referenzsystems: `theme-*.css` (Ant Design/NG-ZORRO, 680 KB), `tailwind-*.css`, `app-*.css`, `styles-*.css`, 362 JS-Chunks mit Komponentenstilen | Design-Tokens, Komponentenmasse, Hover/Fokus-Zustände, Icon-Set |
| `assets/i18n/de.json` (4 034 Texte) | Exakte Begriffe und Statuswerte der CDE Bund |
| Design-Studie `docs/wireframes/…Design-Studie.html` | Zielbild der neuen Screens |

Nicht möglich war das automatisierte Abgreifen eingeloggter Seiten (keine Browser-Session im Werkzeug). Die Analyse
stützt sich daher auf die gelieferten Screenshots und die öffentlich erreichbaren Stylesheets, Skripte und Übersetzungen.
Diese sind für ein Design-Review sogar wertvoller als Screenshots, weil sie die tatsächlichen Werte enthalten.

## 2. Was die CDE Bund technisch ist

- **Angular** mit **NG-ZORRO (Ant Design)** in der kompakten Grösse (Basis 12 px, Zeilenhöhe 1.667, Bedienelemente 28 px)
  plus **Tailwind** für Layout und Farbüberschreibungen. Komponentenklassen: `ant-btn`, `ant-table`, `ant-tag`,
  `ant-drawer`, `ant-pagination`, `ant-menu`, `ant-tabs`, `ant-card`.
- **Icons: Tabler Icons** (`tb-icon`), nicht Lucide. Beide Sets sind Linienicons mit 2 px Strich und praktisch
  deckungsgleich; der Prototyp verwendet Lucide.
- **Schrift**: Systemstapel `-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, …, Noto Sans`. Auf Windows rendert
  die CDE Bund also in **Segoe UI**. Die Studie hat Noto Sans gewählt. Der Prototyp behält Noto Sans (plattformunabhängig,
  Studie) und stellt den Systemstapel dahinter.
- **Übersetzungen** liegen als JSON vor; Begriffe des Prototyps wurden damit abgeglichen (Abschnitt 5).

## 3. Design-Tokens: Soll (CDE Bund) vs. Ist (Prototyp vor dem Review)

Gemessen oder aus den Stylesheets gelesen. «Neu» = jetzt im Prototyp.

| Token | CDE Bund | Prototyp vorher | Neu | Status |
|---|---|---|---|---|
| Topbar | `#344255`, 48 px | `#313d4e`, 48 px | `#344255` | umgesetzt |
| Seitenhintergrund | `#f1f5f9` (`.app-layout`) | `#f0f3f7` | `#f1f5f9` | umgesetzt |
| Primärfarbe (Buttons, Tabs, aktive Elemente) | `#10384f`, Hover `#0b2538` | `#1f2d3f` / `#313d4e` | `#10384f` | umgesetzt |
| Linkfarbe | `#2ba89f`, Hover `#4cb5ab` | `#3f8f8b` (Studie: dunkler für Kontrast) | `#2ba89f` | umgesetzt, Kontrast siehe 7 |
| Fliesstext | `rgba(0,0,0,.85)` = `#262626` | `#1f2937` | `#262626` | umgesetzt |
| Sekundärtext | `rgba(0,0,0,.45)` = `#8c8c8c`, Tailwind `#6b7280` | `#5b6573` | `#6b7280` / `#8c8c8c` | umgesetzt |
| Breadcrumb | `#818181`, 12 px | `#5b6573`, 12.5 px | `#818181`, 12 px | umgesetzt |
| Rahmen | `#d9d9d9` (Felder), `#d1d5db` (Buttons), `#f0f0f0` (Trennlinien) | `#c9cfd6`, `#d3d8de`, `#eef0f3` | übernommen | umgesetzt |
| Badge (Aufgaben) | `#e94d65` (Topbar), `#ff3162` (Ant) | `#e1001a` | `#e94d65` / `#ff3162` | umgesetzt |
| Gefahr (Löschen) | `#ff3162`, Hover `#ff597a` | `#c8102e` | `#ff3162` | umgesetzt |
| Erfolg | `#2ba89f` (brand) / `#52c41a` | `#2f7d63` | brand | teilweise (Status-Tags siehe unten) |
| Radius Karten | 6 px (`.card`, Tailwind `.375rem`) | 3 px | 6 px | umgesetzt |
| Radius Buttons/Felder | 4 px | 2–3 px | 4 px | umgesetzt |
| Schatten Karten | `0 4px 6px -1px rgb(226 232 240), 0 2px 4px -2px rgb(226 232 240)` | `0 1px 3px rgba(0,0,0,.1)` | übernommen | umgesetzt |
| Tabellenkopf | `#e5e7eb` (`.vux-table th`), Ant `#fafafa` | `#e9ecf0` | `#e5e7eb` | umgesetzt |
| Zeilen-Hover | `#fafafa` | keiner | `#fafafa` | umgesetzt |
| Zebra | `#f3f4f6` (`.table-striped`) | `#f9fafb` / `#f6f7f9` | `#f3f4f6` | umgesetzt |
| Sidebar aktiv | `#d1d5db`, Text `#111827` (`.active-link`) | `#d6dade` | `#d1d5db` | umgesetzt |
| Avatar | 28 px, `#ccc` | 26 px, `#aab2bc` | 28 px, `#ccc` | umgesetzt |

## 4. Komponenten: Gap-Analyse

### 4.1 Buttons (`ant-btn`)
- Soll: Höhe 28 px, Schrift 12 px / 600, Radius 4 px, Padding 0 12 px; Default weiss mit Rahmen `#d1d5db` und Text
  `#10384f`, Hover `#0b2538`; Primär `#10384f`; Klein 22 px, Gross 34 px / 14 px; Gestrichelt (`+ Eintrag hinzufügen`)
  Rahmen und Text `#10384f`; Gefahr `#ff3162`.
- Ist: 13 px / 600, Höhe variabel, Primär `#1f2d3f`.
- **Umgesetzt**: Masse und Farben übernommen. Deaktivierte Primärbuttons sind in der CDE Bund `#e5e7eb` mit weisser
  Schrift. Das ist der von der Studie zu Recht kritisierte, schlecht lesbare Zustand. Der Prototyp übernimmt den
  Original-Zustand (Treue zum Referenzsystem); Empfehlung an das Design System bleibt offen (Abschnitt 7).

### 4.2 Eingabefelder, Auswahl, Datum
- Soll: 28 px, Padding 3 px 7 px, 12 px, Rahmen `#d9d9d9`, Radius 4 px, Hover `#21485c`, Fokusring
  `0 0 0 2px rgba(16,56,79,.2)`. Pflichtfelder mit rotem Stern vor dem Label (Ant), in der CDE Bund hinter dem Label.
- Ist: 30 px, Radius 2 px, keine Fokusringe.
- **Umgesetzt**: Masse, Radius, Hover, Fokusring. Stern bleibt hinter dem Label (so im Screenshot).

### 4.3 Tabellen (`ant-table`, `vux-table`)
- Soll: Kopfzeile `#e5e7eb` (CDE-eigene `vux-table`), 12 px / 500, Sortierpfeile `#bfbfbf`, aktiv `#10384f`;
  Zeilen 34 px (kompakt), Hover `#fafafa`; Spaltengriffe zum Ziehen; Aktionen am Zeilenende (öffnen, bearbeiten, löschen rot).
- Ist: Kopf `#e9ecf0`, Zeilen ohne Hover, keine Griffe.
- **Umgesetzt**: Kopffarbe, Hover, Sortierpfeile. **Offen**: Spalten ziehen und ausblenden («Tabelle konfigurieren»).

### 4.4 Status-Tags (`ant-tag`)
- Soll: Höhe 20 px (Zeilenhöhe 18 px + Rahmen), Padding 0 7 px, Radius 10 px, 12 px. Farbpalette Ant:
  Lila (`#f9f0ff` / `#d3adf7` / `#531dab`) für «Offen», Gold für «In Prüfung», Grün für «Abgeschlossen», Rot für «Überfällig».
- Ist: eigene, leicht abweichende Palette der Studie, Icon im Tag.
- **Umgesetzt**: Ant-Palette für Offen, Eingereicht/In Prüfung, Freigegeben/Abgeschlossen, Überfällig/Zurückgewiesen,
  Nicht bestellt. «In Bearbeitung» behält das Graublau der Lieferplan-Kachel (kein Ant-Pendant). Icon im Tag bleibt,
  weil die CDE Bund in Aufgaben-Tags ebenfalls ein Icon zeigt (Screenshot «Offen»).

### 4.5 Seitenleiste (Projektmenü)
- Soll: 236 px, Projektname 16 px / 500 mit Untertitel «Projekt» 12 px; Einträge 40 px, Icon 20 px, Radius 4 px;
  aktiv `#d1d5db` fett; Gruppen (Info-Management, Stammdaten) mit Chevron, aufklappbar.
- Ist: entspricht weitgehend (aus der Studie). **Umgesetzt**: aktive Farbe, Hover `#f3f4f6`.
- Die Listen-Sidebars «Projekte / Übersicht» und «Aufgaben / Übersicht» (Projekte, Favoriten; Alle meine Aufgaben,
  Mir zugewiesen, Alle Aufgaben) wurden bereits nach Screenshot gebaut und stimmen inkl. Beschriftung
  (`tasks.page.all_tasks`, `tasks.page.my_tasks`, `tasks.page.all_projects_tasks`).

### 4.6 Topbar
- Soll: `#344255`, 48 px; Logo; «Projekte» und «Aufgaben» (aktiver Bereich fett), Badge `#e94d65`; Suchfeld weiss
  28 px mit Lupe-Button; rechts Glocke, Handbuch, Einstellungen; Avatar 28 px `#ccc` mit Name.
  Platzhalter: «Suchen nach Projekten und Bestandsdaten...» (`header.search_input`, drei Punkte, keine Ellipse).
- **Umgesetzt**: Farbe, Badge, Avatar, Platzhalter mit drei Punkten.

### 4.7 Breadcrumb und Seitenkopf
- Soll: rechtsbündig, 12 px, `#818181`, Haus-Icon, aktuelles Element dunkel; Titel links 20–21 px / 500,
  Favoritenstern neben dem Titel (Überblick).
- **Umgesetzt**: Farbe und Grösse.

### 4.8 Tabs (`ant-tabs`)
- Soll: Text 16 px / 500 (`.ant-tabs-tab-btn`), aktiv `#10384f` mit Ink-Bar 2 px `#10384f`, Abstand 32 px.
- **Umgesetzt**: Farben; Abstand und Grösse waren bereits korrekt.

### 4.9 Drawer (Benachrichtigungen, «Erstellen»)
- Soll: Benachrichtigungen 485 px, Kopf nur mit Schliessen-Kreuz, Werkzeugzeile «Nur ungelesene» + Icongruppe
  (Archiv, alle gelesen), Liste mit Titel 14 px / 600, Datum «dd.mm.yy · Auszug», Button «Anzeigen», Haken;
  Fuss mit Primärbutton **«Schließen»** (die CDE Bund schreibt ß). «Erstellen»-Drawer ca. 712 px, Kopf «× Erstellen»,
  Fuss «Abbrechen», «Als Entwurf speichern» (deaktiviert bis Pflichtfelder gefüllt).
- Ist: entsprach dem Screenshot; Schreibweise «Schliessen».
- **Umgesetzt**: Fussbutton «Schließen» wie im Original, Paddings nach Ant (`11px 16px` Kopf, `16px` Body, `8px` Fuss).
  Siehe 7 zur Rechtschreibung.

### 4.10 Startseite
- Soll: «Hallo {Vorname}» 21 px; «Du hast aktuell {n} offene Aufgaben.» + «Mehr anzeigen»; Kennzahlkarte rechts
  (Offen / On Track / Verspätet); «Meine Projekte» + «Alle anzeigen», Karten 288 × 126 px mit «Letzte Änderungen am …»;
  Box «Einblicke» mit 1 px Rahmen `#344255`, 2 × 2 Raster mit 1 px Trennlinien `#344255`, rechts Karte.
- Ist: Struktur korrekt; Rahmen 1 px `#313d4e`, Trennlinien 1.5 px.
- **Umgesetzt**: Rahmen und Linien `#344255`, 1 px. Karte: MapLibre GL mit swisstopo-Vektorkarte (Original: Mapbox).

### 4.11 Projekte (Liste, Karten)
- Soll: oben rechts Suche + Umschalter Liste/Karten; Filterzeile «Favoriten, Zugriff, Zugriff verlängern, Archiviert,
  Alle Filter»; Spalten Name, Projektnummer, Technischer Platz, Projektbezeichnung, Teilportfolio, Verantwortlicher,
  Zugriff, Erstellt am, Aktualisiert am, Stern. Karten 410 px mit Fuss (Zugriff, Stern).
- **Umgesetzt** (war bereits nach Screenshot gebaut). Tokens angepasst.

### 4.12 Aufgaben (projektübergreifend)
- Soll: Filterzeile Typ, Status, Fälligkeit ab/bis, Projekt…, Suche, Icons; Tabelle mit Auswahl, Name, Beschreibung,
  Status, Typ, Zugewiesen an (gepunktet unterstrichen), Aufgabe für, Kategorien, Geplanter Start, Geplantes Ende,
  Aktualisiert, Aktionen. Die CDE Bund zeigt keine Projektspalte; der Prototyp zeigt sie, weil die
  Studie projektübergreifende Kontrolle (Screen 06) braucht. Bewusste Abweichung.

### 4.13 Informationslieferplan und «Erstellen»
- Soll (Übersetzungen `delivery_plan.*`): Kacheln Gesamt / In Bearbeitung / In Prüfung / Abgeschlossen / Überfällig;
  Spalten Kürzel, Name, Lieferverantwortlicher, Gewerk, Beschreibung, Status; Button «Aufgabenplan hinzufügen»;
  Drawer-Felder Kürzel, Name, Fachmodellliste, Lieferverantwortlicher, Beschreibung, «Liefer- resp. Startdatum»,
  Turnus (Nie, Täglich, Wöchentlich, Monatlich), «Geforderte Dokumente» mit «Vorlage herunterladen» und
  «Dokumentenliste importieren», Block «Neue Anforderung» (Dateiname, Ablageort, Info, Prüfende), «Eintrag hinzufügen»,
  Workflow, «Als Entwurf speichern».
- Bemerkenswert: Die CDE Bund kennt bereits **Anforderungsvorgaben** (`delivery_plan.task_requirement_template`,
  «Anforderungsvorgabe hinzufügen»). Die Datenformular-Vorlagen der Studie sollten als Anforderungsvorgabe vom Typ
  «Datenformular» angeboten werden statt als neuer Dialog. Der Prototyp setzt das als Typ-Auswahl je Anforderung um
  (Dokument / Datenformular + Vorlage); Beschriftung des Typs **offen** («Anforderungsvorgabe» vs. «Datenformular»).
- Statuswerte der Lieferaufgaben in der CDE Bund: Ausstehend, Offen, In Bearbeitung, In Prüfung, Geliefert,
  Fehlerhaft geliefert; Aufgabenplan: Entwurf, Ausstehend, In Prüfung, Abgeschlossen, Überfällig. Die Studie
  ergänzt Eingereicht, Freigegeben, Zurückgewiesen, Übertragen. **Offen**: Mapping der Studienstatus auf das
  Statusmodell der CDE Bund (z. B. Freigegeben = Geliefert, Zurückgewiesen = Fehlerhaft geliefert).

### 4.14 Benachrichtigungen (Texte)
- Soll (Übersetzungen `header.notifications.*`): «Neue Dateien für {Projekt} wurden hochgeladen»,
  «{Name} wurde einer Aufgabe zugewiesen.», «Erinnerung: {Aufgabe}», «Aufgabe überfällig: {Aufgabe}»,
  «Aufgabe abgeschlossen: {Aufgabe}», «Die Aufgabe {Aufgabe} wurde erstellt.»
- **Umgesetzt**: Mock-Texte auf diese Muster gebracht.

### 4.15 Benutzermenü
- Soll (`header.*`): Mein Account, Meine Einstellungen, Benachrichtigungseinstellungen, Benutzerhandbuch, Support,
  Release Notes, Impressum, Logout.
- **Umgesetzt**: Einträge ergänzt (ohne Funktion), der Rollenwechsel des Prototyps bleibt darüber.

## 5. Begriffe: Abgleich mit `de.json`

| Prototyp | CDE Bund | Entscheid |
|---|---|---|
| Informationslieferplan, Aufgabenplan hinzufügen, Kürzel, Gewerk, Lieferverantwortlicher | identisch | – |
| Alle meine Aufgaben / Mir zugewiesen / Alle Aufgaben | identisch | – |
| Überblick, Projektaufgaben, Projektdaten, Verknüpfungen, Favoriten | identisch | – |
| Hallo, On Track, Verspätet, Letzte Änderungen am, Einblicke, Data Drops, Kommunikation, Mehr anzeigen, Alle anzeigen | identisch | – |
| Keine Daten / Keine Einträge | identisch (`table.no_data`, `table.no_entries`) | – |
| Schliessen | **Schließen** (`common.close`) | Shell: Original (ß). Studie: ss (Swiss). Vereinheitlichung offen |
| Suchen nach Projekten und Bestandsdaten… | «…Bestandsdaten...» (drei Punkte) | umgesetzt |
| Datenformular (Typ) | kein Pendant; nächstes: Anforderungsvorgabe | offen |
| Eingereicht, Freigegeben, Zurückgewiesen, Übertragen | kein Pendant (siehe 4.13) | offen |

## 6. Interaktion und UX

| Thema | CDE Bund | Prototyp | Status |
|---|---|---|---|
| Hover auf Tabellenzeilen | `#fafafa` | fehlte | umgesetzt |
| Fokus-Sichtbarkeit | Ant-Fokusring 2 px, 20 % Primärfarbe | Outline navy | umgesetzt (Ant-Ring) |
| Übergänge | 0.2–0.3 s auf Farbe/Rahmen | keine | umgesetzt (Buttons, Felder, Zeilen) |
| Sortieren, Spalten konfigurieren | vorhanden («Tabelle konfigurieren») | Icons statisch | offen (nicht Ziel der Studie) |
| Ladezustände | App-Spinner, Tabellen-Spinner | keine | offen |
| Tooltips | Ant-Tooltip dunkel | keine | offen |
| Benachrichtigung «Anzeigen» | springt zum Objekt, markiert gelesen | identisch | – |
| Escape schliesst Drawer/Dialoge | ja | ja | – |
| Tastatur in Tabellen/Formularen | Ant-Standard | Enter/Leertaste auf Custom-Controls | – |

## 7. Empfehlungen an das Design System der CDE Bund (nicht im Prototyp lösbar)

1. **Linkfarbe `#2ba89f` auf Weiss erreicht ca. 3.0:1** und verfehlt WCAG AA (4.5:1) für Fliesstext. Die Studie hatte
   deshalb `#3f8f8b` gewählt. Der Prototyp folgt jetzt dem Original; für das Design System ist `#1d736d` (brand-800,
   bereits in Tailwind definiert) eine AA-taugliche Option für Text-Links.
2. **Deaktivierte Primärbuttons** (`#e5e7eb` mit weisser Schrift) sind kaum lesbar. Empfehlung: Text `#9ca3af` auf `#e5e7eb`
   oder Ant-Standard (`rgba(0,0,0,.25)` auf `#f5f5f5`).
3. **Rechtschreibung**: Die CDE Bund mischt bundesdeutsches ß («Schließen») mit schweizerischer Schreibweise. Für ein
   Bundesamt wäre durchgängig ss (Schweizer Standard) zu empfehlen.
4. **Schrift**: Der Systemstapel ergibt je nach Betriebssystem ein anderes Schriftbild (Segoe UI, San Francisco, Roboto).
   Eine mitgelieferte Schrift (Noto Sans wie in der Studie oder Frutiger gemäss CD Bund) würde das vereinheitlichen.
5. **Statusmodell**: Eingereicht / Freigegeben / Zurückgewiesen / Übertragen der Studie auf die bestehenden
   Lieferaufgaben-Status abbilden oder das Modell erweitern. Entscheid mit dem Produktteam.
6. **Anforderungsvorgaben** als Träger der Datenformular-Vorlagen nutzen (zentral gepflegt, versioniert), statt eines
   separaten Vorlagenkatalogs. Deckt sich mit Screen 09 der Studie.

## 8. Umgesetzte Änderungen im Prototyp (dieses Review)

- `css/tokens.css`: Farben, Radien, Schatten gemäss Abschnitt 3; Schriftstapel mit Systemschriften als Fallback.
- `css/base.css`: Basis 12 px / 1.667 wie Ant kompakt; Fokusring.
- `css/components.css`: Buttons, Felder, Tags, Tabellenkopf, Zeilen-Hover, Pagination, Checkbox/Radio/Switch,
  Karten, Dialoge und Drawer nach Ant-Massen.
- `css/shell.css`, `css/app.css`: Topbar, Sidebar, Breadcrumb, Tabs, Einblicke-Box, Benutzermenü.
- `js/model/pill.js`: Ant-Farbpalette für Status-Tags.
- `js/shell.js`: Benutzermenü-Einträge der CDE Bund, «Schließen», Avatar 28 px, Suchplatzhalter.
- `data/notifications.json`: Texte nach den Mustern der CDE Bund.
- Screens der Studie (01–09, B1, B2) erben die Tokens; ihre Layouts bleiben wie entworfen.

## 9. Offene Punkte (priorisiert)

| Prio | Punkt | Empfehlung |
|---|---|---|
| 1 | Statusmodell Lieferaufgaben vs. Studie | Workshop mit Produktteam, Mapping festlegen (4.13) |
| 1 | Typ-Bezeichnung «Datenformular» vs. «Anforderungsvorgabe» | Begriff mit BIM-Management BBL entscheiden |
| 2 | Linkkontrast, deaktivierte Buttons | Design-System-Ticket (7.1, 7.2) |
| 2 | Icon-Set Tabler statt Lucide | Bei Übernahme in die CDE Bund entfällt das Thema (Tabler ist dort Standard) |
| 3 | Spalten konfigurieren, Lade- und Tooltip-Zustände | Nicht Gegenstand der Studie |
| 3 | Schriftbild (Systemstapel vs. Noto Sans) | Entscheid Design System (7.4) |
