# Bedienung, Routen, Struktur und Tests

Prototyp der Datenlieferungen in der CDE Bund (`index.html`, Vanilla JS als ES-Module, CSS, statische JSON-Mock-Daten,
kein Build). Die Datenformulare folgen dem Design vom 04.11.2026
(`docs/wireframes/261104_CDE-Workflows Datenformular Design.html`), die Anwendung der Struktur und den URLs der CDE Bund.

## Starten

```bash
python -m http.server 8080      # oder: npm start · npx serve .
```

Dann `http://localhost:8080` öffnen (Chromium-Browser: Edge, Brave, Chrome). Die Mock-Daten werden per `fetch()` aus `data/*.json`
geladen; über `file://` funktioniert das nicht. Die Karte der Startseite lädt MapLibre GL JS (cdnjs) und die Vektorkacheln der
weltweite CARTO-Basiskarte «Positron» (Vektorkacheln, öffentlich, ohne Schlüssel; die Projekte liegen weltweit); fällt der Stil aus, werden Esri-Rasterkacheln «World Light Gray» geladen, ohne Netz erscheint eine Ortsliste
(Konfiguration in `data/projects.json` unter `map`).

## Bedienung

- **Angemeldete Person**: Klick auf den Namen oben rechts öffnet «Anmelden als» mit sieben Musterpersonen (Projektleitung BBL,
  Architekt, Kostenplaner, Ökobilanz, Generalplaner, BIM-Management, Fachstelle Nachhaltigkeit). Die Rolle bestimmt Startseite,
  Aufgaben und Benachrichtigungen; wer darf, sieht in der Prüfung die Schaltflächen Freigeben und Zurückweisen.
- **Benachrichtigungen**: Glocke oben rechts, als Drawer wie in der CDE Bund. «Anzeigen» öffnet den passenden Tab der Lieferung.
- **Datenlieferung bestellen**: im Informationslieferplan «Aufgabenplan hinzufügen» öffnet den «Erstellen»-Drawer. Eine
  Anforderung hat den Typ «Dokument» oder «Datenformular» mit Vorlage (Kosten eBKP-H, Ökobilanz Erstellung und Betrieb nach SIA 390/1),
  Zielsystem und der Pflicht-Regel ab CHF 1 Mio Anlagekosten.
- **Datenformulare** (Kostenvoranschlag KV-32, Kostenschätzung KS-31, Ökobilanz THG-32, Grundrisse DWG-UG … DWG-DG) haben dieselben Tabs: Übersicht (Kennzahlen, Kostenziele oder Zielwerte SIA 390/1,
  Hauptgruppen als Balkenliste in eBKP-Reihenfolge mit der Vorphase als Strich, Anteil und Δ, markiert ab Schwellenwert und 0.1 Mio bzw.
  0.1 kg, Zeilen öffnen die Erfassung; Lieferung, Verlauf mit dem nächsten Schritt, Beteiligte), Erfassung
  (siehe unten; die Ökobilanz in den zwei Tabs Erfassung Erstellung und Erfassung Betrieb), Prüfung (Vergleich mit der Vorphase oder Prüfergebnis des Plans, Prüfung BBL mit automatischen Prüfungen
  und Checkliste, Übergabe), Beteiligte, Dokumente (mit Pflicht), Verlauf (alle Ereignisse). Die Erfassung ist nach dem
  Einreichen gesperrt; «Erfassung wieder öffnen (Prototyp)» öffnet sie wieder (Werte bleiben). Prüfen (Checkliste, Freigeben,
  Zurückweisen) können nur BBL-Personen. Der Kommentar der Prüfung und ein Feld, in dem gerade getippt wird, bleiben beim
  Rendern erhalten. Dateien, die ein Import mitbringt (Tool-Export, Rechenhilfe, Excel), erscheinen unter Dokumente.
