# Ökobilanz-Eingabemaske: Was die BBL-Beispiele zeigen – Erstellung, Gebäudetechnik und Betrieb

**Stand:** 5. November 2026
**Kontext:** Prototyp CDE Bund (BBL), Datenformular «THG-32 · Ökobilanz Bauemissionen (SIA 32)». Die Maske erfasst heute die
Emissionsquellen der **Erstellung** je eBKP-H-Elementgruppe (Datenmodell nach
[2026-11-04-oekobilanz-bauemissionen-sia32.md](2026-11-04-oekobilanz-bauemissionen-sia32.md), Grundlagen nach
[2026-11-04-oekobilanzdaten-systemgrenzen.md](2026-11-04-oekobilanzdaten-systemgrenzen.md) und
[2026-11-04-projektart-bauvorhaben.md](2026-11-04-projektart-bauvorhaben.md)). Das Feedback der Anwender: Die Maske ist gut,
aber die Realität ist komplizierter, weil neben den Bauteilen auch der **Betrieb** (Heizung, Kälte, Lüftung, Strom usw.)
bilanziert wird.
**Grundlage:** zwei vom BBL erhaltene Ökobilanz-Berichte realer Projekte (Posieux und Tenero, lokal unter
`docs/reference/beispiele/`, nicht im Repository), die Bilanzierungsregeln der Plattform Ökobilanzdaten v9.0 und die
ASTRA-Dokumentation 8B001 (beide lokal unter `docs/reference/sources/`). Alle vier PDFs sind mit docling nach Markdown
konvertiert.
**Zweck:** Die Beispiele auswerten und Empfehlungen für die Eingabemaske formulieren. Keine Umsetzung.
**Abgrenzung:** Die CDE rechnet keine Ökobilanz; sie nimmt die Ergebnisse der Tools entgegen, prüft sie auf
Vollständigkeit und Plausibilität und gibt sie an das Reporting (Modell ecCo) weiter. Projektwerte der Beispiele sind
reale Werte der jeweiligen Berichte, keine Prototyp-Daten.

---

## 1. Ergebnis in Kürze

- **Beide Berichte bilanzieren nach SIA 390/1 die Bereiche Erstellung und Betrieb, die Maske nur die Erstellung.** Das
  BBL-Pflichtenheft «Bilanzierung der Treibhausgasemissionen» (25.04.2025, im Bericht Posieux zitiert) verlangt beide
  Bereiche; Mobilität bleibt aussen vor. Der Betrieb wird mit der Rechenhilfe SIA 390/1 je Energiedienstleistung
  (Raumwärme, Warmwasser, Raumkälte, Hilfsenergie, Lüftung, Beleuchtung, Geräte, Prozessanlagen, Aufzüge) und je
  Energieträger erfasst, dazu eine Strombilanz mit PV-Ertrag, Eigenverbrauch, Export und Netzbezug. Dieser Teil fehlt in der
  Maske vollständig (Abschnitt 4.2).
- **Gebäudetechnik und Photovoltaik sind der zweitgrösste Posten der Erstellung** (22 % in Posieux, 28 % in Tenero; die
  Lüftung allein 9 % der Erstellung in Posieux, die PV 11 % in Tenero). Die Tools führen sie nicht nach eBKP-H-Elementen,
  sondern als KBOB-Gebäudetechnik-Datensätze mit eigenen Bezugsgrössen (m² EBF, kWp, m² Kollektorfläche, W/m² Leistung,
  m Sondenlänge). Die PV-Anlage steht in beiden Bereichen: Herstellung in der Erstellung, Ertrag als Gutschrift im Betrieb
  (Abschnitt 4.3).
- **Die Tools arbeiten mit Bauteiltypen, nicht mit eBKP-H-Codes.** Lesosai liefert Zeilen wie «Wa01», «Be01», «Gd01» mit
  Fläche, THGE und Anteil; die Zuordnung zu eBKP-H macht die Planerin. Beide Berichte zeigen die sieben grössten
  Treiber mit ihrem Anteil. Die Maske braucht deshalb eine optionale Bauteilebene mit Zuordnung und eine Anteil-Spalte
  (Abschnitt 4.4).
- **Die Einordnung braucht drei Richtwerte je Gebäudekategorie, nicht einen.** SIA 390/1 kennt Richtwerte für
  Erstellung und Betrieb sowie die Zusatzanforderung (Summe), je Basis (B) und ambitioniert (A), und nur für Wohnen,
  Verwaltung, Schule, Verkauf und Restaurant. Posieux wird als Restaurant eingeordnet, Tenero (Unterkunft) gegen die
  Zusatzanforderung Wohnen. Die Maske prüft heute nur die Erstellung gegen den konstanten Basiswert 9.0 (Abschnitt 4.5).
- **Grundlagen und Versionen weichen ab:** beide Berichte (2025/2026) rechnen mit der KBOB-Liste «2009/1:2022,
  Version 7.0», die Maske gibt 9.0 vor. Stromqualität (100 % Wasserkraft gemäss Pflichtenheft), Umgang mit PV-Überschuss
  (zurückgeliefert vs. «Sub-Bilanzgruppe Bund»), Standardwerte der Rechenhilfe und der Datenstand (Pläne-Datum,
  Phase 53, Revisionsdokumente) bestimmen das Ergebnis und gehören als Kopfdaten in die Maske (Abschnitt 4.6).
