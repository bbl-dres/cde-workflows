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
swisstopo-Basiskarte; fällt der Stil aus, wird OpenFreeMap «Positron» geladen, ohne Netz erscheint eine Ortsliste
(Konfiguration in `data/projects.json` unter `map`).

## Bedienung

- **Angemeldete Person**: Klick auf den Namen oben rechts öffnet «Anmelden als» mit sieben Musterpersonen (Projektleitung BBL,
  Architekt, Kostenplaner, Ökobilanz, Generalplaner, BIM-Management, Fachstelle Nachhaltigkeit). Die Rolle bestimmt Startseite,
  Aufgaben und Benachrichtigungen; wer darf, sieht in der Prüfung die Schaltflächen Freigeben und Zurückweisen.
- **Benachrichtigungen**: Glocke oben rechts, als Drawer wie in der CDE Bund. «Anzeigen» öffnet den passenden Tab der Lieferung.
- **Datenlieferung bestellen**: im Informationslieferplan «Aufgabenplan hinzufügen» öffnet den «Erstellen»-Drawer. Eine
  Anforderung hat den Typ «Dokument» oder «Datenformular» mit Vorlage (Kosten eBKP-H, Ökobilanz Bauemissionen nach SIA 2032),
  Zielsystem und der Pflicht-Regel ab CHF 1 Mio Anlagekosten.
- **Datenformulare** (Kostenvoranschlag KV-32, Kostenschätzung KS-31, Ökobilanz THG-32, Grundrisse DWG-UG … DWG-DG) haben dieselben Tabs: Übersicht (Kennzahlen, Hauptgruppen im
  Vergleich mit der Vorphase, Kostenziel oder Zielwert, Lieferung, Verlauf mit dem nächsten Schritt, Beteiligte), Erfassung
  (siehe unten), Prüfung (Vergleich mit der Vorphase oder Prüfergebnis des Plans, Prüfung BBL mit automatischen Prüfungen
  und Checkliste, Übergabe), Beteiligte, Dokumente (mit Pflicht), Verlauf (alle Ereignisse). Die Erfassung ist nach dem
  Einreichen gesperrt; «Erfassung wieder öffnen (Prototyp)» öffnet sie wieder (Werte bleiben), «Zurücksetzen» in der
  Prüfung stellt den Ausgangszustand des Formulars her. Der Kommentar der Prüfung bleibt beim Rendern erhalten.
- **Kosten erfassen (KV-32, KS-31)**: Betrag pro Hauptgruppe oder, nach Klick auf die Zeile, die Positionen (Menge + Kosten)
  nach eBKP-H 2020 (B02, C01 …); Positionen lassen sich entfernen (Papierkorb) und mit «+ Kostenelement hinzufügen» aus den
  Elementgruppen der Hauptgruppe ergänzen. Importieren (Excel-Dialog), «Nur fehlende Werte anzeigen», Leiste mit
  Vollständigkeit und «Zur Prüfung einreichen».
- **Ökobilanz erfassen (THG-32)**: Karte «Grundlagen der Ökobilanz» (Gebäudekategorie, Projektart, EBF/GF aus den Grundrissen,
  Systemgrenze, KBOB-Liste, Tool, Datenqualität) und die Emissionsquellen je eBKP-H-Elementgruppe (SIA 2032) mit KBOB-Datensatz,
  Hersteller-Flag, Menge, THG Herstellung und Entsorgung (t CO₂-eq), Amortisation und Kennwert; Hauptgruppen B–G zum Auf- und
  Zuklappen, «+ Emissionsquelle hinzufügen», Papierkorb, Total B–G, «Erstellung pro Jahr» und «Erstellung absolut». Der
  Endwert für das SUS wird berechnet (Erstellung pro Jahr je m² EBF). «Tool-Export importieren» holt die Quellen des Projekts
  (bei einem offenen Formular alle 25, sonst die fehlenden Werte).
- **Planlieferungen DWG**: ein Grundriss pro Lieferung. Die DWG-Datei wird per Drag & Drop hochgeladen und lokal im Browser gegen
  die 40 Prüfregeln der CAD-Richtlinie BBL V1.0 geprüft (LibreDWG WebAssembly, nichts wird hochgeladen), mit Plan-Viewer,
  Fehlermeldungen, Räumen, Layern und Kennzahlen SIA 416. Einreichen ist erst ohne Regel mit Schweregrad Fehler möglich;
  «Musterplan laden» prüft den offiziellen BBL-Musterplan CAD.V01 (38/40, 0 Fehler). «Prüfbericht» lädt das Prüfergebnis als
  PDF herunter (Deckblatt mit Lieferung und Zusammenfassung, Prüfregeln, Fehlermeldungen, Layer, Räume und Flächen mit
  Bildern aus dem Viewer, Kennzahlen SIA 416; jsPDF von jsDelivr, erst beim ersten Klick geladen). Flächen und Volumen
  SIA 416 kommen aus den Grundrissen; ein eigenes Formular FV-32 gibt es nicht mehr.
- **Projektseiten** wie in der CDE Bund: Überblick, Aktivitäten (Feed und Logs), Dateien, Modell, Aufgaben, Info-Management
  (LOIN, Dokumente, Informationslieferplan), Automatisierung, Workflows, Mitglieder, Stammdaten, Einstellungen. Oberhalb der
  Topbar steht der rote Hinweis «Prototyp …», unten rechts der Quellcode-Link.
