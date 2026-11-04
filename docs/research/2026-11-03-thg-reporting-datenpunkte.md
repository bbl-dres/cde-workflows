# THG-Reporting: Datenpunkte für die Erfassungsmaske (Forschungsnotiz)

**Stand:** 3. November 2026 (alle Quellen abgerufen am 2026-11-03)
**Kontext:** Prototyp CDE Bund (BBL), Datenformular «THG-32 · Ökobilanz Bauemissionen (SIA 32)»
**Zweck:** Klären, welche Datenpunkte die Erfassungsmaske sammeln muss, damit nachgelagert eine Treibhausgasbilanz (THG) der Erstellung (Herstellung, Errichtung, Ersatz, Entsorgung = «graue Emissionen») berechnet werden kann.
**Abgrenzung:** Die Maske rechnet nicht. Sie sammelt und validiert Daten; die Berechnung und die Konsolidierung erfolgen ausserhalb (vom Product Owner als «ECCO» bezeichnet, vgl. Abschnitt 2.5). Diese Notiz ist eine Recherche, keine Spezifikation; Feldnamen sind entweder aus Quellen zitiert oder als «Vorschlag» markiert.

---

## 1. Fragestellung und Ergebnis in Kürze

- **eBKP-H als Gliederung ist richtig, reicht aber nicht als Datenbasis.** SIA 2032 verwendet den eBKP-H explizit als Gebäudestruktur für das Berechnungsverfahren, und Minergie-ECO erfasst «detailliert nach Elementgruppen gemäss eBKP-H» [7][11]. Der eBKP-H selbst «kennt keine materialabhängigen Messregeln»; seine Bezugsgrössen sind Brutto-Flächen und -Volumen nach SIA 416 [13]. Eine Menge pro Elementgruppe allein erlaubt also keine THG-Berechnung.
- **Rechenkern jeder Schweizer Ökobilanz ist «Menge x KBOB-Kennwert, dividiert durch Amortisationszeit».** Die KBOB/ecobau-Liste liefert pro Datensatz Treibhausgasemissionen (Total, Herstellung, Entsorgung) in kg CO₂-eq pro «Bezug» (kg, m², m³, Stk.), dazu Rohdichte/Flächenmasse [5]. Die Amortisationszeiten pro eBKP-H-Elementgruppe kommen aus SIA 2032 Anhang C (60/40/30/20 Jahre) [11][32]. Folglich braucht das Modell je Bauteil: eBKP-H-Code, Bauteilaufbau (Schichten mit Material = KBOB-ID, Dicke oder Masse/Dichte) und die Bauteilmenge in der KBOB-Bezugseinheit.
- **Die Vermutung des Teams ist damit bestätigt:** Materialeingaben (Baustoffe, Schichten, Dichten/Dicken, KBOB-Datensätze) sind für eine nachgelagerte Berechnung zwingend, ausser man beschränkt sich auf ein vereinfachtes Verfahren mit Konstruktionstypen aus einem Katalog (SIA 2032 Anhang D, Minergie-Nachweis Bereich Erstellung) [8][11].
- **Die heutige Maske (Mengen + THG-Resultat pro Hauptgruppe + Endwert + PDF) ist eine Ergebnisübernahme, keine Rechengrundlage.** Für das Reporting ist das brauchbar, sofern Systemgrenze, KBOB-Version, Tool, EBF und Phase mitgeliefert werden; eine Neuberechnung oder Plausibilisierung ist damit nicht möglich.
- **«ECCO» ist mit hoher Wahrscheinlichkeit das «Modell ecCo»** («Modèle exemplarité climat Confédération», «Modell Vorbild Klima Bund»): das Gesamtsystem der zentralen Bundesverwaltung zur Vorbildfunktion Klima nach Art. 10 KlG, das RUMBA per Ende 2025 ablöst und die THG-Bilanz nach GHG Protocol in einem zentralen «THG-Tool» führt [1][2]. Es ist ein Bilanzierungs- und Reportingmodell, kein Gebäude-Ökobilanztool; was es pro Gebäude genau benötigt, ist nicht publiziert (nicht verifiziert).
- **Für den Bund gilt dieselbe Methodik wie für die Labels:** Das KBOB-Faktenblatt «Graue Treibhausgasemissionen bei der Erstellung von Gebäuden» (4.4.2025, Herausgeberin KBOB c/o BBL, Begleitgruppe armasuisse, BAFU, BBL, BFE, ETH-Rat) definiert als Messgrössen «GTHGE [kgCO2eq/m2EBF] gemäss SIA 2032 (absoluter Wert)», «GTHGE [kgCO2eq/m2EBF und Jahr]» und den «Restwert Bestandsbauten» [3].
- **Empfehlung:** Drei Ausbaustufen (Abschnitt 5): (a) Ergebnisübernahme mit Metadaten, (b) Bauteil- und Materialerfassung nach eBKP-H mit KBOB-Zuordnung, (c) BIM-gestützte Übernahme aus IFC (Base Quantities, Materialschichten, eBKP-H-Klassifikation, Phase).

---

## 2. Grundlagen (Normen, Bund, KBOB) und ihre Datenanforderungen

### 2.1 SIA 2032:2020 «Graue Energie – Ökobilanzierung für die Erstellung von Gebäuden»