- **Kosten erfassen (KV-32, KS-31)**: Betrag pro Hauptgruppe oder, nach Klick auf die Zeile, die Positionen (Menge + Kosten)
  nach eBKP-H 2020 (B02, C01 …); Positionen lassen sich entfernen (Papierkorb) und mit «+ Kostenelement hinzufügen» aus den
  Elementgruppen der Hauptgruppe ergänzen. Importieren (Excel-Dialog), «Nur fehlende Werte anzeigen», Leiste mit
  Vollständigkeit und «Zur Prüfung einreichen».
- **Ökobilanz erfassen (THG-32, Design 05.11.2026)**: Die Übersicht zeigt die Kennzahlen Erstellung und Betrieb, die Karte
  «Grundlagen» (gilt für Erstellung und Betrieb: Gebäudekategorie, Bauvorhaben, EBF/GF aus den Grundrissen, Datenstand), die
  «Zielwerte SIA 390/1» und die Karte «Wo entstehen die Emissionen?» mit Umschalter Erstellung (Hauptgruppen mit SIA-31-Strich
  und Δ) und Betrieb (je Energiedienstleistung, PV-Gutschrift in Grün, keine Vorphase):
  Erstellung und Betrieb gegen die Richtwerte Basis (B) und ambitioniert (A) der Gebäudekategorie, die Summe gegen die
  Zusatzanforderung, dazu die Marken Minergie-ECO GW1 (M) und Vorphase (V) (`data/thg.json` «richtwerte»; Betrieb und
  Zusatzanforderung sind nur für Wohnen und Restaurant belegt, für Verwaltung, Schule und Verkauf als Annahme markiert, für
  Spital und Sonstige fehlen sie und die Prüfung verlangt eine Vergleichskategorie). **Erfassung Erstellung**: Grundlagen
  (Systemgrenze, Ökobilanzdaten, Tool Erstellung, Minergie-ECO GW1, Datenqualität; Optionen nach
  `docs/research/2026-11-04-oekobilanzdaten-systemgrenzen.md`) und die Emissionsquellen aus dem Tool-Export je
  eBKP-H-Elementgruppe (SIA 2032): Code, Eingabe «Bauteil oder Anlage · Ökobilanzdaten» (Tool-Code wie Wa01, Bezeichnung,
  Bauteil des Tools oder KBOB-Datensatz), Hersteller-Flag, Referenzgrösse mit Einheit, Kennwert kg CO₂-eq/m² EBF·a und Anteil;
  Hauptgruppen B–G zum Auf- und Zuklappen, «+ Emissionsquelle hinzufügen», Papierkorb, Total B–G, «THGE Erstellung pro Jahr»
  und «THGE Erstellung, Betrachtungszeitraum 60 Jahre inkl. Ersatz» (Begriffe SIA 2032). «Tool-Export importieren» holt die
  Quellen des Projekts (bei einem offenen Formular alle 22, sonst die fehlenden Werte). **Erfassung Betrieb**: Grundlagen
  (Tool Betrieb, Stromprodukt, PV-Überschuss), Photovoltaik (Leistung aus D01.01 der Erstellung, Ertrag, Eigenverbrauch) und
  die Energiedienstleistungen nach Rechenhilfe SIA 390/1 (Nutzenergie, Anteil und Nutzungsgrad/JAZ je Energieträger mit
  Standardwert-Flag; Endenergie = Nutzenergie × Anteil / Nutzungsgrad, THG = Endenergie × Koeffizient des Energieträgers, Strom
  nach Stromprodukt; der PV-Eigenverbrauch reduziert den Strombezug, der Überschuss folgt der gewählten Regel),
  «Rechenhilfe importieren», Total Betrieb und «THGE Erstellung + Betrieb pro Jahr». Die Prüfung zeigt neun automatische
  Prüfpunkte (Vollständigkeit, Pflichtdokumente, Grundlagen, Abweichung zur Vorphase, Zusatzanforderung B, Richtwerte
  informativ, Anteile der Energieträger, Photovoltaik in beiden Bereichen, Anteil Gebäudetechnik) und fünf Prüfpunkte der
  Checkliste; der Vergleich mit der Vorphase ist eine Hantel je Hauptgruppe (SIA 31 ○, THG-32 ●), und jede markierte
  Abweichung (ab 15 % und 0.1 kg) verlangt eine Begründung des Planers (Eingabe in der Prüfung, solange die Erfassung offen
  ist; fehlt sie, zeigt der Prüfpunkt «ohne Begründung»); an das SUS gehen Erstellung und Betrieb in kg CO₂-eq/m² EBF·a. Grundlage sind die realen BBL-Berichte (lokal
  unter `docs/reference/beispiele/`) und die Empfehlungen in
  `docs/research/2026-11-05-oekobilanz-eingabemaske-erstellung-betrieb.md`. Die Darstellungsvarianten der Design-Studie für
  die Tabelle «THG-Emissionen nach Hauptgruppen» (Matrix, Rangliste, Einfluss, Hantel, Brücke, Zusammensetzung) sind noch
  nicht umgesetzt.
