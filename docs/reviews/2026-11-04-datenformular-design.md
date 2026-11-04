# Datenformular-Design vom 04.11.2026: Umsetzung

Quelle: `docs/wireframes/261104_CDE-Workflows Datenformular Design.html` (Claude Design, Komponente «Datenformular» mit der
Screen-Übersicht «Datenformulare Screens», 3 Formulare × 6 Tabs). Dieses Dokument hält fest, was aus dem Design in den
Prototyp übernommen wurde, wo der Prototyp abweicht und was offen ist.

## Kern des Designs

Eine Struktur für alle Lieferungen, mit denselben Tabs in derselben Reihenfolge:

| Tab | Inhalt | Umsetzung |
|---|---|---|
| Übersicht | Kennzahlen (2 Karten + Vollständigkeit bzw. Prüfregeln), Tabelle Hauptgruppen im Vergleich mit der Vorphase, Kostenziel bzw. Zielwert mit Zielmarken; beim Plan Flächen SIA 416 und Prüfregeln nach Kategorie; rechts Lieferung, Verlauf (Schritte mit dem nächsten Schritt), Beteiligte | `js/views/form.js` `uebersicht()`, Modell in `js/model/form.js` |
| Erfassung | Hauptgruppen mit Betrag (direkt) oder «Aufschlüsseln» in Positionen (Menge + Wert), Bezugsmenge und Kennwert je Zeile, Importieren-Menü, Excel herunterladen; THG: «Weitere Angaben» (Endwert); DWG: Hochladen, Prüfregeln, Fehlermeldungen, Räume, Layer, Kennzahlen mit Viewer; am Ende die Leiste mit Vollständigkeit, «Nur fehlende Werte anzeigen», Grund und «Zur Prüfung einreichen»; nach dem Einreichen gesperrt | `erfassung()`, `submitBar()`, Zustand `state.forms[kind]` |
| Prüfung | Vergleich mit Vorphase (Abweichungen ab 10 % rot) bzw. Prüfergebnis des Plans; Prüfung BBL mit automatischen Prüfungen, Checkliste, Kommentar, Zurückweisen / Freigeben; Übergabe (Zielsystem, Wert, Status, Übertragen) | `pruefung()` |
| Beteiligte | Tabelle Person, Firma, Rolle, Bereich, Status, Bearbeiten/Entfernen | `beteiligte()` |
| Dokumente | Tabelle mit Pflicht-Spalte und Hinweis | `dokumente()` |
| Verlauf | Tabelle Datum, Person, Ereignis mit Detail, neueste zuerst | `verlauf()` |

Weitere Punkte des Designs: Status-Pill im Seitenkopf, Badges in den Tabs (fehlende Werte rot, Anzahl Dokumente grau), roter
Hinweis «Zurückgewiesen …» über dem Inhalt, Übersicht als Start-Tab, FV-32 entfällt (Flächen aus den Grundrissen DWG),
Zusammenfassung und Prüfungs-Stepper gehen in der Übersicht auf, «Einreichen» nur noch in der Leiste am Ende der Erfassung.

## Was sich im Prototyp geändert hat

- Neu: `js/model/form.js` (ein View-Model für KV-32, THG-32 und die Planlieferungen), `js/views/form.js`, `css/form.css`,
  `data/forms.json` (Beteiligte, Dokumente, Verlauf, Zielwerte, Texte). `js/views/delivery.js` rendert nur noch Kopf, Tabs und
  den Tab-Inhalt; `js/views/plan.js` liefert Upload-Zone, Prüfergebnis und Viewer für die Erfassung eines Plans.