- **Systemgrenze «Erstellung»:** Herstellungsphase (Module A1–A3), Errichtungsphase (A4, A5), Ersatz von Bauteilen in der Nutzungsphase (B4) und Entsorgungsphase (C1–C4) gemäss SN EN 15804; Betrieb und Mobilität sind ausgeschlossen [3][9].
- **Bezugsgrössen:** Nutzungsdauer Gebäude 60 Jahre; Resultat pro m² Energiebezugsfläche (EBF/AE) und Jahr; Bilanzperimeter ganzes Gebäude inkl. unbeheizter Teile [7].
- **Gebäudestruktur:** «Als Struktur für das Berechnungsverfahren kann der Baukostenplan Hochbau eBKP-H ... verwendet werden» (SIA 2032-C1, Ziffer 3.1.5) [11]. Berücksichtigte Elementgruppen (Auszug SIA 2032 Ziffer 3.3.2, zitiert nach Minergie): B06.01/B06.02 Aushub, B06.04 Baugrubenabschluss, B07.02 Pfählung; C01, C02.01 (A/B), C02.02, C03, C04.01, C04.04, C04.05, C04.08; D01, D05, D07, D08; E01, E02, E03; F01.01–F01.03; G01–G04. Nicht bilanziert: A, D02, D03, D04, D06 (Kältetechnik), D12, H, I, J, V, W, Y, Z [7].
- **Amortisationszeiten (Anhang C, normativ):** Baugrube/Tragkonstruktion (B, C) 60 Jahre, Balkon C4.3 40, Elektroanlage D1 (inkl. Solarzellen) 30, Wärmeerzeugung D5.2 20 (Erdwärmesonden 40, Solarkollektoren 30), Wärmeverteilung/-abgabe, Lüftung D7, Sanitär D8 30, Aussenwandbekleidung E2 30–40 je nach System, Fenster E3 30, Flachdach F1.2 30, geneigtes Dach F1.3 40, Ausbau G1–G4 30 [11]. Quelle ist die Korrigenda C1:2013 zur Ausgabe 2010; die Werte der Ausgabe 2020 sind in der Norm nachzuschlagen (nicht verifiziert).
- **Messregeln (SIA 2032 Ziffern 3.4.1/3.4.2):** Aussenwände mit Aussenabmessungen, Innenwände mit Innenabmessungen ohne Abzüge für Durchbrüche, Decken ohne Abzüge für Schächte/Treppen; nicht bilanziert werden Transporte Lager–Baustelle, Baustellenenergie, Verpackung/Verschnitt und lineare Randelemente [7].
- **Frühe Phasen (Anhang D):** Berechnungstabelle für Vorstudien/Vorprojekt mit Konstruktionstypen pro Elementgruppe (z. B. «C 2.1 (B) Aussenwandkonstruktion über Terrain: Betonwand / Backsteinwand / Holzwand», «E 3 / F 2 Fenster: Mittelwert 2-fach-/3-fach-Verglasung») und Kennwerten in kg CO₂ pro m² Bauteilfläche (BTF) bzw. pro m² EBF (Elektroanlage) und m³ (Aushub) [11]. Das zeigt, welche minimale Eingabe ohne Schichtaufbau genügt: eBKP-H-Element, Konstruktionstyp, Bauteilfläche.

### 2.2 SIA 390/1:2025 «Klimapfad»

In Kraft seit 1.2.2025, löst SIA 2040 ab; definiert Zielwerte A/B für die Summe aus Erstellung, Betrieb und Mobilität sowie Richtwerte (Basis/ambitioniert) für die Erstellung, alle in kg CO₂-eq/(m² EBF·a) [10][12]. Grundlagen sind identisch mit Minergie: «SIA MB 2032:2020» und «KBOB-Liste (Ökobilanzdaten im Baubereich, Version 2009/1:2022)»; Systemgrenze «Ganzes Gebäude inkl. UG», PV via Herkunftsnachweis; feste Grenz-/Zielwerte pro Gebäudekategorie (keine objektspezifischen Zuschläge) [10]. Für die Richtwerte Erstellung wird der Absenkpfad Industrie des KlG (1 %/Jahr) verwendet (SIA 390/1 Anhang A2.2) [9]. Minergie schätzt: «Im Mittel entspricht der Basis-Richtwert Erstellung für Neubauten in etwa dem Grenzwert 1 von ECO für beheizte Flächen» [10].

### 2.3 Minergie-ECO, Minergie-Netto-Null, SNBS

- **Minergie-ECO (Berechnungsanleitung v2023.2):** Erfassungsmethode: Gebäudehülle immer detailliert; für Innenbauteile, unbeheizte Bauteile, Haustechnik und Aushub wahlweise «vereinfachte Erfassung» mit wenigen Parametern (Raumhöhe, EBF, Geschossfläche, Anzahl Stockwerke unbeheizt/unter Terrain, Gebäudegrundfläche; Grundrisstyp, Schallschutzanforderung, Konstruktionstyp, Deckenstärke; Erdsonde, PV-Fläche, Sonnenkollektoren) [7]. Zugelassene Instrumente: Enerweb 380/1 ECO, GREG, Lesosai, Thermo Bauphysik [7]. Grenzwerte GW1/GW2 (kg CO₂-eq/m²·a auf EBF): Wohnen MFH 8.0/10.0, Verwaltung 8.0/11.0, Schule 8.0/11.0, Verkauf 11.0/16.0, Spital 11.0/16.0; unbeheizte Flächen 2.8/4.5 pro m² (GF–AE) [7]. Datenbasis: KBOB-Empfehlung 2009/1, Stand 2022 [7].
- **Minergie-Nachweis Bereich Erstellung (Erläuterungsbericht, 20.5.2026):** vereinfachtes Verfahren «fast ausschliesslich mittels Dropdown-Menus», basierend auf zwölf Modellgebäuden und Faktoren; Eingaben u. a. Geschossfläche, Wiederverwendung (Neubau / Neubau auf bestehendem UG / Auskernung), Baugrube (Böschung … Spundwand), Fundation (Flachfundation … Betonpfahl), UG-Gestaltung, «Einlage Haustechnik in Decke», Spannweite Dach/Decken, Dach-/Decken-/Fassadenaufbau aus Listen, Kompaktheit (Ath/AE), Fensteranteil [8]. Von der MuKEn 25 anerkannt; für ECO und Netto-Null nicht zulässig [8][9].
- **Minergie-Netto-Null (Reglement v2026.1):** 60 Jahre; Erstellung nach SIA 2032 = A1–A3, A4–A5, B4, C1–C4; Grenzwert = ECO GW1 (Version 2023.1) oder SNBS-Hochbau 2023.1 «Mindestnote 5.5 Messgrösse 1, Kriterium 311»; Nachweis «mittels eines vom Verein ecobau zugelassenen Ökobilanzierungstools mit Exportfunktion»; nur Materialien der aktuellen KBOB-Liste; Kohlenstoffspeicher separat ausweisen, keine Verrechnung; wiederverwendete Bauteile nach ECO-Methodik [9]. Das Reglement hält fest, dass das Netto-Null-Ziel für die zentrale Bundesverwaltung «verpflichtend inklusive Scope 3» ab 2040 gilt [9].
- **SNBS Hochbau:** Seit Version 2023.1 folgt der SNBS bei Energie und THGE in der Erstellung «der Methodik von Minergie-ECO» [14]; das Kriterium heisst in 2023.1 «311» (in 2.0/2.1 «302.1»). Der Kriterienbeschrieb selbst wurde nicht eingesehen (nicht verifiziert).