- **Optimierung ist ein eigener Bericht-Typ.** Tenero liefert Varianten (Basis, konservativ, progressiv) mit
  Reduktionsfaktoren je Bauteil, eine PV-Auslegung (Eigenverbrauch, Autarkie, Modul D) und Mehrkosten je Tonne. Das
  gehört als optionaler Teil für frühe Phasen in die Maske, nicht in den Pflichtnachweis (Abschnitt 4.7).
- **ASTRA 8B001 hat einen anderen Fokus** (Nationalstrassen) und dient nur als Methodenreferenz: Modulstruktur
  SN EN 15643-5, Betrachtungszeitraum, Genauigkeit je Projektphase, zentrale Sammlung von Projektbeispielen beim
  Bauherrn (Abschnitt 6).

---

## 2. Die Beispiele

### 2.1 Posieux: Ökobilanzierung Neubau Restaurations- und Konferenzgebäude Agroscope (Gartenmann Engineering AG, 11.08.2025)

| Merkmal | Inhalt des Berichts |
|---|---|
| Auftrag | «Bilanzierung der Treibhausgasemissionen über den gesamten Lebenszyklus für die Bereiche Erstellung und Betrieb» für den bereits realisierten Neubau |
| Grundlagen (Kapitel 1.1) | Pflichtenheft Bilanzierung THG, BBL, 25.04.2025; Grundrisse, Ansichten, Schnitte (Stand 27.03.2025); SIA 2032:2020; SIA 2040:2017 (archiviert); SIA 390/1:2025; KBOB-Liste 2009/1:2022, Version 7.0; Systemnachweis (2021); Energiedossier HLKSE (2021); Lesosai 2025; Netto-Null-Ziel, Klimastrategie 2050, KIG |
| Erstellung (Kapitel 2) | Software Lesosai, Bauteile und Flächen aus den Plänen (Flächenauszug als Beilage), Gebäudetechnik aus dem Energiedossier. Tabelle mit Referenzgrösse, Einheit, THGE in kg CO₂/m² EBF·a und Anteil: Aushub (m³, tkm), 46 Bauteilzeilen (Wa, We, Da, Be, Fa, Oa, St, Wi, Ba, Dr, Du, Gd in m²), Gebäudetechnik (Wärmeerzeuger in W/m², Wärmeverteilung, Wärmeabgabe, Sanitär, Elektro und Lüftung je m² EBF, Flachkollektor in m², PV in kWp) |
| Betrieb (Kapitel 3) | Grundlage Bauabschluss- und Revisionsdokumente HLKSE; Strom 100 % Wasserkraft gemäss Pflichtenheft; Fernwärme < 25 % fossil; Lüftung effektiv (Messwert); Klimakälte nur Multimedia und Serverraum; gewerbliche Kälte und Beleuchtung/Geräte mit Standardwerten der Rechenhilfe SIA 390/1; Warmwasser 60 % Fernwärme, 40 % Solar, Bedarf Standardwert; PV-Ertrag als Gutschrift; Elektroinstallation: KBOB kennt nur Büro und Wohnen, Büro gewählt. Rechenhilfe-Tabelle: Zonen 1–4, Nutzenergie effektiv/Standard, Energieträger, Anteil, η bzw. ε, Endenergie, PEF, Primärenergie, THGK, THG |
| Einordnung (Kapitel 4) | SIA 390/1 Richtwerte Restaurant B/A für Erstellung, Betrieb, Zusatzanforderung; Minergie-ECO Grenzwerte objektspezifisch (GW1 9.88, GW2 15.31); Netto-Null-Ziel und KIG-Zwischenziele; Absenkpfad; Ursachen des hohen Erstellungswerts (Lüftung, Betonmenge, Dämmstoffe, Hüllzahl > 2, Deckenkonstruktion, Glasanteil); sieben relevante Bauteile = 63.4 % der Erstellung |
| Beilagen | Bilanz-Ausdruck Lesosai inkl. Bauteile, Flächenauszug der Bauteile, Rechenhilfe-Tabelle Betrieb |

| Projektwert Posieux (kg CO₂/m² EBF·a) | Erstellung | Betrieb | Summe | Richtwert B Restaurant | Richtwert A Restaurant |
|---|---|---|---|---|---|
| Bericht | 19.10 | −2.76 | 16.3 | 9 / 7 / 16 | 6 / 5 / 11 |

Anteile der Erstellung: Gebäude 78 %, Gebäudetechnik 22 %; innerhalb der Gebäudetechnik Lüftung 41.6 %, PV 27.7 %, Wärme
14.0 %, Elektro 10.5 %, Sanitär 3.8 %. Der negative Betriebswert entsteht aus Wasserkraft, emissionsarmer Fernwärme und der
Gutschrift des PV-Exports.