- Zustand (`STATE_VERSION` 8, seit der zweiten Fassung 10): `state.forms.{kv,thg}` mit Schritt (0 Erstellt … 6 Übertragen),
  Daten je Schritt, Modus je Hauptgruppe (`direct` / `detail`), Gruppenbeträgen, Prüfpunkten, Zurückweisung, Filter und
  Ereignissen. Die Werte der Positionen bleiben in `kvQ/kvV`, die Planlieferungen in `plans` (die THG-Werte seit der zweiten
  Fassung in `thgSrc` und `thgHead`, siehe unten).
  Entfernt: `fvSubmitted`, `kvSubmitted`, `thgSubmitted`, `gp`, `kvRev`, `review`, `m1/m2/k1/k2`, `dwg` (Variante B), Tweak Gliederung.
- Entfernt: FV-32 (Informationslieferplan, Aufgabe, Benachrichtigung, Vorlage, Routen), die Screens 03a, 03, 03b, 04, 05, 07,
  08, B1, B2 als eigene Views samt Modellen (`fv`, `gp`, `kvreview`, `dwg`, `summary`, `rows`) und die BKP-Variante des KV.
  Die Kurzlinks der Studie zeigen auf die neuen Seiten (03a → DWG-UG Übersicht, 03b → KV-32 Übersicht, B1/B2 → DWG-EG).
- Daten: KV-32 wird vom Generalplaner geführt (Gian Muster), Bearbeitende Kai Beispiel (Kosten) und Alex Beispiel
  (Bezugsmengen); Hauptgruppe J Ausstattung ergänzt (`data/ebkp.json`), A–Z inkl. MWST 8.1 %; Benachrichtigungen öffnen den
  passenden Tab (`tab`); die THG-Aufgabe folgt dem Status des Formulars.
- Workflow: Einreichen → «Eingereicht»; der erste Prüfpunkt der Prüfung setzt «In Prüfung»; Freigeben → «Freigegeben»;
  Übertragen → «Abgeschlossen»; Zurückweisen öffnet die Erfassung wieder (Status «Zurückgewiesen»). Alle Übergänge liegen in
  `js/actions.js` (`form*`, `plan*`), die Statuslabel folgen dem Informationslieferplan der CDE Bund.
- Excel-Import: aus dem Importieren-Menü; übernommene Positionen öffnen ihre Hauptgruppe in der Detailansicht und stehen im Verlauf.
  «Mengen aus KV-32 übernehmen» kopiert die Mengen in THG-32.

## Ergänzungen nach dem Design (gleicher Tag)

- **Alle Projekte**: Jedes Projekt hat vollständige, plausible Datenformulare (Kostenvoranschlag KV-32, Kostenschätzung KS-31,
  Ökobilanz THG-32) in verschiedenen Workflow-Zuständen; die Werte werden aus den Musterhausen-Basiswerten mit den Anlagekosten
  des Projekts skaliert (`js/model/mock.js`), die Instanzen stehen in `data/forms.json` › `byProject`. Der Zustand liegt je
  Projekt in `state.projects[id]`; Informationslieferplan, Aufgaben, Benachrichtigungen und die Kontrolle über alle Projekte
  folgen den Formularen. Die Kostenschätzung KS-31 ist eine dritte Formularart (Vorphase SIA 21, Genauigkeit ±15 %).
- **THG-Werte** nach `docs/research/2026-11-04-oekobilanz-bauemissionen-sia32.md` neu verteilt (C 1.20 · D 0.80 · E 0.44 ·
  G 0.36 · F 0.15 · B 0.11 · I 0.03 Mio kg CO₂-eq über 60 Jahre, Kontrollwert 9.2 kg/m² EBF·a); Prüfpunkt «Datengrundlage
  KBOB/ecobau-Liste 2022, Version 9.0».
- **Projektseiten**: Projektkarten mit Foto oben rechts, Überblick mit Projektbild und Standortkarte (MapLibre, swisstopo).

## Zweite Fassung des Designs (04.11.2026, Kosten und Ökobilanz)

Quelle: `docs/wireframes/261104_CDE-Workflows Datenformular Design.zip` (Komponente `Datenformular.dc.html`; der gebündelte
Screen-Export im Zip zeigt noch die erste Fassung). Umgesetzt:

- **Hauptgruppen (KV-32, KS-31)**: die ganze Zeile klappt auf und zu (Chevron bleibt Tastaturziel, ein Klick ins Betragsfeld
  klappt nicht), ohne Link «Aufschlüsseln» und ohne «Summe aus n Positionen». Jede Hauptgruppe lässt sich öffnen, auch J, V, W, Y.
- **Kostenelemente**: Positionen haben einen Papierkorb («Kostenelement entfernen», Ereignis im Verlauf); «+ Kostenelement
  hinzufügen» unter jeder geöffneten Hauptgruppe öffnet eine Zeile mit der Auswahl der eBKP-H-Elementgruppen der Hauptgruppe
  (SN 506 511:2020, `data/ebkp.json` › `elements`), Menge und Kosten; «Neue Zeile verwerfen». Die Codes der Positionen folgen
  jetzt dem eBKP-H 2020 (B02, B06, C01 … I01; `data/ebkp.json`), die Fusszeile der Tabelle entfällt.
- **Ökobilanz THG-32 als Emissionsquellen je eBKP-H-Elementgruppe** (`data/thg.json`, Modell `thgPart` in `js/model/form.js`):
  Karte «Grundlagen der Ökobilanz» (Gebäudekategorie, Projektart, EBF und GF aus den Grundrissen, Systemgrenze SIA 2032,
  Ökobilanzdaten KBOB/ecobau-Liste 2022 Version 9.0, Berechnungstool, Datenqualität); Tabelle mit Code, Elementgruppe ·
  KBOB-Datensatz, Hersteller (herstellerspezifischer Datensatz oder EPD), Menge, Einheit, Herstellung und Entsorgung in t CO₂-eq,
  Amortisation nach SIA 2032 Anhang C, Kennwert; Hauptgruppen B–G auf- und zuklappbar (C und E offen) mit Summen; «+ Emissionsquelle
  hinzufügen» (Elementgruppe aus der SIA-2032-Liste, KBOB-Datensatz, Werte), Papierkorb; «Total B–G» und die abgeleiteten Zeilen
  «Erstellung pro Jahr» (t CO₂-eq/a, kg/m² EBF·a) und «Erstellung absolut, 60 Jahre inkl. Ersatz» (t CO₂-eq, kg/m² EBF).
  Formel je Quelle: (Herstellung + Entsorgung) × 1000 / Amortisation × 60 Jahre; Kennwert = davon / 60 / EBF.
- **Endwert für SUS** ist die berechnete «Erstellung pro Jahr» je m² EBF (7.6 für Musterhausen); die Karte «Weitere Angaben»
  mit dem von Hand erfassten Endwert und dem Kontrollwert entfällt. Übersicht mit «Erstellung über 60 Jahre» (t CO₂-eq),
  Zielwerte SIA 390/1 Basis 9.0 und ambitioniert 6.0, Minergie-ECO GW1 8.0, Projektziel BBL 8.5, SIA 31 Vorphase.
- **Prüfung**: automatische Prüfungen «Alle n Emissionsquellen mit Elementgruppe und KBOB-Datensatz», «Ökobilanz-Bericht und
  Tool-Export hochgeladen», Grundlagen (KBOB-Liste 9.0 und Systemgrenze SIA 2032), «Endwert unter SIA 390/1 Richtwert Basis 9.0»;
  vier manuelle Prüfpunkte (Systemgrenze, KBOB-Liste, biogener Kohlenstoff, wiederverwendete Bauteile); zwei Pflichtdokumente.
- **Importieren**: «Tool-Export importieren (XLSX, JSON)» übernimmt die Emissionsquellen des Projekts (fehlende Werte werden
  ergänzt, ein offenes Formular erhält alle 25 Quellen, Ereignis «Tool-Export importiert»); «Mengen aus KV-32 übernehmen» ist
  ohne Funktion, weil die Quellen in KBOB-Bezugseinheiten (kg, m², m² EBF, m) erfasst sind.