### 2.4 KBOB/ecobau-Liste «Ökobilanzdaten im Baubereich» (Version 9.0, 2022)

Struktur der offiziellen Excel-Datei [5]: Blätter «Baumaterialien», «Gebäudetechnik», «Energie», «Transporte», «Entsorgung». Spalten im Blatt Baumaterialien: «ID-Nummer», «UUID-Nummer», Name, «ID-Nummer Entsorgung», «Rohdichte/Flächenmasse», «Bezug» (Bezugseinheit, z. B. kg, m², m³), «UBP'21» (Total/Herstellung/Entsorgung), «Primärenergie» gesamt/erneuerbar/nicht erneuerbar (je Herstellung total, energetisch genutzt, stofflich genutzt, Entsorgung; kWh oil-eq), «Treibhausgasemissionen» (Total/Herstellung/Entsorgung; kg CO₂-eq, IPCC GWP 100a) und «Biogener Kohlenstoff» (kg C). Beispiel: «00.001 Baugrubensicherung, Bohrpfahlwand, gespriesst», Bezug m², THG Total 2250 / Herstellung 2000 kg CO₂-eq. Hintergrunddaten: UVEK Ökobilanzdatenbestand DQRv2:2022. Hinweis in der Datei: «Für biogenen Kohlenstoff ... werden keine Negativemissionen ausgewiesen. Regeln zur Anrechnung ... sind auf Ebene Gebäude festzulegen» [5]. Die nächste Gesamtrevision («KBOB/ecobau-Liste 2027», verknüpft mit der UVEK-Datenbank BAFU:2026) ist für Anfang 2027 angekündigt; die Bilanzierungsregeln Version 9.0 (1.9.2026) ergänzen Modul D und einen Zirkularitätsindex CI-C [4][6][35]. Konsequenz für die Maske: **KBOB-ID und Listenversion müssen pro Material mitgeführt werden**, weil sich Kennwerte zwischen Versionen ändern (SIA 2032 verlangt, die verwendete Version zu dokumentieren [11]).

### 2.5 Bund: KlG, KBOB-Faktenblatt, VEK und «ECCO» = Modell ecCo

- **Rechtsrahmen:** Die zentrale Bundesverwaltung muss bis 2040 Netto-Null erreichen, «neben den direkten und indirekten Emissionen» auch die «vor- und nachgelagert durch Dritte verursachten» (KlG Art. 10 Abs. 2); Art. 35j Abs. 2 USG verpflichtet den Bund zur Vorbildfunktion beim ressourcenschonenden Bauen [3].
- **KBOB-Faktenblatt (4.4.2025):** empfiehlt, bei Baurechtsvergaben, Portfolios und Wettbewerben «Zielwerte für GTHGE, Restwerte sowie biogene Kohlenstoffspeicher» festzulegen und «die absoluten Messwerte (kgCO2eq/m2EBF) sowie die Werte pro Jahr» zu beurteilen, «bevorzugt (phasengerecht) quantitativ» [3]. Die Maske sollte daher beide Grössen (absolut und pro Jahr) sowie den Kohlenstoffspeicher getrennt aufnehmen.
- **Modell ecCo:** Konzept V1.0 vom 29.10.2025 (GS-UVEK). Der Name leitet sich ab aus «Modèle exemplarité climat Confédération» [2]. Grundsätze: Bilanzierung «gemäss Greenhouse Gas Protocol»; Datenmanagement «nach dem once only-Prinzip mit der Hilfe eines zentralen Tools» (THG-Tool), «basiert möglichst auf bereits verfügbaren Datengrundlagen», Übertragung aus anderen Tools «möglichst automatisch» [2]. Das BBL ist «Lieferant zentraler Daten» (u. a. «Gebäudedaten») und liefert «direkt im THG-Tool oder über eine automatisierte Schnittstelle» [2]. Methodik, Standards und Systemgrenzen legt das «Gremium Methodik und Standards (GMS)» fest (Mitglieder mit Stimmrecht u. a. BBL, armasuisse, BAFU, BFE) [2]. Gruppe Verteidigung und armasuisse sind von Modell ecCo ausgenommen und werden mit der Armee durch das VBS bilanziert; der ETH-Bereich fällt als verselbständigte Einheit unter Art. 10 Abs. 4 KlG (VEK-Grobkonzept) [2][34]. Das Konzept erwähnt weder SIA 2032 noch KBOB-Ökobilanzdaten noch «graue Emissionen» explizit; der Umgang mit Erstellungsemissionen ist somit Sache des GMS und **öffentlich nicht spezifiziert (nicht verifiziert)**. Ergänzende Umweltbewertungen sollen «mittels Umweltbelastungspunkten (UBP)» beim BAFU eingeholt werden [2] – ein Grund, UBP neben THG mitzuführen.
- **Andere Kandidaten für «ECCO» (ausgeschlossen):** ECCO2 Solutions AG, Givisiez, ein Anbieter für Heizungsoptimierung im Betrieb (kein Bezug zu Erstellungsemissionen) [36]; eine Verwechslung mit «eco-bau»/«ecobau» ist möglich, aber unwahrscheinlich.
- **«Anleitung TP2 NettoNull» und Kontrollwert 9.1 kg CO₂-eq/m² EBF·a:** öffentlich nicht auffindbar; vermutlich BBL-internes Dokument eines Teilprojekts «Netto-Null». Der Wert liegt zwischen Minergie-ECO GW1 (8.0) und GW2 (11.0) für Verwaltungsbauten [7] und nahe dem Basis-Richtwert SIA 390/1 [10]; Herkunft und Systemgrenze sind mit der Anleitung abzugleichen (nicht verifiziert).

### 2.6 eBKP-H (SN 506 511, Ausgabe 2020)

Drei Ebenen: Hauptgruppe, Elementgruppe, Element (mit eBKP-Gate zusätzlich Teilelement und Komponente); Bezugsgrössen A und B je Stufe, nach Brutto-Prinzip gemäss SIA 416; «Der eBKP-H kennt keine materialabhängigen Messregeln, wie sie im Normpositionen-Katalog NPK zu finden sind» [13]. Hauptgruppen: A Grundstück, B Vorbereitung, C Konstruktion Gebäude, D Technik Gebäude, E Äussere Wandbekleidung, F Bedachung, G Ausbau, H Nutzungsspezifische Anlage, I Umgebung, J Ausstattung, V/W/Y/Z Planung, Nebenkosten, Reserve, MwSt [7][13]. Die heutige Maske führt «I Umgebung» – SIA 2032 bilanziert I nicht (Ausnahme: wesentliche Stützmauern o. ä. [11]).