### 2.2 Tenero: Ökobilanzierung und Optimierungspotenzial Neubau Unterkunftsgebäude Dono Nazionale (WaltGalmarini AG, 03.10.2025, Index 05.03.2026)

| Merkmal | Inhalt des Berichts |
|---|---|
| Objekt | Fünfgeschossiges Unterkunftsgebäude (56 Zimmer, 140 Betten), kein UG (Grundwasser), Beton/Mauerwerk, Betonfertigteile für Laubengänge und Balkone, Holz-Metall-Fenster, Aluminiumfassade, PV 30 kWp, Minergie-zertifiziert, nach eco-bau geplant, in Betrieb seit Juli 2024. PV: Herkunftsnachweise nicht verkauft, Eigenverbrauch 100 %, Überschuss in die «Sub-Bilanzgruppe Bund» |
| Grundlagen (Kapitel 2, 3) | Pläne und Materialkonzept des Architekten (Liste); SIA 390/1:2025, SIA 2032:2020, KBOB-Liste 2009/1:2022, Version 7.0 |
| Methode (Kapitel 4) | Herstellung, Aufbereitung, Transporte, Entsorgung nach SIA 2032 bzw. Systemgrenze Erstellung nach SIA 390/1 («A1–A3 inkl. Entsorgung»); Amortisation 60 Jahre Tragstruktur, 40 aussen liegende Konstruktionen und Fassade, 30 Fenster/Türen, Bekleidungen, Elektro/HLKS, PV, Flachdach, Ausbau, 20 Wärmeerzeugung; Rechenweg E = Menge × EF / Lebensdauer, Gebäudeindikator = Σ E / EBF; Szenarien mit Reduktionsfaktor r je Massnahme |
| Ergebnis (Kapitel 1.2) | Haupttreiber: Geschossdecken 14.5 %, PV 11.2 %, Fenster 9.4 %, Balkone 8.5 %, KS-Innenwände 7.4 %, Trennwände/Türen 6.5 %, Dach 5.9 %; technische Anlagen 28 % («in der Schweiz typischerweise 30–50 %»), Materialien und Bauphase 53 %; Fensterfläche 594 m² = 31 % der Hüllfläche |
| Optimierung (Kapitel 4.3) | Varianten konservativ (ND-Beton, Gitterroste, Lehm-Trennwände, Fenster −15 %) und progressiv (CEM III/B, ReUse-Gitterroste, Stützenraster, Fenster −30 %) mit Reduktionsfaktoren je Bauteil (z. B. Beton 0.65/0.45, Balkone 0.50/0.40, Trennwände 0.33); Elektro, HLKS, Sanitär und PV bewusst nicht optimiert |
| Risiken (Kapitel 4.4) | Datenstand: Projektabschluss- und Materialdokumentation Phase 53; Lebensdauern beeinflussen nur die Jahreswerte; Verfügbarkeit von ReUse-Bauteilen |
| Schlussfolgerungen (Kapitel 5) | Anforderungen für Architekturwettbewerbe (Tragwerk, Fassade, Dämmung, Haustechnik-Minimalprinzip, PV, Materialreduktion, ReUse, LCA-Nachweise, Jury-Gewichtung); PV-Auslegung mit Eigenverbrauchsanteil, Autarkiegrad, Emissionsfaktoren Netz/Export, Modul-D-Gutschrift; Lastverschiebung; Mehrkosten je t CO₂-eq nach Materialersatz |

| Projektwert Tenero (kg CO₂-eq/m²·a) | Basis | konservativ | progressiv | Referenzwert SIA 390/1 (Wohnen, Zusatzanforderung B / A) |
|---|---|---|---|---|
| «Erstellung + Betrieb» | 12.23 | 8.87 | 7.98 | 11.0 / 7.0 |
| ohne PV-Anlage | 10.86 | – | – | – |
| mit Modul-D-Gutschrift des PV-Exports | ≈ 10.9 | – | – | – |

Beobachtung: Der Bericht nennt die 12.23 «Erstellung + Betrieb», beschreibt sie aber als Emissionen der Erstellungsphase
(Herstellung, Transport, Montage) und führt den Betrieb nur über die PV-Gutschrift. Die Begriffe der SIA 390/1 (Bereich
Erstellung, Bereich Betrieb, Zusatzanforderung) werden also nicht einheitlich verwendet. Eine Maske mit getrennten Feldern
für die beiden Bereiche erzwingt die Trennung.

### 2.3 Gemeinsame Struktur der Berichte

