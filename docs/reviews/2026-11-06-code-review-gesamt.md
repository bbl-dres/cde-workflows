# Code-Review: gesamte Anwendung (vierte Fassung)

Stand: 6. November 2026 · Senior-Developer-Review nach Excel-Kreislauf, Einheiten nach eBKP-H und den Planlieferungen nach
Design vom 06.11.2026. Gesucht wurden Bugs, Fehler und Inkonsistenzen. Frühere Fassungen: `2026-11-05-code-review-gesamt.md`
(deren offene Punkte P13, P16, P18, P19, U9, U13, U14, B9, B19 bleiben offen und sind hier nicht wiederholt).

Status: **behoben** = im Code umgesetzt und getestet · **offen** = bewusst nicht umgesetzt (mit Begründung)

## 1. Vorgehen

Drei Review-Agenten haben den Code lesend und unabhängig geprüft und jeden Befund, wo möglich, mit einem Skript gegen die
echten Module oder im Headless-Browser reproduziert: Modell, Zustand, Aktionen (25 Befunde), Planprüfung (21), Oberfläche,
CSS, Texte (24). Eigene Prüfungen: Crawl über alle 688 Routen in zwei Rollen (keine Ausnahme, kein Konsolenfehler, keine
leere Seite, kein «undefined» oder «NaN»), Renderzeit des View-Modells (2.7 ms). Jeder Befund wurde vor der Umsetzung gegen
den Code geprüft. Die behobenen Punkte haben Unit-Tests (`tests/model.test.mjs`, `tests/actions.test.mjs`) oder Checks im
Browser-Test (`tests/e2e.mjs`). Nicht geprüft: eine echte .xlsx durch SheetJS in den Unit-Tests (nur im Browser-Test).

## 2. Befunde und Umsetzung

### Hoch

| Nr. | Befund | Status |
|---|---|---|
| H1 | Ein Klick auf eine Zeile der Übersicht (`formOpenGroup`) schaltete eine zusammengefasste Hauptgruppe auf «aufgeschlüsselt», auch in gesperrten Formularen: Beträge und Totale änderten sich, auf offenen Formularen ging der getippte Betrag verloren. Jetzt wird nur navigiert; nur die Ökobilanz klappt die Gruppe auf | behoben |
| H2 | Der erste Klick nach einer Eingabe ging verloren: das `change` löste ein Rendern vor dem Loslassen aus, das gedrückte Element wurde ersetzt, der Browser sendete kein `click`. Es wird nicht mehr gerendert, solange die Maustaste unten ist; das Rendern folgt dem Loslassen | behoben |
| H3 | Die Planprüfung blieb bei einem Polygon ohne Ausdehnung in einer Richtung (Linie hin und zurück, auf Höhe 0 zusammengefallenes Rechteck) in einer Endlosschleife (`visualCenter`, Zellgrösse 0): Seite eingefroren. Jetzt die Mitte der Box | behoben |

### Mittel