---

## 3. Was ein Ökobilanz-Modell braucht (Datenmodell)

Legende: P = Pflicht, O = optional, A = abgeleitet (vom Rechenmodell, nicht von der Maske). Lieferant: AR = Architekt/-in, FP = Fachplaner/-in (Tragwerk, HLKSE, Bauphysik), ÖB = Ökobilanzierer/-in, BH = Bauherrschaft/BBL. Feldnamen ohne Quellenangabe sind Vorschläge.

### 3.1 Projekt / Gebäude

| Feld (Vorschlag) | Typ | Einheit | P/O/A | Lieferant | Typische Quelle / Begründung |
|---|---|---|---|---|---|
| Objekt-ID (BBL-Objektnummer), Gebäude-ID (EGID) | ID | – | P | BH | Verknüpfung mit THG-Tool/ecCo («once only») [2] |
| Gebäudehauptnutzung / Gebäudekategorie | Auswahl | – | P | AR | Grenz-/Richtwert hängt davon ab [7][10] |
| Energiebezugsfläche EBF (AE) | Zahl | m² | P | AR/FP | Bezugsgrösse aller Kennwerte; aus FV-32 übernehmen [3][7] |
| Geschossfläche GF, davon unbeheizt (GF–AE), GF unterirdisch | Zahl | m² | P | AR | Minergie-Grenzwertbildung, vereinfachte Erfassung [7] |
| Gebäudegrundfläche, Anzahl Geschosse ober-/unterirdisch, Raumhöhe | Zahl | m², –, m | O | AR | vereinfachte Erfassung [7][8] |
| Projektart | Auswahl | – | P | BH | Neubau / Erneuerung / Neubau auf bestehendem UG / Auskernung [8] |
| SIA-Phase / Version des Datensatzes | Auswahl | – | P | ÖB | SIA 112-Phasen (31/32/33/41/51/52); eBKP-H ist phasendurchgängig [13] |
| Betrachtungszeitraum | Zahl | a | A | – | 60 Jahre fix nach SIA 2032 [7] |
| Systemgrenze (Module) | Auswahl | – | P | ÖB | A1–A3, A4–A5, B4, C1–C4 nach SIA 2032; abweichende Grenzen deklarieren [9] |
| KBOB-Listenversion | Text | – | P | ÖB | z. B. «KBOB/ecobau-Liste 2022, Version 9.0» [5]; von SIA 2032 verlangt [11] |
| Bezugsjahr / Absenkpfad-Annahme | Zahl | – | O | ÖB | Netto-Null-Bilanz nach KlG-Absenkpfad [9] |
| Berechnungstool und -version | Text | – | P | ÖB | ecobau-zugelassene Tools [9] |
| Datenqualität | Auswahl | – | P | ÖB | geschätzt / geplant / ausgeführt (as built) |

### 3.2 Bauteile / Elemente (Struktur eBKP-H)

| Feld | Typ | Einheit | P/O/A | Lieferant | Quelle / Begründung |
|---|---|---|---|---|---|
| eBKP-H-Code (Elementgruppe, möglichst Element, z. B. C02.01, E02.03) | Code | – | P | AR | Struktur nach SIA 2032 [7][11]; Madaster verlangt 4-stellig [15] |
| Bauteilbezeichnung | Text | – | P | AR | |
| Lage | Auswahl | – | P | AR | beheizt / unbeheizt / unter Terrain / über Terrain (C02.01 A/B) [7] |
| Bauteilmenge | Zahl | m², m³, m, Stk. | P | AR/FP | in der Bezugseinheit des Elements («BTF», m³ Aushub) [11]; Messregeln SIA 2032 [7] |
| Konstruktionstyp (Katalog) | Auswahl | – | P in frühen Phasen | AR | ersetzt Schichtaufbau bis Vorprojekt [8][11] |
| Amortisationszeit | Zahl | a | A | – | aus eBKP-H-Code nach SIA 2032 Anhang C [11][32] |
| Wiederverwendung / Bestand erhalten | Auswahl | – | O | AR | ECO-Methodik für wiederverwendete Bauteile [9]; Phase Existing/Demolish/New [15] |

### 3.3 Materialien / Schichten (je Bauteil)

| Feld | Typ | Einheit | P/O/A | Lieferant | Quelle / Begründung |
|---|---|---|---|---|---|
| KBOB-ID (und UUID) | ID | – | P | ÖB/AR | «ID-Nummer», «UUID-Nummer» in der Liste [5]; Mapping Materialname → KBOB-ID wie in IfcLCA [30] |
| Materialname (Herstellerprodukt, falls spezifisch) | Text | – | O | AR | herstellerspezifische Datensätze existieren [5] |
| Schichtdicke | Zahl | m | P (bei Bezug kg/m³) | AR | eLCA-Formel «pro kg x Rohdichte x Schichtdicke» [23] |
| Rohdichte / Flächenmasse | Zahl | kg/m³, kg/m² | A (aus KBOB) oder P bei Abweichung | ÖB | Spalte «Rohdichte/Flächen-masse» [5] |
| Menge in KBOB-Bezugseinheit | Zahl | kg, m², m³, Stk. | A oder P | – | Volumen x Dichte [30] |
| Anteil / Ergiebigkeit | Zahl | – | O | AR | für Teilflächen, Gemische [23] |
| Lebensdauer Produkt (falls abweichend von Anhang C) | Zahl | a | O | FP | One Click LCA: Produkt-Lebensdauer für B4 [22] |
| Biogener Kohlenstoff | Zahl | kg C | A | – | separat ausweisen, nicht verrechnen [5][9] |

### 3.4 Technik (D), Energie, Ergebnisse, Nachweis