- **Planlieferungen DWG**: ein Grundriss pro Lieferung. Die DWG-Datei wird per Drag & Drop hochgeladen und lokal im Browser gegen
  die 40 Prüfregeln der CAD-Richtlinie BBL V1.0 geprüft (LibreDWG WebAssembly, nichts wird hochgeladen), mit Plan-Viewer,
  Fehlermeldungen, Räumen, Geschossflächen (Bruttogeschossfläche als Polygon), Layern und Kennzahlen SIA 416 samt
  Energiebezugsfläche EBF nach SIA 416/1 (EBF = GF eines beheizten Geschosses; ein als unbeheizt markiertes Geschoss,
  z. B. das UG, zählt 0). Wie in
  plan-check hat jede Liste eine Suche, die Viewer-Listen (Layer, Räume, Geschossflächen) ein «Alle ein-/ausblenden»,
  und rechts der Sub-Tabs filtert «Alle | Warnungen | Fehler» alle Listen (Prüfregeln und Fehlermeldungen nach
  Schweregrad, Räume und Flächen nach Status, Layer nur bei Warnungen). Referenz: `docs/reference/plan-check/`. Einreichen ist erst ohne Regel mit Schweregrad Fehler möglich;
  «Musterplan laden» prüft den offiziellen BBL-Musterplan CAD.V01 (38/40, 0 Fehler). «Prüfbericht» lädt das Prüfergebnis als
  PDF herunter (Deckblatt mit Lieferung und Zusammenfassung, Prüfregeln, Fehlermeldungen, Layer, Räume und Flächen mit
  Bildern aus dem Viewer, Kennzahlen SIA 416; jsPDF von jsDelivr, erst beim ersten Klick geladen). Flächen und Volumen
  SIA 416 kommen aus den Grundrissen; ein eigenes Formular FV-32 gibt es nicht mehr.
- **Projektseiten** wie in der CDE Bund: Überblick, Aktivitäten (Feed und Logs), Dateien, Modell, Aufgaben, Info-Management
  (LOIN, Dokumente, Informationslieferplan), Automatisierung, Workflows, Mitglieder, Stammdaten, Einstellungen. Oberhalb der
  Topbar steht der rote Hinweis «Prototyp …», unten rechts der Quellcode-Link.
- **Suche**: das Suchfeld der Topbar schlägt beim Tippen Treffer vor, gruppiert nach Projekten, Lieferungen, Aufgaben und
  Dokumenten (höchstens 5 je Gruppe, 12 insgesamt; `js/model/search.js`), mit Pfeiltasten, Enter, Escape und einem
  Löschen-Knopf im Feld (`ui.search`, flüchtig).