| Baustein | Posieux | Tenero | Heute in der Maske |
|---|---|---|---|
| Grundlagenliste (Pflichtenheft, Pläne mit Datum, Normen, KBOB-Version, Energiedossier, Tool) | ja | ja | Systemgrenze, Ökobilanzdaten, Tool, Datenqualität |
| Erstellung je Bauteil mit Fläche, THGE und Anteil | ja (Lesosai) | ja (Bauteilgruppen) | je eBKP-H-Elementgruppe mit KBOB-Datensatz, Menge, THG Herstellung/Entsorgung, Amortisation |
| Gebäudetechnik je Anlage (Bezug m² EBF, kWp, m², W/m²) | ja | ja (28 %) | als Elementgruppe D, Bezug m² EBF |
| PV in Erstellung und Betrieb | ja | ja (Auslegung) | nur Erstellung möglich |
| Betrieb je Energiedienstleistung und Energieträger | ja (Rechenhilfe SIA 390/1) | nur PV-Gutschrift | fehlt |
| Strombilanz (Bedarf, PV-Ertrag, Eigenverbrauch, Export, Netzprodukt) | ja | ja | fehlt |
| Einordnung gegen Richtwerte je Nutzung (Erstellung, Betrieb, Zusatzanforderung) | ja | ja (Zusatzanforderung Wohnen) | nur Erstellung gegen 9.0 |
| Minergie-ECO Grenzwerte objektspezifisch | ja | – | GW1 8.0 konstant |
| Absenkpfad Netto-Null, Zieljahr | ja | – | fehlt |
| Haupttreiber (Top 7 mit Anteil) | ja | ja | fehlt |
| Varianten und Massnahmen mit Reduktionsfaktoren | – | ja | fehlt |
| Risiken, Datenstand, Standardwerte | implizit | ja | Datenqualität (3 Stufen) |
| Beilagen: Tool-Ausdruck, Flächenauszug, Rechenhilfe | ja | Pläne | Bericht PDF, Tool-Export XLSX |

---

## 3. Was die Bilanzierungsregeln v9.0 und ASTRA 8B001 beitragen

- **Bilanzierungsregeln v9.0 (Plattform Ökobilanzdaten im Baubereich, 01.09.2026):** Die KBOB/ecobau-Liste enthält
  Durchschnittsdaten mit fünfstelligen und herstellerspezifische Daten mit siebenstelligen ID-Nummern; Indikatoren der
  Listen 2022 und 2027 sind Primärenergie (erneuerbar, nicht erneuerbar, gesamt), Treibhausgasemissionen (IPCC 2013 bzw.
  2021), UBP 2021 und biogener Kohlenstoff in kg C; ab der Liste 2027 zusätzlich die Indikatoren der newCPR (EF 3.1),
  Treibhausgase getrennt nach fossil, biogen und Landnutzung sowie Rezyklatanteil und Anteil ins Recycling für
  Zirkularitätsindizes; Modul D nach SN EN 15804+A2. Für die Maske: die Listenversion ist Teil des Datensatzes (die
  Kennwerte ändern mit jeder Version), die ID-Nummer muss fünf- oder siebenstellig sein, und ab 2027 kommen Spalten dazu.
- **ASTRA 8B001 (Ausgabe 2025):** Lebenszyklus in drei Phasen nach SN EN 15643-5: Erstellung (A1–A5, ohne Planung A0),
  Nutzung (betrieblicher und kleiner baulicher Unterhalt B1, B2, B6, B7; Unterhalt B3–B5; Nutzung durch Verkehr B8
  ausgeschlossen), kompletter Rückbau (C1–C4). Betrachtungszeitraum = längste Nutzungsdauer der Objekte, Vergleich von
  Varianten über Jahreswerte. Genauigkeit der Vordergrunddaten aus der Kostenermittlung: ± 30 % bei Kostenschätzungen
  früher Phasen, ± 10 % bei Kostenvoranschlägen. Empfehlungen: mehrere Wirkungsmodelle (THG, UBP, kumulierter
  Energieaufwand) bei Entscheiden, Projektbeispiele zentral beim Bauherrn sammeln, BAFU-Datenbestand als
  Hintergrunddaten. Die Objekte (Fahrbahn, Kunstbauten, Tunnel, Betriebs- und Sicherheitsausrüstung) und die
  Standardwerte sind für den Hochbau nicht verwendbar.

---

## 4. Empfehlungen für die Eingabemaske

### 4.1 Zwei Bereiche in einer Lieferung

Die Lieferung bleibt eine, weil das Pflichtenheft beide Bereiche verlangt und die Zusatzanforderung der SIA 390/1 die
Summe prüft. Vorschlag für die Struktur der Erfassung:

| Teil | Inhalt | Pflicht | Datenherkunft |
|---|---|---|---|
| Erstellung | Emissionsquellen je eBKP-H-Elementgruppe (bestehend), optional Bauteilebene (4.4), Gebäudetechnik mit KBOB-Bezugsgrössen (4.3) | ja | Ökobilanztool (Lesosai, GREG, Thermo, Enerweb, One Click LCA), Export |
| Betrieb | Energiedienstleistungen je Energieträger und Strombilanz (4.2) | ja (Pflichtenheft) | Rechenhilfe SIA 390/1, Energienachweis SIA 380/1, Minergie-Nachweis, Energiedossier HLKSE, Messwerte |
| PV und Stromversorgung | eine Anlage mit Leistung, Herstellung (Erstellung) und Ertrag, Eigenverbrauch, Export (Betrieb) | wenn vorhanden | beide Teile |
| Optimierung | Varianten und Massnahmen (4.7) | nein, empfohlen in den Phasen 21–32 | Variantenstudie |

