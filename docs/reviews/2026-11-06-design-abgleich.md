# Abgleich mit dem Design vom 06.11.2026

Quelle: `docs/wireframes/261106_CDE-Workflows Datenformular Design.zip` (Komponente `Datenformular.dc.html`, Beschreibungen
je Bildschirm in `Datenformulare Screens.dc.html`) und die mitgelieferte Aufgabenbeschreibung. Verglichen wurde mit der
Fassung vom 05.11.2026 (letzter Stand, 14:31) und mit dem Prototyp nach den Rückmeldungen der Nutzenden vom 05.11.2026.

## 1. Unterschiede je Formular und Tab

| Formular · Tab | Design 06.11.2026 | Prototyp vorher | Umsetzung |
|---|---|---|---|
| alle · Tabs | keine Zahlen in den Tabs | schon so | – |
| alle · Karten | Hinweise und Einheiten im grauen Kartenfuss mit Linie | Fuss ohne Linie | Linie ergänzt |
| alle · Erfassung gesperrt | graue Fläche über der Tabelle mit weisser Box (Schloss, «Gesperrt», Grund), Leiste am Fuss bleibt, «Importieren» deaktiviert mit Tooltip | graues Band mit Schloss, Werte als Text, Leiste entfernt | umgesetzt nach Entscheid vom 05.11.2026: die Werte werden in der Übersicht oder im Excel gelesen, nicht in der gesperrten Erfassung |
| KV-32, THG-32 · Übersicht | neutrale Diagramme, keine Farben für Abweichungen | schon so | – |
| THG-32 · Betrieb | Photovoltaik in «Grundlagen», «Projektwert», Endenergie und Faktor überschreibbar | schon so | – |
| DWG · Übersicht | «Flächen SIA 416» als Tabelle GF, KF, NGF, VF, FF, NF, HNF, NNF (m², % GF) mit Fuss | neun Zeilen samt EBF, andere Reihenfolge | umgesetzt (EBF steht in den Kennzahlen) |
| DWG · Übersicht | «Prüfregeln nach Kategorie» als Balkenliste: Anteil bestanden, Bestanden, Warnungen, Fehler, Total, Fuss, «Zur Erfassung» | gestapelter Balken grün/gelb/rot mit Legende | umgesetzt |
| DWG · Übersicht | rechts nach «Lieferung» die Karte «Prüfbericht» | nicht vorhanden | umgesetzt |
| DWG · Erfassung, Kopf | «Prüfbericht herunterladen», «Neu hochladen», «CAD-Richtlinie ▾» (PDF, Musterplan DWG zum Herunterladen), «Entfernen»; kein «Musterplan laden» | «Prüfbericht», «Neu hochladen», «Musterplan laden», «Entfernen» | umgesetzt |
| DWG · Erfassung, Unter-Tabs | Prüfregeln, Fehlermeldungen, Layer, Räume, Flächen, Kennzahlen; ohne Zahlen | Räume, Geschossflächen, Layer; mit Zahlen | umgesetzt |
| DWG · Erfassung, Listen | Überschriften «Räume», «Geschossflächen»; Sichtbarkeit je Zeile und «alle»; Statussymbole | «Räume · AOID», «Geschossflächen · GF»; Rest schon so | Überschriften angepasst |
| DWG · Erfassung, Viewer | Werkzeugleiste senkrecht oben rechts, Gesamtansicht mit Haus-Symbol | waagrecht, anderes Symbol | umgesetzt |
| DWG · Erfassung, Kennzahlen | links «Flächen SIA 416» und «Flächen DIN 277», rechts «Flächenkennzahlen» und Ring «Anteile SIA 416» mit Beschriftung je Segment; ohne «Gebäudevolumen» und «Objektübersicht» | zwei Spalten mit Gebäudevolumen, Ring mit Legende, Objektübersicht | umgesetzt |

## 2. Bewusst nicht übernommen

Diese Punkte der Aufgabenbeschreibung widersprechen späteren Rückmeldungen der Nutzenden oder dem Design selbst:

- **Farben und bedingte Formatierung**: Rot und Grün für Δ, die rot markierte Zusatzanforderung, die grüne PV-Gutschrift und
  der Balken unter «Vollständigkeit» bleiben weg (Rückmeldungen vom 05.11.2026: keine Wertung durch Farbe).
- **Prüfung**: Die Aufzählung von neun Prüfpunkten der Ökobilanz und der Vergleich mit KS-31 samt Subtotalen stammen aus
  einer früheren Fassung; es gilt die «Zusammenfassung» mit sieben bzw. fünf Zeilen.
- **«Standard»-Kästchen im Betrieb**: heisst «Projektwert» (angekreuzt = Abweichung vom Standard).
- **Musterplan**: Der Knopf im Kartenkopf ist weg. Die leere Ablagefläche behält «Musterplan prüfen (Prototyp)», damit sich
  die Planprüfung ohne eigene Datei zeigen lässt; der Entwurf zeigt diesen Zustand nicht.

## 3. Offene Annahmen

- **Richtwerte SIA 390/1**: Betrieb und Zusatzanforderung sind nur für Wohnen und Restaurant belegt; die Werte für
  Verwaltung, Schule und Verkauf sind Annahmen und im Fuss der Zielwerte so bezeichnet.
- **Stromprodukt**: Wasserkraft mit 0.012 kg CO₂-eq/kWh ist eine Annahme (CH-Verbrauchermix 0.125).
- **Nutzungsart der Räume**: Nach der CAD-Richtlinie (Kap. 5.10, 5.11) steht sie in der Raumtabelle (Anhang CAD.A01), nicht im
  Raumstempel, wie der Entwurf schreibt; der Fuss der Kennzahlen nennt darum die Raumtabelle. Der Prototyp liest sie noch
  nicht: `data/plans.json` › `usage`
  ordnet den 30 Räumen des Musterplans eine DIN-277-Gruppe zu; daraus folgen HNF 368.9, NNF 40.9, VF 90.0 und FF 17.3 m²
  (NGF 517.1, GF 572.3 m² aus der Datei). Die Zahlen des Entwurfs (HNF 386.42, NNF 41.30, VF 72.18, FF 17.16 m²) sind
  frei gesetzt und mit den echten Raumflächen nicht genau erreichbar. Hochgeladene Pläne ohne Eintrag zählen zur HNF.
- **CAD-Richtlinie als PDF**: liegt seit dem 05.11.2026 unter `assets/plans/` (Version 1.0, Stand 01.01.2026) und öffnet aus dem
  Menü; die Anhänge stehen unter `docs/reference/cad-richtlinie/`. Der Musterplan des Archivs ist etwas neuer als der des
  Prototyps (5 statt 3 Warnungen, NGF 517.05 statt 517.06 m²); ein Wechsel hiesse Seeds und Tests neu erzeugen.
- **Prüfbericht (PDF)**: enthält weiterhin «Gebäudevolumen» und «Objektübersicht»; der Entwurf betrifft nur den Unter-Tab.

## 4. Tests

- `tests/model.test.mjs`: neuer Test zu Nutzungsarten (`withUsage`), DIN 277, Flächenkennzahlen und Ring (`donutOf`,
  Abstand der Beschriftungen), Reihenfolge der Flächentabellen, Total der Kategorien; Zähler der Unter-Tabs entfernt.
- `tests/e2e.mjs`: Übersicht des Plans, Kartenkopf mit Menü «CAD-Richtlinie», Reihenfolge der Unter-Tabs, senkrechte
  Werkzeugleiste, Kennzahlen mit Ring.
- `node --test`: 35 Tests · `node tests/e2e.mjs`: 279 Checks bestanden (Edge headless).