- **Laden**: ein zentrierter Ladeindikator (Ant-Design-Spin wie in der CDE Bund, `#spin` in `index.html`) liegt über der Seite,
  solange die Daten beim Start geladen werden, ein Plan geprüft oder der Prüfbericht erstellt wird (`ui.busy`, flüchtig).
- **Responsiv**: unter 1024 px klappt das Projektmenü ein (Menü-Knopf in der Topbar, Escape schliesst), unter 1280 px werden
  Überblick und Dokumente einspaltig und der Statusfilter der Planprüfung rutscht unter die Tabs, die Spalten der Datenformulare
  brechen um, breite Tabellen scrollen horizontal mit Ausblendkante (`.scroll-x`); unter 640 px Suche als Icon, Kurz-Banner,
  umbrechender Footer; Überblick zwischen 640 und 1279 px mit Projektbild und Projektdaten nebeneinander. Der Seiteninhalt nutzt wie
  in der CDE Bund die volle Breite, auch auf sehr breiten Bildschirmen; nur Lese- und Formularkarten sind auf 900 px
  begrenzt (`--narrow-max`, `.card-narrow`).
  Auf Touch-Geräten (`pointer: coarse`) sind Bedienelemente 32–44 px und Textfelder 16 px
  (`css/responsive.css`). Breakpoints wie in der CDE Bund (Tailwind: 640 / 768 / 1024 / 1280 / 1536);
  Review: `docs/reviews/2026-11-04-design-review-responsive.md`.
- **Design-Studie**: im Benutzermenü «Design-Studie öffnen» (oder ein Studien-Link wie `#s03`). Das Panel zeigt die Screens der
  Studie vom November 2026, die Erläuterungen zum aktuellen Screen und die Tweaks (Markierungen, Anlagekosten); die Screens
  verweisen auf die heutigen Seiten.
- Eingaben, Einreichungen und Freigaben bleiben in der Browser-Session erhalten (sessionStorage), bis «Prototyp zurücksetzen»
  gedrückt wird. Tastatur: Checkboxen, Optionsfelder und Schalter mit Tab, Enter und Leertaste; Escape schliesst Dialoge,
  Drawer und Menüs.

## URLs

| Route | Seite |
|---|---|
| `#/` | Startseite (Hallo, offene Aufgaben, Meine Projekte, Einblicke mit Karte) |
| `#/projects/all?view=list` · `?view=card` · `#/projects/favorites` | Projekte |
| `#/tasks/all` · `#/tasks/assigned` · `#/tasks/everything` · `?type=thg` | Aufgaben (Typ Ökobilanz: Kontrolle über alle Projekte) |
| `#/projects/{id}/overview` | Überblick |
| `#/projects/{id}/tasks` · `timeline[/logs]` · `documents` · `loin[/elements|parameter-sets|parameters]` · `files` · `model` · `members` · `master-data` · … | Projektseiten (Pfade der CDE Bund) |
| `#/projects/{id}/delivery-plan` | Informationslieferplan (mit «Erstellen»-Drawer) |
| `#/projects/{id}/deliveries/kv-32/{tab}` · `ks-31/{tab}` · `thg-32/{tab}` · `dwg-eg/{tab}` … | Datenformulare; `{tab}` = `uebersicht` · `erfassung` · `pruefung` · `beteiligte` · `dokumente` · `verlauf`, bei THG-32 zusätzlich `betrieb` (Erfassung Betrieb); ohne Tab wird die Übersicht geöffnet |
| `#/projects/{id}/settings/information-requirements` | Vorlagen für Datenformulare |
| `#/study` · `#/study/review` · `#/study/qs` · `#/study/variant-b` | Seiten der Design-Studie |

Die Kurzlinks der Studie (`#s01` … `#s11`) wechseln in die Rolle des Screens und öffnen die Seite. Zustand lässt sich per URL
vorgeben (Deep-Links, Screenshots): `#/projects/musterhausen/deliveries/thg-32/pruefung?projects.musterhausen.forms.thg.step=5` oder
`…/overview?ui.notif=true&user=FM`; Punkt-Schreibweise patcht verschachtelte Objekte.