Titel und Vorlage: «Ökobilanz Erstellung und Betrieb (SIA 390/1)» statt «Ökobilanz Bauemissionen (SIA 32)»; der Code
THG-32 kann bleiben. Mobilität (SIA 390/1 Bereich 3) bleibt ausserhalb, wie im Pflichtenheft.

### 4.2 Teil Betrieb: Datenmodell

Zeilen = Energiedienstleistungen der Rechenhilfe SIA 390/1, Spalten wie in deren Tabelle, ergänzt um Quelle und Kennzeichnung
der Standardwerte:

| Spalte | Typ / Einheit | Pflicht | Bemerkung |
|---|---|---|---|
| Energiedienstleistung | Auswahl: Raumwärme, Warmwasser, Raumkälte (Klimakälte), gewerbliche Kälte, Hilfsenergie Heizung und Warmwasser, Lüftung, Beleuchtung, Geräte, Prozessanlagen, Aufzüge/Fahrtreppen (Stk.) | P | Reihenfolge der Rechenhilfe |
| Nutzenergiebedarf | kWh/m² EBF·a, bei Aufzügen Stk. | P | je Zone möglich (Rechenhilfe: bis vier Zonen); Prototyp: Gebäude gesamt |
| Wert ist | Auswahl: effektiv (Nachweis/Messung), Standardwert SIA 390/1 | P | Posieux nutzt Standardwerte für gewerbliche Kälte, Warmwasser, Beleuchtung, Geräte; Abweichungen vom Standard sind zu begründen |
| Energieträger / Erzeugung | KBOB-Energie-Datensatz (Gruppen 41 Brennstoffe, 42 Fernwärme, 43/44 Nutzwärme, 45 Strom vom Netz, 46 Strom am Standort), z. B. «Fernwärme < 25 % fossil», «therm. Solaranlage», «Wärmepumpe» | P | mehrere Zeilen je Dienstleistung mit Anteil (Warmwasser 60 % Fernwärme, 40 % Solar) |
| Anteil | % | P | Summe je Dienstleistung 100 % |
| Nutzungsgrad η bzw. Jahresarbeitszahl ε | Zahl | O | Rechenhilfe: Kältemaschine ε 5.0 |
| Endenergie | kWh/m² EBF·a | A | Nutzenergie × Anteil / η |
| Emissionsfaktor | kg CO₂-eq/kWh (KBOB, mit Listenversion) | P (aus Datensatz) | CH-Verbrauchermix 0.125, Fernwärme < 25 % fossil 0.049 (Rechenhilfe Posieux) |
| THG | kg CO₂-eq/m² EBF·a | A | Endenergie × Emissionsfaktor |
| Quelle | Auswahl + Dokumentverweis: Energienachweis SIA 380/1, Minergie-Nachweis, Energiedossier HLKSE, Revisionsdokumente, Messung Betriebsjahr | P | Posieux: Bauabschluss- und Revisionsdokumente |

Strombilanz als eigener Block (Werte je Jahr):

| Feld | Einheit | Bemerkung |
|---|---|---|
| Elektrizitätsbedarf total | kWh/a | Summe der Strom-Dienstleistungen |
| PV-Ertrag | kWh/a | aus Teil PV |
| Eigenverbrauchsanteil | % | Tenero: 100 % (Sub-Bilanzgruppe Bund), Rechenhilfe Posieux: 8 % zurückgeliefert |
| Export | kWh/a | abgeleitet |
| Bilanzregel Überschuss | Auswahl: Gutschrift Verbrauchermix, Gutschrift Lieferantenmix/HKN, Sub-Bilanzgruppe Bund (ausserhalb Systemgrenze, Modul D), keine Gutschrift | die beiden Berichte behandeln den Überschuss verschieden; das Ergebnis hängt stark davon ab |
| Netzbezug und Stromprodukt | kWh/a; Auswahl: CH-Verbrauchermix, Wasserkraft 100 % (BBL-Pflichtenheft), Liefervertrag naturemade star, Herkunftsnachweis | Posieux: 100 % Wasserkraft gemäss Pflichtenheft |
| Total Betrieb | kg CO₂-eq/m² EBF·a | kann negativ sein (Posieux −2.76); dann Hinweis auf Gutschriftregel |

### 4.3 Gebäudetechnik und Photovoltaik in der Erstellung

- Die Zeilen der Hauptgruppe D sollen die **Bezugsgrössen der KBOB-Gebäudetechnik-Datensätze** anbieten: m² EBF
  (Elektro, Sanitär, Wärmeverteilung, Wärmeabgabe, Lüftung mit spezifischer Luftmenge in m³/(h·m²)), W/m² (Wärmeerzeuger,
  spezifischer Leistungsbedarf), m Sondenlänge, m² Kollektorfläche, kWp (Solarstromanlage), Stk. und kg (Geräte). Heute
  ist nur m² EBF vorgesehen.