- **Haustechnik (D01, D05, D07, D08):** Erdsonde (Auswahl, Länge), PV-Fläche (anteilig Eigenverbrauch 100 % + 40 % Einspeisung), Sonnenkollektorfläche, Lüftung/Sanitär/Elektro pro m² EBF [7]. Für die KBOB-Blätter «Gebäudetechnik» gelten andere Bezugseinheiten (Stk., kW, m) [5].
- **Energie/Betrieb:** nur erforderlich, wenn der Klimapfad SIA 390/1 (Erstellung + Betrieb + Mobilität) gerechnet wird [10]; für THG-32 ausser Perimeter, aber als Verknüpfung (Formular Betrieb) vorzusehen.
- **Ergebnisse (Übernahme aus Tool):** THG Erstellung absolut [kg CO₂-eq] und pro Jahr [kg CO₂-eq/a], spezifisch [kg CO₂-eq/(m² EBF·a)]; Aufteilung nach Elementgruppen und nach Modulen (A1–A3 / A4–A5 / B4 / C); Graue Energie [kWh oil-eq/(m² EBF·a)]; UBP; Kohlenstoffspeicher [kg C bzw. kg CO₂] separat [3][5][8]; Restwert bei Bestandsbauten nach SIA 2032 Anhang F [3][33].
- **Nachweis:** Bericht (PDF) plus maschinenlesbarer Export des Tools (Minergie-Netto-Null verlangt «Exportfunktion» [9]).

---

## 4. Tool-Vergleich

| Tool | Inputs (Kern) | Granularität | eBKP-H-Bezug | API / Import | Schweiz-Bezug |
|---|---|---|---|---|---|
| **Madaster** [15]–[19] | IFC: GUID, Base Quantities, «ifcMaterial», Klassifikation EBKP 4-stellig, IFC-Type, Phase Existing/Demolish/New; Excel: «Material/Product», «Classification code», «Floor», «Volume» m³, «Area» m², «Length» m, «Amount», GTIN, Detachability | Element/Produkt, Schichten via Multilayer-Produkte | ja (EBKP als Klassifikation in CH) | IFC, Excel-Vorlage, API | CH-Plattform; Umweltdaten nach EPD, Systemdatenbanken u. a. ÖKOBAUDAT/EPEA; KBOB-Anbindung nicht verifiziert |
| **EC3 (Building Transparency)** [20][21] | Projekt: name, Construction start date, Address, LOD, Tragsystem, Floor area above/below grade, GWP target, CLF Baseline; Element: Building Element, Quantity, Unit, EPD-Auswahl | Element/Produkt; A1–A3 aus EPD | nein (eigene Elementstruktur) | BIM 360, Tally, XLSX/CSV-Export | kein KBOB; EPD-basiert, US-zentriert |
| **ecobau Bauteilkatalog / Umweltrechner** [26][27] | Bauteilaufbauten aus Katalog («KBOB / ecobau / IPB 2009/1:2022», «FLEX-Katalog 2023»); Rechner für Beton, Fenster, Türen, Wärmepumpen, Fernwärme, Strommix | Bauteil (pro m²) | historisch Minergie-ECO-Expert-Tool; eBKP-H-Zuordnung nicht verifiziert | Web, Excel | ja, BFE/ecobau finanziert |
| **KBOB/ecobau-Liste + lcadata.ch** [5][31] | Material (ID), Bezug, Rohdichte | Material | nein (Material-Ebene) | XLSX; lcadata.ch: Excel/CSV/JSON, API | offizielle Datenbasis |
| **One Click LCA (Minergie-Tool)** [22] | Gebäudetyp(en) und Flächen (EBF, GF, unbeheizt), erneuerbare Energie; Materialien zu Konstruktionen gruppiert, produktspezifische Lebensdauer | Material/Konstruktion; A1–A3, B4, C3–C4; 60 a fix | Konstruktionen «matching the building elements»; eBKP-H nicht explizit | Excel, IFC/Revit laut Produkt (nicht verifiziert) | nur KBOB-Daten; Minergie-Akkreditierung (Herstellerangabe) |
| **eLCA (BBSR, DE)** [23][24][25] | Bauteile aus Schichten, Baustoff aus ÖKOBAUDAT, Schichtdicke; Materialangaben: Umrechnungsfaktor kg/DE, Rohdichte, Flächengewicht, Längengewicht, Stückgewicht, Ergiebigkeit | Schicht; Formel pro m² = Wert/kg x Rohdichte x Dicke | DIN 276 (nicht eBKP-H) | Im-/Export, ÖKOBAUDAT-Direktimport | nein (DE, BNB/QNG) |
| **Lesosai / Eco-Sai (E4tech)** [28][29] | Bauteile/Schichten; Standards SIA 2032, ECO, SIA 390/1, SIA 2040 (Lesosai); Eco-Sai vereinigt USai und Eco-Bat (HEIG-VD) | Bauteil/Schicht | Minergie-ECO-Erfassung nach eBKP-H [7] | IFC, gbXML (Lesosai) | ja, Minergie-zugelassen |
| **IfcLCA (Open Source, AGPL)** [30] | IFC4, Base Quantities (Net/GrossVolume), IfcMaterialLayerSet/ConstituentSet, eBKP-H-Klassifikation für Amortisation | Element x Material; Volumen x Dichte x Faktor; relativ = absolut / (Jahre x Fläche) | ja («Only eBKP-H is supported») | IFC; KBOB-JSON (Felder name, category, density, gwp, penr, ubp, unit) | ja, KBOB via lcadata.ch |

Ergänzende Beobachtungen:

- **Madaster** rechnet nach EN 15978 (A1–A3, A4–A5, B1–B5, C1–C4, D) aus EPD-Daten der verknüpften Produkte, multipliziert mit Element-Mengen; Produktdatensätze enthalten «Name, Typ, Lebensdauer, Dichte, Funktionelle Einheit, Zusammensetzung» und ein «Suchkriterium» für das automatische Matching [18][19]. Der Import validiert «Materialbeschreibung, Klassifikationscode und geometrische Daten» – exakt die drei Datenpunkte, die auch THG-32 braucht.
- **EC3** zeigt, dass eine Mengenangabe in beliebiger Einheit genügt, wenn das Tool in die deklarierte Einheit der EPD umrechnet («EC3 will automatically convert the units used in EPDs to the unit entered by the user») [20]. Für KBOB-Daten muss diese Umrechnung über Rohdichte/Flächenmasse erfolgen [5][23].
- **eLCA/ÖKOBAUDAT** dokumentiert die minimal nötigen Materialangaben am klarsten: ohne Rohdichte oder Flächengewicht ist ein kg-Datensatz nicht verwendbar («Eine Übergabe von Datensätzen in Kilogramm ohne Angabe der Rohdichte ... ist auszuschliessen») [23].
- **BAFU PACTA CO₂-Rechner (FPRE, 2024)** ist ein Bundesbeispiel für ein Top-down-Modell: Scope-3-Emissionen (Herstellung, Erstellung, Sanierung, Rückbau, Entsorgung) werden aus wenigen Gebäudemerkmalen geschätzt (EBF, Geschosse, Baujahr, Nutzung, Grundfläche, Tiefgarage, PV, Installationsdecke, Lüftung) mit Szenarien Restwert/Werterhalt/Wiederbeschaffungswert nach SIA 2032 Anhang F [33]. Das ist für Portfolio-Reporting geeignet, nicht für projektbezogene Nachweise.