| Nr. | Befund | Status |
|---|---|---|
| M1 | Excel-Import: fehlt eine Spalte der Datei, wurde sie nach Position aus einer anderen gelesen (Menge aus «Kosten CHF»). Eine fehlende Spalte ist jetzt leer | behoben |
| M2 | Excel-Import: leere Kennzeichen-Zellen (Hersteller, Projektwert) löschten die Kennzeichen, die unveränderte «Leere Vorlage» änderte das Formular. Leer heisst «keine Angabe», «-» löscht | behoben |
| M3 | Doppelte Codes in einer Datei legten zwei gleiche Kostenelemente an und zählten Werte doppelt. Die letzte Zeile gilt, die frühere ist «Ignoriert» | behoben |
| M4 | Ein entferntes Kostenelement kam mit der Katalog-Einheit zurück (Menge ging verloren) und mit altem Kennwert. Jetzt Einheit der Zeile, ohne früheren Inhalt | behoben |
| M5 | Zustand des Import-Dialogs überlebte das Schliessen: veraltetes «Import zurücksetzen» machte spätere Eingaben rückgängig, Datei und Modus gingen in andere Projekte über, per Studienlink sprang «Weiter» ins Ergebnis. Der Dialog startet jedes Mal frisch, die Datei gehört zu Formular und Projekt, ein zweiter Klick überschreibt das Ergebnis nicht | behoben |
| M6 | Ein Import ohne Änderungen meldete Erfolg. «Übernehmen» ist deaktiviert, die Schaltfläche sagt «Keine Änderungen» | behoben |
| M7 | Getippter Text wurde bei einem Routenwechsel (Zurück) in das Projekt der neuen Route geschrieben. Das Feld wird für das Projekt der angezeigten Seite übernommen, bevor die neue Seite rendert | behoben |
| M8 | Die Fehlerseite lag unter dem Ladeindikator, der Knopf war nicht klickbar; ein Deep Link mit Zustands-Overrides liess den Reset erneut scheitern | behoben |
| M9 | Gesperrte Erfassung: die Leiste lag unter dem Schleier (Link nicht klickbar, Text ausgegraut) | behoben |
| M10 | Prüfbericht (PDF) ignorierte die Nutzungsart: HNF 517 statt 368.9, DIN 277 leer, Kennzahlen widersprachen der Anwendung. Er nutzt jetzt dieselben Zahlen, den Dateinamen der Lieferung und das Datum der Prüfung | behoben |
| M11 | «Raumpolygone mit eindeutiger AOID» las immer «n von n» (fehlende oder doppelte AOID wurden mitgezählt); KPI und Übergabe ebenso | behoben |
| M12 | Ein doppelt gezeichnetes Geschosspolygon verdoppelte GF, KF und EBF | behoben |
| M13 | Eine fehlgeschlagene Prüfung einer gleichnamigen Datei zerstörte die Zeichnung des gültigen Ergebnisses | behoben |
| M14 | Ein Raum mit R_AOID-Text «toString» oder «constructor» brachte jede Seite zum Absturz (`usage[aoid]` auf dem Prototyp) | behoben |
| M15 | Tooltips deaktivierter Schaltflächen erschienen nie (`pointer-events: none`) | behoben |
| M16 | Suchfeld oben bei 640–767 px: Schriftgrösse 0, getippter Text unsichtbar | behoben |
| M17 | Foto-Fehler im Dialog-Fokus: nach «Weiter» und «Übernehmen» lag der Fokus auf `body`, der Skip-Link war im Dialog erreichbar, nach dem Schliessen ging der Fokus nicht zu «Importieren» | behoben |

### Niedrig und kosmetisch (behoben, Auswahl)