- Amortisation nach SIA 2032 Anhang C bleibt die Vorgabe (30 Jahre, Wärmeerzeugung 20); die Berichte halten sich daran.
- **PV als ein Objekt in beiden Bereichen:** Leistung kWp, Datensatz (KBOB 34.024 Marktmix oder herstellerspezifisch,
  Tenero: 43 statt 64 g CO₂-eq/kWh), Amortisation 30 Jahre, Ertrag kWh/a, Eigenverbrauchsanteil, Export, Bilanzregel;
  optional Degradation und Wechselrichterersatz (Tenero). Die Maske soll die Herstellung in der Erstellung und die
  Gutschrift im Betrieb aus denselben Eingaben ableiten; sonst entstehen Inkonsistenzen (PV in der Erstellung ohne Ertrag im
  Betrieb oder umgekehrt).
- **Anteil Gebäudetechnik** in der Übersicht ausweisen: Erfahrungswerte 20–30 % (Posieux) bzw. 30–50 % (Tenero,
  Literatur). Ein Anteil unter 15 % oder über 50 % ist ein Prüfhinweis.

### 4.4 Bauteilebene und Haupttreiber

- Optionale Ebene **Bauteil (Tool-Code)** unter der Elementgruppe: Code des Tools (Wa01, Be01, Gd01 …), Bezeichnung,
  Fläche oder Referenzgrösse, THGE pro Jahr, Anteil. Der Tool-Export (Lesosai XLSX) liefert genau diese Zeilen; die
  Zuordnung zur eBKP-H-Elementgruppe macht die Planerin beim Import oder in der Maske. Das deckt sich mit der bereits
  empfohlenen Funktion «Aufschlüsseln» (Vornotiz, Abschnitt 5.1).
- **Anteil-Spalte** (% der Erstellung) auf allen Ebenen und in der Übersicht eine Liste **Haupttreiber** (die sieben
  grössten Positionen mit Anteil und Summe), wie in beiden Berichten.
- Aushub als Zeilen mit m³ und tkm (Posieux: Aushub maschinell und Erdtransport), Bezug der Elementgruppe B06.

### 4.5 Einordnung: Gebäudekategorie, Richtwerte, Grenzwerte, Absenkpfad

| Feld | Vorschlag |
|---|---|
| Gebäudekategorie | Liste der SIA 390/1: Wohnen (MFH, EFH), Verwaltung, Schule, Verkauf, Restaurant. Für andere Nutzungen (Unterkunft, Spital, Sport, Labor) ein Feld «Vergleichskategorie SIA 390/1» mit Begründung; Tenero vergleicht die Unterkunft mit Wohnen. Die heutige Option «Sonstige» allein reicht nicht, weil kein Richtwert folgt. Demo: das Projekt Posieux ist im Prototyp «Sonstige», im realen Bericht «Restaurant» |
| Richtwerte | je Kategorie und Bauvorhaben drei Werte für Basis und ambitioniert: Erstellung, Betrieb, Zusatzanforderung (Restaurant 9/7/16 und 6/5/11; Wohnen Zusatzanforderung 11/7). Die Betriebs-Richtwerte der übrigen Kategorien sind in der Norm nachzuschlagen (nicht öffentlich belegt, siehe Vornotiz 3.3) |
| Minergie-ECO | GW1 und GW2 sind objektspezifisch (Zuschläge für PV, Kollektoren, Erdsonden, beheizt/unbeheizt). Als Eingabefelder mit Herkunft (Lesosai oder Minergie-Berechnungsmethodik), nicht als Konstante 8.0 |
| Absenkpfad | Zieljahr (Einreichung oder Bezug) und der daraus folgende Zielwert nach SIA 390/1 Figur 6; Posieux ordnet den Projektwert so ein |
| Zielwert-Grafik | drei Vergleiche statt einem: Erstellung vs. Richtwert Erstellung, Betrieb vs. Richtwert Betrieb, Summe vs. Zusatzanforderung; Vorphase SIA 31 bleibt |

### 4.6 Kopfdaten und Grundlagen

Ergänzungen zu Gebäudekategorie, Bauvorhaben, EBF, GF, Systemgrenze, Ökobilanzdaten, Tool und Datenqualität:

| Feld | Vorschlag | Beleg |
|---|---|---|
| Pflichtenheft | «Pflichtenheft Bilanzierung der Treibhausgasemissionen, BBL» mit Datum, als Vorlage der Lieferung verlinkt | Posieux [1] |
| Datenstand | Phase 31/32/41/51–53/Betrieb (gemessen) und Datum des Planstands; Mengengerüst aus Plänen, KV, BIM, Projektabschlussdokumentation | Posieux Pläne 27.03.2025; Tenero Phase 53; ASTRA ± 30 % / ± 10 % |
| Ökobilanzdaten | Version 7.0 in die Liste aufnehmen (beide Berichte); automatische Prüfung «Listenversion zum Berichtsdatum aktuell» als Warnung, nicht als Sperre | KBOB 9.0 seit 14.07.2026 |
| Tool | zusätzlich «Rechenhilfe SIA 390/1 (Excel)» für den Betrieb, Tool und Version je Teil | Posieux |
| Stromprodukt | siehe Strombilanz 4.2; Vorgabe aus dem Pflichtenheft (100 % Wasserkraft) | Posieux |
| Fernwärme | fossiler Anteil (GEAK-Klasse) | Posieux |
| Standardwerte | Liste der Dienstleistungen mit Standardwert und Begründung | Rechenhilfe: Abweichungen begründen |
| Bilanzperimeter PV | innerhalb/ausserhalb, HKN verkauft ja/nein | Tenero |