---

## 5. Empfehlung für das Datenformular THG-32

Grundregel für alle Stufen: Die Maske speichert Rohdaten und Metadaten, keine Formeln. Jede Zahl erhält Einheit, Quelle (Tool/Dokument), Phase und Datenqualität. Die Export-Struktur sollte eine THG-Bilanz nach GHG Protocol (Scope 3, Kategorie «Kapitalgüter»/«eingekaufte Güter») speisen können, da Modell ecCo so bilanziert [1][2]; die genaue Schnittstelle zum THG-Tool ist beim GMS/GeS zu klären (Abschnitt 6).

### 5.1 Stufe (a) Minimal – Ergebnisübernahme (heutige Maske, ergänzt)

Ziel: Reporting und Vergleich mit Grenz-/Richtwerten; keine Neuberechnung möglich.

| Feld | Typ | Einheit | Pflicht | Quelle | Bemerkung |
|---|---|---|---|---|---|
| Objekt-ID / EGID | ID | – | P | BBL-Stammdaten | Verknüpfung THG-Tool [2] |
| Gebäudekategorie | Auswahl | – | P | AR | Liste nach Minergie/SIA 390/1 [7][10] |
| EBF (aus FV-32), GF, GF unbeheizt | Zahl | m² | P | FV-32 | Bezugsgrösse [3][7] |
| Projektart, SIA-Phase, Datenqualität | Auswahl | – | P | ÖB | geschätzt/geplant/ausgeführt |
| Systemgrenze | Auswahl | – | P | ÖB | Standard «SIA 2032: A1–A5, B4, C1–C4» [9] |
| Tool + Version, KBOB-Listenversion | Text | – | P | ÖB | [5][9][11] |
| Je eBKP-H-Elementgruppe (nach SIA 2032-Liste, nicht Hauptgruppen): Menge, Einheit, THG absolut, THG pro Jahr | Zahl | m²/m³/m, kg CO₂-eq, kg CO₂-eq/a | P | Tool-Export | Liste der Elementgruppen aus [7]; «I Umgebung» nur bei Begründung [11] |
| Aufteilung nach Modulen A1–A3 / A4–A5 / B4 / C1–C4 | Zahl | kg CO₂-eq | O | Tool-Export | für Modell D/Restwert hilfreich [6][33] |
| Projektwert THG | Zahl | kg CO₂-eq/(m² EBF·a) | P | Tool-Export | Vergleichswert zu Kontrollwert 9.1 |
| Projektwert absolut | Zahl | kg CO₂-eq/m² EBF | P | Tool-Export | KBOB-Faktenblatt verlangt beide [3] |
| Graue Energie, UBP | Zahl | kWh oil-eq/(m² EBF·a), UBP | O | Tool-Export | UBP für ecCo-Zusatzbewertungen [2] |
| Kohlenstoffspeicher (biogen) | Zahl | kg C | O | Tool-Export | separat, nicht verrechnet [5][9] |
| Grenz-/Richtwert und Referenz | Zahl + Text | kg CO₂-eq/(m² EBF·a) | P | Anleitung/Label | z. B. «TP2 Kontrollwert 9.1», «ECO GW1», «SIA 390/1 Basis» |
| Bericht (PDF) + Tool-Export (XLSX/JSON) | Datei | – | P | ÖB | Export verlangt in [9] |

### 5.2 Stufe (b) Erweitert – Bauteil- und Materialerfassung

Ziel: Nachrechenbarkeit und Variantenvergleich; Struktur entspricht den Minergie-/SIA-2032-Tools. Pro Bauteil eine Zeile, pro Schicht eine Unterzeile.

| Feld | Typ | Einheit | Pflicht | Quelle | Bemerkung |
|---|---|---|---|---|---|
| eBKP-H-Code (Element, 4-stellig) | Code | – | P | Kostenplanung/AR | [7][13][15] |
| Bauteilbezeichnung, Lage (beheizt/unbeheizt, unter/über Terrain) | Text/Auswahl | – | P | AR | [7] |
| Bauteilmenge + Einheit | Zahl | m², m³, m, Stk. | P | Ausmass / SIA 380/1-Nachweis | «Ausmasse können aus dem Systemnachweis SIA 380/1 übernommen werden» [7] |
| Konstruktionstyp (Katalog) | Auswahl | – | P bis Vorprojekt | AR | Listen aus SIA 2032 Anhang D / Minergie-Nachweis [8][11] |
| Schicht: KBOB-ID, Materialname | ID/Text | – | P ab Bauprojekt | ÖB/AR | «ID-Nummer» [5] |
| Schicht: Dicke | Zahl | m | P (bei Bezug kg oder m³) | AR | [23] |
| Schicht: Rohdichte/Flächenmasse (Override) | Zahl | kg/m³, kg/m² | O | ÖB | Standard aus KBOB [5] |
| Schicht: Menge in Bezugseinheit | Zahl | kg/m²/m³/Stk. | A | – | Volumen x Dichte [30] |
| Schicht: Produkt-Lebensdauer (Override) | Zahl | a | O | FP | sonst Anhang C [11][32] |
| Haustechnik: Erdsonde (m), PV (m², Eigenverbrauchsrate), Kollektoren (m²), Ersatz-Flags Lüftung/Sanitär/Elektro/Wärmeerzeuger | gemischt | – | P | FP | [7] |
| Wiederverwendung (Bestand/Reuse) | Auswahl | – | O | AR | [9][15] |
| Ergebnisfelder wie Stufe (a) | | | | Tool-Export | Konsistenzprüfung Menge x Kennwert |

### 5.3 Stufe (c) BIM-gestützt – Übernahme aus IFC

Ziel: Mengen und Materialien kommen aus dem Modell; die Maske zeigt, validiert und ergänzt. Anforderungen an das IFC (aus Madaster und IfcLCA abgeleitet [15][16][30]):