- **Rollen:** «An Ziel übertragen» (KV, KS, THG, Plan) und der Kommentar der Prüfung nur noch für BBL-Personen und im passenden Schritt.
- **Erfassung beginnen:** Es gab keinen Übergang von «Offen» zu «In Bearbeitung». Die erste Eingabe oder der erste Import startet die Erfassung (Ereignis «Erfassung begonnen»); ein leeres Formular zeigt «Noch keine Werte erfasst» statt «1 von 55».
- **Nur fehlende Werte** blieb nach dem Einreichen aktiv (leere gesperrte Tabelle); wirkt nur noch auf offene Formulare.
- **Photovoltaik:** Eigenverbrauch wird auf 0–100 % geprüft und auf den Strombedarf begrenzt, die Felder werden nur bei vorhandener Anlage verlangt, die Anlage wird auch ohne feste ID gefunden.
- **Anteile summieren sich auf 100 %** (Hauptgruppen, Energiedienstleistungen, Ring, Übersicht der Pläne); Übersicht der Pläne mit einer Dezimalstelle wie die Kennzahlen.
- **Ökobilanz:** Anteile der Energieträger «100 % · erfüllt» trotz fehlendem Anteil; Vollständigkeit 100 % ohne Emissionsquelle; Δ «−100 %» auf leeren Formularen; Tool-Export-Meldung nennt übernommene und ergänzte Werte.
- **Planlieferungen:** Verlauf und Datumsangaben einer zweiten Runde (Ereignisse je Plan im Zustand), «Entfernen» nur für eigene Uploads und ohne Verlust der Zurückweisung, Suche und Filter gehören zum Plan, Layer-Zustand beim Wechsel zu Kennzahlen, Hover-Koordinaten nach dem Scrollen, PDF komprimiert (6–12 MB auf wenige hundert KB), Prüfbericht wartet auf eine ladende Zeichnung, Warnungen und Fehler der Kategorien als «Regeln» beschriftet, Geschossfläche nur noch nach Text auf der eigenen Ebene benannt.
- **Oberfläche:** Pflichtangabe unter den Prüfpunkten auch für Screenreader, Fokus auf neue Zeilen, Fokus nach Codewechsel, Namen für Spalten-Checkboxen und Felder neuer Zeilen, `role="radiogroup"` im Importdialog, tote Schaltflächen (`filterBtn`, «+ Eintrag hinzufügen») mit «Im Prototyp ohne Funktion», Import-Dialog auf dem Handy (Umbruch, Mindestbreite), Verlauf klassischer Lieferungen mit Stil, Studienleiste auf dem Handy, Touch-Flächen (40 px) und 16 px Schrift für weitere Felder, Texte ohne Gedankenstrich als Satzzeichen, Technischer Platz nicht doppelt.
- **Daten:** KS-31 des Musterprojekts summiert sich auf die Vorphase des KV-32; Beispieldatei des Imports skaliert mit dem Projekt und hat je Formular einen Namen; Benachrichtigung zum Fälligkeitsdatum des DG; «St» statt «Stk.» und Einheiten der Elementgruppen nach der Norm in der Ökobilanz; nicht genutzte Datenfelder, `js/model/nav.js` und zehn Icons entfernt.
- **Suche:** Pfeil nach oben aus dem Ausgangszustand wählt den letzten Treffer.
- **Deep Links** ersetzen keine Zustands-Scheibe mehr als Ganzes (`?ui=null`) und kennen nur vorhandene Personen.
- **Tests:** Leere Erwartungen (A–Z mit A01) ersetzt; `responsive-audit` und `refshots` schliessen den Browser.

## 3. Während des Reviews gewünschte Änderungen

- **Einheit der Emissionsquelle** (Ökobilanz Erstellung) ist eine Auswahl wie bei den Kosten (m², m³, m, St, kg, t, tkm, kW, kWp, m² EBF), im Excel les- und änderbar.
- **«Bezugsmengen aus den Grundrissen übernehmen»** (zuvor ohne Funktion) füllt fehlende Mengen, deren Bezugsgrösse der Norm eine Grösse der Grundrisse ist (GF, GSF, EBF, NF, BUF, FAW, FB).
- **Energiebezugsfläche EBF (SIA 380/1) als Pflichtangabe jedes Grundrisses**: eigene Kachel, eigener Block (nicht unter SIA 416), Prüfpunkt, Teil der Übergabe, Bedingung zum Einreichen. Hergeleitet nach einem Entscheidungsbaum aus der Flächenart der Räume (`data/plans.json › ebf`); EBF-Polygone im Plan sind der richtige Weg, aber noch nicht vorgesehen.

## 4. Offen

- **Annahmen des Entscheidungsbaums** (welche Flächenarten zählen, Anteil der Konstruktionsfläche): Setzung des Prototyps, mit dem BBL abzustimmen; die Zuordnung steht in `data/plans.json`.
- **Flächenarten der Räume** kommen weiter aus `data/plans.json › usage` (Stand-in der Raumtabelle CAD.A01).
- Offene Punkte der Fassung vom 05.11. (siehe oben).
- Hinweise ohne Umsetzung: Werte aus einer Excel-Datei sind gerundet wie getippte; einzelne Studienseiten (`js/views/home.js` u. a.) wurden nicht neu gestaltet; Gedankenstriche und Du-Form der Texte von der CDE Bund (`dashboard.js`, `settings.js`) bleiben, weil sie deren Wortlaut abbilden.