### 4.7 Optimierung und Varianten (optional)

- Spalten **Variante** (Basis, konservativ, progressiv) auf Bauteil- oder Elementgruppenebene mit Reduktionsfaktor r und
  resultierendem Jahreswert; Summenzeile je Variante gegen die Richtwerte.
- **Massnahmenliste**: Bereich, Massnahme, Reduktionsfaktor oder Potenzial, Mehrkosten in CHF je t CO₂-eq, Bemerkung
  (Brandschutz, Schallschutz, Verfügbarkeit ReUse).
- **PV-Auslegung**: Anlagengrösse, Eigenverbrauchsanteil, Autarkiegrad je Variante (Tenero A/B/C), Break-even-Leistung.
- Nicht in die Maske: Wettbewerbsanforderungen, Lastverschiebungs-Tabellen, Netto-Null-Erläuterungen; sie bleiben im
  Bericht (PDF).

### 4.8 Prüfpunkte

Automatisch (Ergänzung der bestehenden fünf):

1. Erstellung ≤ Richtwert Erstellung B der Gebäudekategorie und des Bauvorhabens (statt konstant 9.0).
2. Betrieb ≤ Richtwert Betrieb B; Summe ≤ Zusatzanforderung B; ambitionierte Werte als Information.
3. Listenversion der Ökobilanzdaten zum Berichtsdatum aktuell (Warnung).
4. Anteil Gebäudetechnik an der Erstellung zwischen 15 und 50 % (Hinweis).
5. PV konsistent: Leistung in der Erstellung und Ertrag im Betrieb vorhanden, Eigenverbrauch + Export = Ertrag.
6. Betrieb negativ: Bilanzregel für Überschuss und Stromprodukt angegeben.
7. Standardwerte: jede Zeile mit Standardwert hat eine Begründung oder den Vermerk «Standardwert SIA 390/1».
8. EBF der Ökobilanz = EBF aus der Planprüfung (Toleranz 5 %).

Manuell (Ergänzung zu t1–t4): «Pflichtenheft BBL eingehalten (Bereiche Erstellung und Betrieb, Stromprodukt)», «Beilagen
vorhanden: Tool-Ausdruck mit Bauteilen, Flächenauszug, Rechenhilfe Betrieb», «Gebäudekategorie bzw. Vergleichskategorie
begründet».

### 4.9 Dokumente und Importe

| Dokument | Format | Pflicht | Bemerkung |
|---|---|---|---|
| Ökobilanz-Bericht | PDF | ja | Inhalt nach Abschnitt 2.3 |
| Tool-Export Erstellung | XLSX/JSON (Lesosai, GREG, One Click LCA) | ja | Import füllt Elementgruppen und Bauteile |
| Rechenhilfe SIA 390/1 Betrieb | XLSX | ja, wenn Betrieb nicht aus dem Tool | Import füllt den Teil Betrieb |
| Flächen- und Bauteilauszug | PDF/XLSX | ja | Beilage Posieux |
| Energienachweis / Energiedossier / Revisionsdokumente | Verweis auf Dokumente-Tab | ja | Quelle des Betriebs |
| Variantenstudie | PDF | nein | Tenero |

### 4.10 Reporting (Modell ecCo)

Die Erstellung geht wie bisher als THG pro Jahr und absolut (Scope 3, Annahme Kapitalgüter). Der Betrieb liefert die
Emissionen des Gebäudebetriebs je Energieträger (Brennstoffe vor Ort, Fernwärme, Strom) und den PV-Export; wie das
Modell ecCo diese Werte den Scopes 1 und 2 zuordnet und ob die Sub-Bilanzgruppe Bund dort abgebildet ist, ist nicht
verifiziert und beim Betreiber des Modells zu klären.

---

## 5. Priorisierung

| Priorität | Massnahme | Aufwand im Prototyp |
|---|---|---|
| 1 | Teil Betrieb mit Energiedienstleistungen, Energieträgern und Strombilanz (4.2); Richtwerte Betrieb und Zusatzanforderung je Kategorie (4.5) | mittel: neue Tabelle, neue Zielwerte, Beispielwerte für Musterhausen |
| 2 | PV als Objekt in beiden Bereichen, Bezugsgrössen der Gebäudetechnik, Anteil Gebäudetechnik (4.3) | klein |
| 3 | Anteil-Spalte und Haupttreiber in der Übersicht, Bauteilebene beim Import (4.4) | klein bis mittel |
| 4 | Kopfdaten: Datenstand, Pflichtenheft, Stromprodukt, Version 7.0, Prüfpunkte (4.6, 4.8) | klein |
| 5 | Varianten und Massnahmen (4.7) | mittel; erst nach Rückmeldung, ob die CDE Variantenstudien aufnehmen soll |

---

## 6. ASTRA 8B001: Relevanz für den Hochbau