| Feld / IFC-Datenpunkt | Typ | Einheit | Pflicht | Quelle | Bemerkung |
|---|---|---|---|---|---|
| GlobalId (eindeutig) | ID | – | P | IFC | [15] |
| IfcClassificationReference mit eBKP-H-Code (4-stellig) | Code | – | P | IFC | «Klassifikation (bsp. F01.02) unter ifcclassificationreference» [15] |
| Base Quantities: NetVolume/GrossVolume, Area, Length, Thickness | Zahl | m³, m², m | P | IFC Qto_* | «Exportieren Sie immer die Base Quantities» [15]; IfcLCA nutzt Net/GrossVolume [30] |
| IfcMaterial / IfcMaterialLayerSet (Schichten mit Dicke) / IfcMaterialConstituentSet | Text | m | P | IFC | [15][30] |
| Materialname → KBOB-ID (Mapping-Tabelle) | ID | – | P | Projektbibliothek | wie IfcLCA-Mapping «"Concrete C30/37": "KBOB_..."» [30]; LOIN-Parameter «KBOB_ID» ist Vorschlag, in keiner Quelle belegt |
| Phase / Renovierungsstatus (Existing/Demolish/New) | Auswahl | – | P bei Umbau | IFC Pset | [15] |
| Dichte-Override, Lebensdauer-Override | Zahl | kg/m³, a | O | Pset (Vorschlag) | vgl. CPset_Madaster «LifeSpan» [16] |
| IFC-Version, Exportdatum, Modellstand | Text | – | P | Datei | IFC4 bevorzugt [15][30] |

Ein KBOB-Fachdatenkatalog mit LOIN-Zuordnung (Attribute Material, Abmessungen pro Phase) wurde in den Suchergebnissen als Prototyp erwähnt (Repository «bbl-dres/kbob-fdk»), war aber nicht abrufbar (nicht verifiziert).

### 5.4 Was «ECCO» (Modell ecCo) voraussichtlich braucht

Aus dem Konzept lässt sich nur ableiten [2]: eine THG-Bilanz nach GHG Protocol, jährlich, pro Verwaltungseinheit/Schlüsselverwaltungseinheit (z. B. «Gebäudeportfolio»), mit definierter Systemgrenze, geliefert vom BBL als Datenlieferant über das THG-Tool oder eine Schnittstelle. Daraus folgt als Vorschlag für den Export aus THG-32: Objekt-ID, Berichtsjahr, THG Erstellung absolut (kg CO₂-eq) und annualisiert (kg CO₂-eq/a), Aufteilung nach Modulen, Scope-3-Kategorie, Methode (SIA 2032), KBOB-Version, Datenqualität, Kohlenstoffspeicher separat. Ob ecCo annualisierte Werte (60 Jahre) oder Jahr-der-Erstellung-Werte verlangt, ist offen und entscheidend (nicht verifiziert).

---

## 6. Offene Fragen / nächste Schritte

1. **ecCo-Schnittstelle klären:** Beim GS-UVEK (ecco@gs-uvek.admin.ch) bzw. beim BBL-Vertreter im GMS nachfragen, in welcher Form Erstellungsemissionen von Gebäuden im THG-Tool erfasst werden (annualisiert vs. Investitionsjahr; Systemgrenze; Datenformat) [1][2].
2. **«Anleitung TP2 NettoNull» beschaffen** und den Kontrollwert 9.1 kg CO₂-eq/m² EBF·a auf Systemgrenze, Gebäudekategorien und KBOB-Version prüfen; Abgleich mit Minergie-ECO GW1/GW2 und SIA 390/1-Richtwerten [7][10].
3. **SIA 2032:2020 und SIA 390/1:2025 im Original** beschaffen (Anhang C Amortisationszeiten 2020, Richtwerttabellen); diese Notiz stützt sich auf die Korrigenda 2013 und Sekundärquellen.
4. **Elementgruppenliste der Maske anpassen:** SIA-2032-Liste (B06/B07, C01–C04, D01/D05/D07/D08, E01–E03, F01, G01–G04) statt Hauptgruppen; «I Umgebung» nur mit Begründung [7][11].
5. **KBOB-Versionierung** einplanen: Liste 2027 mit neuer UVEK-Datenbank angekündigt; Kennwerte ändern sich [4][35].
6. **Tool-Exportformate prüfen** (Lesosai, Thermo, GREG, Enerweb, One Click LCA): Welche liefern Elementgruppen-, Schicht- und Modulaufteilung maschinenlesbar? Netto-Null verlangt eine Exportfunktion [9].
7. **BIM-Pilot:** Ein BBL-Projekt mit IFC + eBKP-H-Klassifikation durch IfcLCA (open source) laufen lassen, um Stufe (c) zu testen [30].
8. **Restwert/Bestand:** Für Umbauten Datenfelder für Restwert und erhaltene Bauteile nach SIA 2032 Anhang F vorsehen [3][33].

---

## 7. Quellen (alle abgerufen am 2026-11-03)