## Prüfen

Code-Reviews mit Befunden und Status: `docs/reviews/` (zuletzt `2026-11-05-code-review-gesamt.md`).

- `node --test` (oder `npm test`) prüft ohne Browser das Rechenmodell der Datenformulare (Hauptgruppen, Kostenelemente,
  Emissionsquellen, Betrieb, Vollständigkeit, Vergleich, Zielwerte SIA 390/1, Workflow, alle Projekte), die Datenkonsistenz (Codes, Quellen, Richtwerte,
  Vorlagen, Benachrichtigungen, veraltete Begriffe), den Router, die Zuordnung der Studien-Screens und die DWG-Prüf-Engine
  gegen die vorberechneten Ergebnisse (`tests/model.test.mjs`) sowie die Benutzeraktionen gegen den echten Store
  (Aufschlüsseln, Kostenelemente, Emissionsquellen, Importe, Workflow, Planprüfung), den Mock, den Store und die
  Formatierung (`tests/actions.test.mjs`), Rollen der Prüfung, Statusfilter und Suche der Planprüfung; 34 Tests, Node 22+.
- `node tests/e2e.mjs` fährt bei laufendem Server einen Headless-Browser (Edge/Chrome/Brave) durch die Anwendung: Startseite mit
  Karte, Bestellen-Drawer, Rollenwechsel, Benachrichtigungen, KV-32 (Übersicht, Erfassung mit Aufschlüsseln, Kostenelemente,
  Filter, Excel-Import, Einreichen), THG-32 (Übersicht mit Zielwerten, Emissionsquellen, Betrieb, Tool-Export, Rechenhilfe, neue Quelle, Hersteller-Flag, Einreichen),
  THG-32 einreichen und prüfen (freigeben, übertragen), KV-32 zurückweisen, Planlieferungen DWG (Parsen, Hochladen, Einreichen,
  Prüfung mit Suche, Alle ein-/ausblenden und Statusfilter), die Datenformulare der weiteren Projekte, Aufgabenliste,
  Projektseiten, Hover-Zustände, Studien-Panel und bei 375 px Überlauf, Sidebar, Filter, Footer und Karte (≈265 Checks).
- `node tests/responsive-audit.mjs [ordner] [m375,t768,l1024]` macht bei laufendem Server Screenshots der Hauptseiten auf
  375 / 768 / 1024 px und misst Überlauf, zu kleine Bedienelemente und Felder unter 16 px (`report.json`).
- `node tests/refshots.mjs` erzeugt Screenshots in den Fenstergrössen der Referenz-Screenshots der CDE Bund und legt
  Vergleichsbilder in `docs/reference/compare/` ab (Python mit Pillow nötig); Basis der pixelgenauen Gap-Analyse.
- In der Browser-Konsole steht `cde` zur Verfügung: `cde.state`, `cde.store.setIn('ui', { notif: true })`, `cde.navigate('/tasks/all')`.

## Struktur