- **Alle Projekte**: die Quellen werden aus den Musterhausen-Werten skaliert (Gebäudetechnik je m² EBF) und auf den Endwert
  der Instanz kalibriert; ein offenes THG-32 hat noch keine Quellen («Noch keine Emissionsquellen erfasst»), fehlende Werte
  per `missing` («thg:C04.01-1:h»), Grundlagen per `head`. Zustand je Projekt in `thgSrc` und `thgHead` (`STATE_VERSION` 10).
- Prüfregel-Zeilen der Planlieferung etwas höher (40 px, 13 px) wie im Design.

Abweichungen von der zweiten Fassung: der Kontrollwert-Vergleich («Endwert entspricht dem Kontrollwert ± 5 %») entfällt, weil der
Endwert berechnet wird; dafür prüft die CDE die Grundlagen. EBF und GF kommen aus den Grundrissen (DWG) statt aus FV-32. Der
biogene Kohlenstoff ist im Design vorbereitet, aber nicht dargestellt und wurde nicht übernommen. Im Design können neue
Kostenelemente nur aus einer kurzen Liste gewählt werden; der Prototyp bietet alle Elementgruppen der Hauptgruppe an, die noch
nicht in der Tabelle stehen.

## Abweichungen vom Design

- Status «Übertragen» heisst im Seitenkopf und in den Listen «Abgeschlossen» (Label der CDE Bund); im Verlauf der Übersicht
  steht der Schritt «Übertragen» wie im Design.
- Die Prüfung eines Plans zeigt das kompakte Prüfergebnis des Designs; der vollständige Viewer liegt (gesperrt) in der Erfassung,
  «Im Plan anzeigen» führt dorthin. Vor der Einreichung sieht das BBL kein Prüfergebnis.
- Die Erfassung eines Plans zeigt zusätzlich Dateiname, DWG-Version und «Entfernen» im Kartenkopf; der Zielsystem-Text lautet
  «CAFM (Flächenmanagement BBL)» statt «ERP SAP RE-FX».
- Die Übersicht zeigt keine «Verwendet in / Benötigt»-Abhängigkeiten (im Design berechnet, aber nicht dargestellt).
- Der Vergleich mit der Vorphase hat keine KS-31-Werte für A–Z (Anlagekosten); diese Zeile zeigt «–».
- Die Views «Hauptgruppen» (KV) und «Geschosse und Pläne» (FV) des Designs entfallen: der KV hat nur eine Ansicht, die
  Geschosse sind eigene Lieferungen.

## Offene Punkte

- Reihenfolge der Tabs für Prüfende: die Übersicht ist für alle der Start-Tab (Design); ein rollenabhängiger Start (Prüfung
  für das BBL) wäre mit `defaultDeliveryTab` in `js/links.js` leicht zu ändern.
- Der Kostendach-Wert (CHF 19.0 Mio) und das Projektziel BBL (8.5) sind Annahmen; die Richt- und Grenzwerte (SIA 390/1,
  Minergie-ECO), die KBOB-IDs und die Amortisationszeiten sind in `docs/research/` belegt, die Mengen und Ergebnisse fiktiv.
- «Bearbeitende hinzufügen», «Hochladen», «Excel herunterladen», «IFC importieren», «Bezugsmengen aus den Grundrissen
  übernehmen» und «Mengen aus KV-32 übernehmen» sind im Prototyp ohne Funktion; die KBOB-Suche in einer neuen Emissionsquelle
  ist ein Textfeld.
- Die Studien-Seiten (`#/study`) beschreiben weiterhin die Studie vom November 2026; die Screens sind auf die neuen Seiten
  gemappt, die Erläuterungen wurden nur dort angepasst, wo sie dem Design widersprachen.

## Prüfung

`node --test`: 16 Tests, `node tests/e2e.mjs`: 197 Checks bestanden (Stand 04.11.2026, zweite Fassung; siehe docs/entwicklung.md).