1. UVEK, «Vorbildfunktion Bundesverwaltung im Bereich Klima – Modell ecCo»: https://www.uvek.admin.ch/de/ecco
2. GS-UVEK, «Konzept der Organisation zur Umsetzung der Vorbildfunktion der zentralen Bundesverwaltung im Bereich Klima: Modell ecCo», V1.0, 29.10.2025: https://www.uvek.admin.ch/dam/de/sd-web/UWaTf382SD1K/Konzept%20Organisation%20Vorbildfunktion%20zentrale%20BV%20Bereich%20Klima_Modell%20ecCo_V1.0%20DE.pdf
3. KBOB, Faktenblatt «Graue Treibhausgasemissionen bei der Erstellung von Gebäuden», V1, 04.04.2025: https://www.kbob.admin.ch/dam/de/sd-web/EVJE4OxZ16O1/20250404_FB_Graue_Treibhausgasemissionen_DE.pdf
4. KBOB, Seite «Ökobilanzdaten im Baubereich»: https://www.kbob.admin.ch/de/oekobilanzdaten-im-baubereich
5. KBOB/ecobau-Liste 2022, Version 9.0 (XLSX): https://www.kbob.admin.ch/dam/de/sd-web/GUOl1trUNEVH/%C3%96kobilanzdaten_im_Baubereich_V9.0.xlsx
6. Plattform Ökobilanzdaten im Baubereich, «Regeln für die Ökobilanzierung von Baumaterialien und Bauprodukten in der Schweiz», Version 9.0, 01.09.2026: https://www.kbob.admin.ch/dam/de/sd-web/2F8oM9Rvsj83/Plattform_OeDB_Bilanzierungsregeln_Baustoffe_v9.0.pdf
7. Minergie, «Berechnung der Grauen Energie und der Treibhausgasemissionen beim Minergie Zusatzprodukt ECO», Version 2023.2, 31.10.2023: https://www.minergie.ch/media/231031_me-eco_berechnung_graue_energie-thge_v2023-2_de.pdf (Version 2023.3 vom 26.11.2024, fr: https://www.minergie.ch/media/241126_zus_eco_berechnung_graue_energie-thge_v2023-3_fr.pdf)
8. Minergie, «Minergie-Nachweis Bereich Erstellung – Methodik, Funktionsweise und Aufbau», 20.05.2026: https://www.minergie.ch/media/erlaeuterungsbericht-nachweis-bereich-erstellung.pdf
9. Minergie, «Produktreglement Minergie-Netto-Null», Version 2026.1: https://www.minergie.ch/media/produktreglement-minergie-netto-null-v2026-1.pdf
10. Minergie, «Vergleich Minergie – Klimapfad (SIA 390/1)»: https://www.minergie.ch/media/vergleich_minergie-klimapfad.pdf
11. SIA, «Korrigenda C1 zu SIA 2032:2010 Graue Energie von Gebäuden» (2013), inkl. Anhang C Amortisationszeit und Anhang D Berechnungstabelle: https://shop.sia.ch/8d7e837c-2888-4e04-b628-f36edbd1d39c/D/DownloadAnhang
12. SNV Insights, «Klimapfad – Treibhausgasbilanz über den Lebenszyklus von Gebäuden, SN 591390/1:2025»: https://insights.snv.ch/en/page/klimapfad-treibhausgasbilanz-uber-den-lebenszyklus-en
13. CRB, «Anwenderhandbuch Elementbasierter Baukostenplan Hochbau eBKP-H» (2020), Auszug: https://www.crb.ch/_Resources/Persistent/0/a/f/3/0af357470aeba9a335a55a44d1901f45b0970bc1/Auszug_AWHB_eBKPH_2020_web_03_2021_DE.pdf
14. NNBS, «Neues beim SNBS», September 2023: https://nnbs.ch/wp-content/uploads/2023/09/2023-09-Neues-beim-SNBS.pdf
15. Madaster, «IFC-Richtlinien» (CH, DE): https://docs.madaster.com/files/ch/de/IFC%20-%20Richtlinien_CH%20DE.pdf
16. Madaster, «Preparing BIM/IFC source files» (CPset_Madaster): https://docs.madaster.com/gb/en/knowledge-base/preparing-bim-ifc-source-files
17. Madaster, «Preparing Excel source files»: https://docs.madaster.com/gb/en/knowledge-base/preparing-excel-source-files
18. Madaster, «Kalkulationen» (CH): https://docs.madaster.com/ch/de/knowledge-base/calculations
19. Madaster, «Datenbanken» (CH): https://docs.madaster.com/ch/de/knowledge-base/databases
20. Building Transparency, EC3 «Plan & Compare Buildings»: https://docs.buildingtransparency.org/ec3/main-features/plan-and-compare-buildings
21. Building Transparency, EC3 «Project Quick Start Guide»: https://docs.buildingtransparency.org/ec3/getting-started/project-quick-start-guide
22. One Click LCA, «Graue Energie Tool – comply with Minergie using One Click LCA»: https://help.oneclicklca.com/en/articles/663332-graue-energie-tool-comply-with-minergie-using-one-click-lca
23. BBSR, «ÖKOBAUDAT – Erforderliche Materialangaben bei der Datenübergabe von EPD-/Ökobilanzdaten (Anwendung Gebäudeökobilanzierung, eLCA)», V2, 21.11.2024: https://oekobaudat.de/fileadmin/downloads/2024-11-21_Anleitung_Materialangaben.pdf
24. ÖKOBAUDAT, «Ökobilanzierung im Bauwesen: die Online-Baustoffdatenbank ÖKOBAUDAT und das Ökobilanzierungstool eLCA»: https://www.oekobaudat.de/info/aktuelle-informationen/artikel/oekobilanzierung-im-bauwesen-die-online-baustoffdatenbank-oekobaudat-und-das-oekobilanzierungstool-el.html
25. eLCA Bauteileditor: https://www.bauteileditor.de/
26. Bauteilkatalog (ecobau/BFE): https://www.bauteilkatalog.ch/
27. ecobau, Umweltrechner für Baumaterialien und Bauteile: https://calc.ecobau.ch/
28. E4tech Software, Produktübersicht Lesosai / Eco-Sai: https://www.e4tech-software.com/en/logiciels/
29. Citherlet et al., «Eco-Bat: A design tool for assessing environmental impacts of buildings and equipment» (HEIG-VD): https://doc.rero.ch/record/314797?ln=de
30. IfcLCA (Open Source): https://github.com/IfcLCA/IfcLCA und IfcLCA-Py: https://github.com/IfcLCA/IfcLCA-Py
31. CH LCA data (KBOB Open Data, API): https://lcadata.ch
32. EcoTool, Dokumentation «Amortisationszeit» (SIA 2032 Anhang C): https://ecotool.org/de/dokumentation/datengrundlage/amortisationszeit
33. Fahrländer Partner im Auftrag BAFU, «PACTA CO2-Rechner – Dokumentation», 31.10.2024 (Scope 3, SIA 2032 Anhang F): https://www.bafu.admin.ch/dam/en/sd-web/DVy64CzUV6wk/Methodenbericht%202024%20zum%20erweiterten%20CO2-Rechner%20f%C3%BCr%20Geb%C3%A4ude.pdf
34. BFE/BAFU/BKB/KBOB/GS VEK, «Vorbildfunktion Kantone und bundesnahe Betriebe im Rahmen des Artikel 10 Absatz 4 KlG – Grobkonzept», 15.11.2025: https://www.vorbild-energie-klima.admin.ch/dam/en/sd-web/W3NvaRCvJpX6/VEK-2040-Grobkonzept-DE.pdf
35. ESU-services, «Datenerhebung für Ihre Baustoffprodukte (KBOB/ecobau-Liste 2027)»: https://esu-services.ch/de/kbob-oekobilanz-bauprodukt/
36. Firmenprofil ECCO2 Solutions AG (ausgeschlossener Kandidat): https://c.parsers.vc/startup/ecco2.ch/
