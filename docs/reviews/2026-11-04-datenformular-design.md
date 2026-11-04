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
- Zustand (`STATE_VERSION` 8): `state.forms.{kv,thg}` mit Schritt (0 Erstellt … 6 Übertragen), Daten je Schritt, Modus je
  Hauptgruppe (`direct` / `detail`), Gruppenbeträgen, Prüfpunkten, Zurückweisung, Filter und Ereignissen. Die Werte der
  Positionen bleiben in `kvQ/kvV` und `thgQ/thgV`, der Endwert in `endwert`, die Planlieferungen in `plans`.
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

## Abweichungen vom Design

- Status «Übertragen» heisst im Seitenkopf und in den Listen «Abgeschlossen» (Label der CDE Bund); im Verlauf der Übersicht
  steht der Schritt «Übertragen» wie im Design.
- Die Prüfung eines Plans zeigt das kompakte Prüfergebnis des Designs; der vollständige Viewer liegt (gesperrt) in der Erfassung,
  «Im Plan anzeigen» führt dorthin. Vor der Einreichung sieht das BBL kein Prüfergebnis.
- Die Erfassung eines Plans zeigt zusätzlich Dateiname, DWG-Version und «Entfernen» im Kartenkopf; der Zielsystem-Text lautet
  «CAFM (Flächenmanagement BBL)» statt «ERP SAP RE-FX».
- Die Übersicht zeigt keine «Verwendet in / Benötigt»-Abhängigkeiten (im Design berechnet, aber nicht dargestellt).
- Der Vergleich mit der Vorphase hat keine KS-31-Werte für J, Y und A–Z (Anlagekosten); diese Zeilen zeigen «–».
- Die Views «Hauptgruppen» (KV) und «Geschosse und Pläne» (FV) des Designs entfallen: der KV hat nur eine Ansicht, die
  Geschosse sind eigene Lieferungen.

## Offene Punkte

- Reihenfolge der Tabs für Prüfende: die Übersicht ist für alle der Start-Tab (Design); ein rollenabhängiger Start (Prüfung
  für das BBL) wäre mit `defaultDeliveryTab` in `js/links.js` leicht zu ändern.
- Der Kostendach-Wert (CHF 19.0 Mio) und die Zielwerte SIA 390/1 (9.0) / Projektziel BBL (8.5) sind Annahmen; siehe
  `docs/research/` für die Grundlagen der THG-Werte.
- «Bearbeitende hinzufügen», «Hochladen», «Excel herunterladen», «IFC importieren» und «Bezugsmengen aus den Grundrissen
  übernehmen» sind im Prototyp ohne Funktion.
- Die Studien-Seiten (`#/study`) beschreiben weiterhin die Studie vom November 2026; die Screens sind auf die neuen Seiten
  gemappt, die Erläuterungen wurden nur dort angepasst, wo sie dem Design widersprachen.

## Prüfung

`node --test`: 16 Tests, `node tests/e2e.mjs`: alle Checks bestanden (Stand 04.11.2026, siehe docs/entwicklung.md).