- **Responsiv**: unter 1024 px klappt das Projektmenü ein (Menü-Knopf in der Topbar), die Spalten der Datenformulare brechen um,
  Tabellen scrollen horizontal; Breakpoints wie in der CDE Bund (Tailwind: 640 / 768 / 1024 / 1280 / 1536).
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
| `#/projects/{id}/deliveries/kv-32/{tab}` · `ks-31/{tab}` · `thg-32/{tab}` · `dwg-eg/{tab}` … | Datenformulare; `{tab}` = `uebersicht` · `erfassung` · `pruefung` · `beteiligte` · `dokumente` · `verlauf`; ohne Tab wird die Übersicht geöffnet |
| `#/projects/{id}/settings/information-requirements` | Vorlagen für Datenformulare |
| `#/study` · `#/study/review` · `#/study/qs` · `#/study/variant-b` | Seiten der Design-Studie |

Die Kurzlinks der Studie (`#s01` … `#s11`) wechseln in die Rolle des Screens und öffnen die Seite. Zustand lässt sich per URL
vorgeben (Deep-Links, Screenshots): `#/projects/musterhausen/deliveries/thg-32/pruefung?projects.musterhausen.forms.thg.step=5` oder
`…/overview?ui.notif=true&user=FM`; Punkt-Schreibweise patcht verschachtelte Objekte.

## Prüfen

- `node --test` (oder `npm test`) prüft ohne Browser das Rechenmodell der Datenformulare (Hauptgruppen, Kostenelemente,
  Emissionsquellen, Vollständigkeit, Vergleich, Zielwerte, Workflow, alle Projekte), die Datenkonsistenz (Codes, Quellen,
  Vorlagen, Benachrichtigungen, veraltete Begriffe), den Router, die Zuordnung der Studien-Screens und die DWG-Prüf-Engine
  gegen die vorberechneten Ergebnisse (`tests/model.test.mjs`) sowie die Benutzeraktionen gegen den echten Store
  (Aufschlüsseln, Kostenelemente, Emissionsquellen, Importe, Workflow, Planprüfung), den Mock, den Store und die
  Formatierung (`tests/actions.test.mjs`); 25 Tests, Node 22+.
- `node tests/e2e.mjs` fährt bei laufendem Server einen Headless-Browser (Edge/Chrome/Brave) durch die Anwendung: Startseite mit
  Karte, Bestellen-Drawer, Rollenwechsel, Benachrichtigungen, KV-32 (Übersicht, Erfassung mit Aufschlüsseln, Kostenelemente,
  Filter, Excel-Import, Einreichen), THG-32 (Emissionsquellen, Tool-Export, neue Quelle, Hersteller-Flag, Einreichen),
  Prüfungen (THG-32 freigeben und übertragen, KV-32 zurückweisen), Planlieferungen DWG (Parsen, Hochladen, Einreichen,
  Prüfung), die Datenformulare der weiteren Projekte, Aufgabenliste, Projektseiten, Hover-Zustände, responsives Layout,
  Studien-Panel (≈200 Checks).
- `node tests/refshots.mjs` erzeugt Screenshots in den Fenstergrössen der Referenz-Screenshots der CDE Bund und legt
  Vergleichsbilder in `docs/reference/compare/` ab (Python mit Pillow nötig); Basis der pixelgenauen Gap-Analyse.
- In der Browser-Konsole steht `cde` zur Verfügung: `cde.state`, `cde.store.setIn('ui', { notif: true })`, `cde.navigate('/tasks/all')`.

## Struktur

```
index.html            Einstieg
css/                  tokens, base, shell (Topbar, Sidebars, Tabs), components, app (Startseite, Projekte, Aufgaben, Drawer, Menü),
                      form (Datenformulare), plan (DWG-Viewer), study, views-a..d (Bestellen, Import-Dialog, Prüfung, Vorlagen)
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
data/                 forms (Datenformulare), ebkp (Positionen eBKP-H 2020, Elementgruppen, KS-31), thg (Emissionsquellen, Elementgruppen SIA 2032,
                      Grundlagen, SIA 31), sia416 (Bezugsmengen), plans (DWG, Prüfergebnisse),
                      projects, users, notifications, ilp, tasks, documents, loin, templates, portfolio, screens, study
tests/                model.test.mjs, actions.test.mjs (node:test), e2e.mjs (Headless-Browser), refshots.mjs (Vergleichsbilder)
docs/                 wireframes (Design), reviews, research, reference (Referenz-Screenshots, lokal)
```

## Daten

Das Projekt «Verwaltungszentrum Musterhausen» trägt den vollständigen Workflow (KS-31, KV-32, THG-32, DWG-UG … DWG-DG) mit den
Basiswerten aus `data/ebkp.json` (Positionen, KS-31), `data/thg.json` (25 Emissionsquellen mit KBOB-IDs, SIA 31) und
`data/sia416.json` (Bezugsmengen). Die sieben weiteren Projekte haben eigene Datenformulare in verschiedenen
Workflow-Zuständen (`data/forms.json` › `byProject`: Schritt, Daten, Lieferverantwortliche, überfällig, fehlende Werte,
Endwert, Grundlagen); ihre Werte leitet `js/model/mock.js` deterministisch aus den Basiswerten ab, skaliert mit den
Anlagekosten des Projekts (Emissionsquellen auf den Endwert der Instanz kalibriert). Der Zustand jedes Projekts liegt in
`state.projects[id]` (`kvQ/kvV`, `ksQ/ksV`, `thgSrc`, `thgHead`, `sia`, `forms`). Projektnamen folgen den
öffentlichen [Bautendokumentationen des BBL](https://www.bbl.admin.ch/de/bautendokumentationen); Phasen, Werte, Firmen und
Personen sind fiktiv. Projektfotos in `assets/projects/` (freie Lizenzen, Nachweise in `assets/projects/ATTRIBUTION.md`),
Planlieferungen mit vorberechneten Prüfergebnissen in `data/plans.json`.