Die Dokumentation behandelt Fahrbahnen, Kunstbauten, Tunnel sowie Betriebs- und Sicherheitsausrüstung, nicht Gebäude.
Übertragbar sind die Methodik und das Datenmanagement: die Kennzeichnung der Module SN EN 15643-5 je Zeile (A1–A5,
B1–B7, C1–C4, D), die Umrechnung auf Jahreswerte für Variantenvergleiche, die Genauigkeitsangabe je Projektphase und die
Empfehlung, Projektbeispiele zentral beim Bauherrn zu sammeln, damit der Kenntnisstand hoch bleibt. Genau das leistet die
CDE, wenn sie die Ökobilanzen strukturiert aufnimmt. Die Standardwerte, Nutzungsdauern (100 Jahre für verankerte
Bauwerke) und Beispiele des ASTRA sind für Gebäude nicht anwendbar.

---

## 7. Begriffe

| Begriff | Bedeutung |
|---|---|
| Bereich Erstellung, Betrieb, Mobilität | die drei Bereiche der SIA 390/1; Erstellung nach SIA 2032 (A1–A3, A4–A5, B4, C1–C4), Betrieb = Energie für Raumwärme, Warmwasser, Kälte, Lüftung, Beleuchtung, Geräte usw. (B6) |
| Richtwert, Zielwert, Zusatzanforderung | Richtwerte je Bereich sind informativ; Zusatzanforderung = Höchstwert für Erstellung + Betrieb; Zielwert = Erstellung + Betrieb + Mobilität; je Basis (B) und ambitioniert (A) |
| Energiedienstleistung | Zeile der Rechenhilfe SIA 390/1 (Raumwärme, Warmwasser, Raumkälte, Hilfsenergie, Lüftung, Beleuchtung, Geräte, Prozessanlagen, Aufzüge, Fahrtreppen) |
| Standardwert | Vorgabewert der Rechenhilfe, wenn kein Nachweis vorliegt; Abweichungen sind zu begründen |
| THGK, PEF | Treibhausgaskoeffizient in kg CO₂-eq/kWh und Primärenergiefaktor eines Energieträgers (KBOB-Blatt Energie) |
| Eigenverbrauchsanteil, Autarkiegrad | Anteil des PV-Ertrags, der im Gebäude verbraucht wird, bzw. Anteil des Bedarfs, den die PV deckt |
| Modul D | Vorteile und Belastungen ausserhalb der Systemgrenze (SN EN 15804+A2), z. B. exportierter PV-Strom |
| Sub-Bilanzgruppe Bund | virtuelles Stromkonto der Bundesverwaltung, in das der PV-Überschuss von Bundesgebäuden fliesst (Tenero) |

---

## 8. Quellen

1. Gartenmann Engineering AG, «Ökobilanzierung, 250659, Neubau Restaurations- und Konferenzgebäude Agroscope, Posieux», 11.08.2025, 11 S.: `docs/reference/beispiele/BBL Beispiel - 250659_Be_20250804_Ökobilanzierung.pdf` (Markdown daneben; lokal)
2. WaltGalmarini AG, «4000-1096, Ökobilanzierung Neubau Unterkunftsgebäude Dono Nazionale, CST Tenero», 03.10.2025, Index 05.03.2026, 26 S.: `docs/reference/beispiele/BBL Beispiel - 4000-1096_251003_Oekobilanz-Optimierungspotential_260305.pdf` (Markdown daneben; lokal)
3. Plattform Ökobilanzdaten im Baubereich (Hrsg.), «Regeln für die Ökobilanzierung von Baumaterialien und Bauprodukten in der Schweiz», Version 9.0, 01.09.2026: `docs/reference/sources/Plattform_OeDB_Bilanzierungsregeln_Baustoffe_v9.0.pdf`; online https://www.kbob.admin.ch/de/oekobilanzdaten-im-baubereich
4. ASTRA, Dokumentation 8B001 «Anwendung der Ökobilanz-Methode für die Infrastruktur von Nationalstrassen», Ausgabe 2025 V1.00: `docs/reference/sources/astra_8b001_anwendung_der_oekobilanz.pdf`; Bezugsquelle https://www.astra.admin.ch
5. Vornotizen: [2026-11-03-thg-reporting-datenpunkte.md](2026-11-03-thg-reporting-datenpunkte.md), [2026-11-04-oekobilanz-bauemissionen-sia32.md](2026-11-04-oekobilanz-bauemissionen-sia32.md) (SIA 390/1 Zielwerte Wohnen: Betrieb B 2.0 / A 1.0, Zusatzanforderung B 11.0 / A 7.0), [2026-11-04-oekobilanzdaten-systemgrenzen.md](2026-11-04-oekobilanzdaten-systemgrenzen.md), [2026-11-04-projektart-bauvorhaben.md](2026-11-04-projektart-bauvorhaben.md)
6. Prototyp: `data/thg.json` (Kopfdaten, Elementgruppen, Emissionsquellen), `data/forms.json` (Vorlage THG-32, Zielwerte, Prüfpunkte, Dokumente), `js/model/form.js` (automatische Prüfungen)