```
index.html            Einstieg
css/                  tokens, base, shell (Topbar, Sidebars, Tabs), components, app (Startseite, Projekte, Aufgaben, Drawer, Menü),
                      form (Datenformulare), plan (DWG-Viewer), study, views-a..d (Bestellen, Import-Dialog, Prüfung, Vorlagen),
                      responsive (Touch-Ziele und Phone-Felder, zuletzt geladen)
js/app.js             Bootstrap: Daten laden → Store → Route auflösen → Rendern; Event-Delegation (data-action, data-change, data-nav)
js/router.js          Hash-Router mit den URLs der CDE Bund und Zustands-Overrides (?key=value)
js/links.js           Link-Builder, Sidebar-Sektionen, Tabs der Datenformulare, Zuordnung Studien-Screen → Route
js/store.js           Zustand + sessionStorage (ohne busy/toast), patchDotted für Deep-Links · js/data.js lädt data/*.json · js/ui.js html``-Templating und UI-Atome
js/shell.js           Topbar, Sidebars, Seitenkopf, Breadcrumb, Tabs, Benachrichtigungs-Drawer, Benutzermenü, Toast
js/actions.js         alle Benutzeraktionen (Datenformulare, Bestellen, Import, Planlieferungen, Studie)
js/model/             form.js (Datenformulare: costPart KV-32/KS-31, thgPart THG-32, planForm DWG in einer Form), mock.js (Werte je Projekt),
                      plan.js (DWG-Prüfung), app.js (Projekte, Aufgaben, Benachrichtigungen, Dokumente, LOIN, Logs), import.js, templates.js, state.js
js/views/             delivery (Seite einer Lieferung) + form (die sechs Tabs) + plan (Upload, Prüfergebnis, Viewer); parts/map (MapLibre-Slot), parts/projectMap (Standort);
                      dashboard, projects, overview, tasks, timeline, documents, loin, section, settings, s01 (ILP), order, columns,
                      s03c/s03d (Excel-Import), s06 (Kontrolle), s09 (Vorlagen), Studienseiten home, review, qs, varb
js/plancheck/         Prüf-Engine aus plan-check (MIT), report.js Prüfbericht PDF · js/vendor/libredwg-web/ LibreDWG WebAssembly (GPL-3.0)
data/                 forms (Datenformulare), ebkp (Positionen eBKP-H 2020, Elementgruppen, KS-31), thg (Emissionsquellen der Erstellung, Betrieb nach
                      Rechenhilfe SIA 390/1, Richtwerte je Gebäudekategorie, Elementgruppen SIA 2032, Grundlagen, SIA 31), sia416 (Bezugsmengen), plans (DWG, Prüfergebnisse),
                      projects, users, notifications, ilp, tasks, documents, loin, templates, portfolio, screens, study
tests/                model.test.mjs, actions.test.mjs (node:test), e2e.mjs (Headless-Browser), responsive-audit.mjs (Screenshots und
                      Messwerte auf drei Breiten), refshots.mjs (Vergleichsbilder)
docs/                 wireframes (Design), reviews, research, reference (Referenz-Screenshots, lokal)
```

## Daten

Das Projekt «Verwaltungszentrum Musterhausen» trägt den vollständigen Workflow (KS-31, KV-32, THG-32, DWG-UG … DWG-DG) mit den
Basiswerten aus `data/ebkp.json` (Positionen, KS-31), `data/thg.json` (22 Emissionsquellen aus dem Tool-Export, Betrieb, SIA 31) und
`data/sia416.json` (Bezugsmengen). Die sieben weiteren Projekte haben eigene Datenformulare in verschiedenen
Workflow-Zuständen (`data/forms.json` › `byProject`: Schritt, Daten, Lieferverantwortliche, überfällig, fehlende Werte,
Endwert, Grundlagen); ihre Werte leitet `js/model/mock.js` deterministisch aus den Basiswerten ab, skaliert mit den
Anlagekosten des Projekts (Emissionsquellen auf den Endwert der Instanz kalibriert). Der Zustand jedes Projekts liegt in
`state.projects[id]` (`kvQ/kvV`, `ksQ/ksV`, `thgSrc`, `thgHead`, `sia`, `forms`). Projektnamen folgen den
öffentlichen [Bautendokumentationen des BBL](https://www.bbl.admin.ch/de/bautendokumentationen); Phasen, Werte, Firmen und
Personen sind fiktiv. Projektfotos in `assets/projects/` (freie Lizenzen, Nachweise in `assets/projects/ATTRIBUTION.md`),
Planlieferungen mit vorberechneten Prüfergebnissen in `data/plans.json`.
