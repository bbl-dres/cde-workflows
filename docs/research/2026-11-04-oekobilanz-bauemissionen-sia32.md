# Ökobilanz Bauemissionen (THG-32): KBOB-Daten, ecobau, SIA 390/1 und Datenmodell für den Prototyp

**Stand:** 4. November 2026 (alle Quellen abgerufen am 2026-11-04)
**Kontext:** Prototyp CDE Bund (BBL), Datenformular «THG-32 · Ökobilanz Bauemissionen (SIA 32)»; baut auf der Notiz [docs/research/2026-11-03-thg-reporting-datenpunkte.md](2026-11-03-thg-reporting-datenpunkte.md) auf (Normen, Tools, Datenmodell-Stufen a/b/c) und wiederholt diese nicht.
**Zweck:** Die Demo realistisch machen: Struktur und Inhalt der KBOB/ecobau-Liste V9.0 aus der Originaldatei dokumentieren, die ecobau-Instrumente (ecoBKP/ecoDevis) und die Ziel-/Grenzwerte (SIA 390/1, Minergie-ECO, SNBS) für Verwaltungsbauten belegen und daraus ein konkretes Datenmodell mit Beispielzeilen für ein Verwaltungsgebäude (6480 m² GF / 5600 m² EBF) ableiten.
**Abgrenzung:** Die CDE rechnet nicht; die Berechnung erfolgt in einem Ökobilanztool, die Konsolidierung im Modell ecCo. Alle Zahlen der Beispielzeilen sind Modellannahmen («fiktiv»), die Kennwerte dahinter stammen aus den zitierten Quellen. Nicht verifizierte Aussagen sind markiert.

---

## 1. Ergebnis in Kürze

- **Die KBOB/ecobau-Liste 2022, Version 9.0 ist eine Materialliste, kein Bauteilkatalog.** Die Datei (605 kB, auf der KBOB-Seite datiert 14.07.2026) enthält 815 Datensätze in fünf Datenblättern: 352 Baumaterialien (davon 104 hersteller- oder herstellerregionenspezifisch), 67 Gebäudetechnik, 103 Energie, 70 Transporte, 223 Entsorgung. Jeder Datensatz hat eine «ID-Nummer», eine «UUID-Nummer», eine Bezugsgrösse («Bezug»: kg, m², m³, Stk., m² EBF, m, kWp, kWh), «Rohdichte/Flächenmasse» und die Indikatoren UBP'21, Primärenergie (gesamt/erneuerbar/nicht erneuerbar, je Herstellung und Entsorgung), «Treibhausgasemissionen» (Total/Herstellung/Entsorgung, kg CO₂-eq) und «Biogener Kohlenstoff» (kg C) [1][2]. Hintergrunddaten: «UVEK Ökobilanzdatenbestand DQRv2:2022» [2]. Nächste Gesamtrevision Anfang 2027 [1][4].
- **ecoBKP und ecoDevis sind Materialwahl- und Ausschreibungshilfen entlang BKP bzw. NPK, keine Ökobilanzstrukturen.** Der ecoBKP 2026 ist nach dreistelligen BKP-Positionen gegliedert (30 BKP-Gruppen), der ecoDevis nach NPK-Kapiteln (45 NPK-Gruppen) [5][6][7]. Eine eBKP-H-Variante gibt es nicht; nur das zweistellige Kapitel «ecoBKP 21» vergleicht Bauteile und versieht sie mit eBKP-H-Codes (C01, C02, C04) [5]. Die Ökobilanz nach SIA 2032, Minergie-ECO und SNBS läuft dagegen über eBKP-H-Elementgruppen [16][17][20].
- **Zielwerte für Verwaltungsbauten (Neubau, kg CO₂-eq/m² EBF·a, Erstellung):** SIA 390/1 Richtwert Basis 9.0, ambitioniert 6.0 (gilt für alle Gebäudekategorien) [12][13]; Umbau 5.0 [15]; Minergie-ECO GW1 8.0 / GW2 11.0, Minergie-Baustandard 13.6 (Version 2023.2) bzw. 12 (Minergie 2024) [12][18]; MuKEn 2025 (Vernehmlassung) 13 [12]; SNBS-Hochbau 311 Note 6 bei ≤ GW1, Note 4 bei ≤ GW2 [20]. Der im Prototyp hinterlegte «Zielwert SIA 390/1 Erstellung 9.0» ist damit korrekt.
- **Das BBL verwendet SNBS-Hochbau als Planungsgrundlage und «ergänzend und projektspezifisch das passende Minergie-ECO Label und den SIA-Klimapfad (SIA 390/1)»** [23]. Die Ökobilanz-Methodik ist in allen drei Systemen dieselbe (SIA 2032, KBOB-Liste, 60 Jahre, Amortisation nach Anhang C, Bezug EBF) [8][17][20]. Eine «Anleitung TP2» des Bundes ist öffentlich weiterhin nicht auffindbar (vgl. Vornotiz, Abschnitt 2.5).
- **Empfehlung für die Maske:** Ergebnisse je eBKP-H-Elementgruppe (nicht nur Hauptgruppe) mit Menge, Konstruktionstyp bzw. massgebenden KBOB-IDs, THG Herstellung und Entsorgung getrennt, Amortisationszeit und daraus abgeleitetem Jahreswert; Hauptgruppen als Summen; EPDs nur als Referenz zur KBOB-ID; Metadaten (KBOB-Listenversion, Tool, Systemgrenze, EBF/GF). Die im Prototyp genannten Grössenordnungen (Summe ≈ 2.9 Mio kg, Endwert ≈ 9 kg CO₂-eq/m² EBF·a) sind plausibel; die Aufteilung ist es nicht ganz: «Technik ≈ 0.3 Mio» ist über 60 Jahre zu tief (realistisch ≈ 0.8 Mio, 25–30 %), «Konstruktion ≈ 1.7 Mio» zu hoch (Abschnitt 5.4).

---

## 2. KBOB/ecobau-Liste «Ökobilanzdaten im Baubereich», Version 9.0 (Originaldatei)

### 2.1 Herkunft und Versionierung

- Herausgeber ist die «Plattform Ökobilanzdaten im Baubereich» (KBOB, ecobau, IPB; Geschäftsführung treeze Ltd.), die Daten sind kostenlos [1][4]. Die KBOB-Seite listet: «Ökobilanzdaten im Baubereich (Version 9.0)», XLSX, 605.13 kB, 14.07.2026; «Regeln für die Ökobilanzierung von Baustoffen und Bauprodukten in der Schweiz, v9.0», 01.09.2026; «Präzisierungen zu Modul D, v1.0» und «Präzisierungen zu Zirkularitätsindex (CIC), v1.0», beide 01.09.2026; Archiv mit Version 8.02 (16.03.2026), 8.0 (04.03.2026), 7.0 (09.02.2026), 6.2, 6, 5 sowie den PDF-Empfehlungen 2009/1:2012, :2014, :2016 [1].
- Titelzelle der Datei: «KBOB/ecobau-Liste 2022, Version 9.0»; das Blatt Entsorgung trägt zusätzlich «KBOB / ecobau / IPB 2009/1:2022» [2]. Blatt «Erläuterung»: «Die Ökobilanz-Kennwerte wurden mit aktualisierten Hintergrunddaten (UVEK Ökobilanzdatenbestand DQRv2:2022) gerechnet.» Legende: schwarz = aktualisierte Hintergrunddaten, rot = Sachbilanz aktualisiert bzw. neu, «blau schattiert: hersteller- oder herstellerregionenspezifische Datensätze» [2].
- Blatt «Anpassungen» (8.02 → 9.0): «Namen der Liste vereinheitlicht (KBOB/ecobau-Liste 2022)», «Format der ID-Nummern Baumaterialien harmonisiert», 01.002.33–35 «Neue herstellerspezifische Einträge zu Beton», 07.002.02 «Neuer herstellerspezifischer Eintrag zu Holz und Holzwerkstoff», 10.005.02 «neue UUID Nummer, da doppelt vergeben», 14.008 «Flächengewicht auf 1.05 kg/m2 korrigiert» [2]. Die Kennwerte ändern sich also auch innerhalb der «Liste 2022» von Version zu Version; die Versionsnummer ist Teil des Datensatzes.
- Wichtiger Hinweis in der Datei: «Für biogenen Kohlenstoff in Baumaterialien ... werden keine Negativemissionen ausgewiesen. Regeln zur Anrechnung von Negativemissionen sind auf Ebene Gebäude festzulegen» [2]. Treibhausgasemissionen: «Biogenes CO2 wird als nicht klimawirksam betrachtet. Sein Treibhauspotenzial ist 0 kg CO2-eq/kg.» Treibhauspotenziale nach dem 5. IPCC-Sachstandsbericht (2013) [2].
- ecobau nennt als Datum der Version 9 den 17.07.2026 und kündigt an: «Die nächste Überarbeitung der Daten findet auf Anfang 2027 statt.» [4] Die Bilanzierungsregeln v9.0 verweisen für die «KBOB/ecobau-Liste 2027» auf die Hintergrunddaten «BAFU:2026» [3].

### 2.2 Blätter und Spalten

| Blatt | Datensätze | Gruppen (ID-Präfix) | Spalten (Kopfzeilen 4–9 der Datei, Einheiten in Zeile 9) |
|---|---|---|---|
| «Erläuterung Explication» | – | – | Definitionen UBP'21, Primärenergie erneuerbar / nicht erneuerbar («Graue Energie»), Treibhausgasemissionen, biogener Kohlenstoffgehalt; Legende; Hinweis Negativemissionen [2] |
| «Anpassungen Mises à jour» | – | – | «ID», «Anpassungen von Version 8.02 zu Version 9.0» (DE/FR), Historie bis Version 7.1 [2] |
| «Baumaterialien Matériaux» | 352 (248 Durchschnitt, 104 herstellerspezifisch) | 0, 01–15, 21 | A «ID-Nummer», B «UUID-Nummer», C «BAUMATERIALIEN», D «ID-Nummer Entsorgung», E «Entsorgung» (Name des verknüpften Entsorgungsdatensatzes), F «Rohdichte/Flächenmasse», G «Bezug / Référence»; H–J «UBP'21» Total / Herstellung / Entsorgung [UBP]; K–O «Primärenergie gesamt» Total / Herstellung total / Herstellung energetisch genutzt / Herstellung stofflich genutzt / Entsorgung [kWh oil-eq]; P–T «erneuerbar» (gleiche fünf); U–Y «nicht erneuerbar (Graue Energie)» (gleiche fünf); Z–AB «Treibhausgasemissionen» Total / Herstellung / Entsorgung [kg CO2-eq] («IPCC GWP 100a»); AC «Biogener Kohlenstoff – im Produkt enthalten» [kg C]; AD–AE französische Namen [2] |
| «Gebäudetechnik Technique» | 67 | 31 Heizungsanlagen, 32 Lüftungsanlagen, 33 Sanitäranlagen, 34 Elektroanlagen | ID, UUID, Name, ID/Name Entsorgung, «Bezug» als Grösse + Einheit (EBF m², Sondenlänge m, Gerät Stk., Masse kg, Kollektorfläche m², Max. Leistung kWp); UBP, Primärenergie gesamt/erneuerbar/nicht erneuerbar, THG, je Total / Herstellung / Entsorgung [2] |
| «Energie Énergie» | 103 | 41 Brennstoffe, 42 Fernwärme, 43 Nutzwärme, 44 Nutzwärme am Standort erzeugt, 45 Elektrizität vom Netz, 46 Elektrizität am Standort erzeugt | ID, UUID, Name, «Bezug» (Endenergie / Nutzwärme, kWh), UBP'21, Primärenergie gesamt / erneuerbar / nicht erneuerbar / «erneuerbar am Standort», THG [kg CO2-eq/kWh] [2] |
| «Transporte Transports» | 70 | 61 Treibstoffe, 62 Güter-Transporte, 63/64 Personen-Transporte | ID, UUID, Name, «Bezug» (Endenergie kWh, Transportleistung tkm/pkm, Aushubvolumen m³), je Indikator Total / Betrieb / Fahrzeug / Infrastruktur; THG «und Klimaeffekte Flugzeugemissionen, RFI=2.5» [2] |
| «Entsorgung Déchets» | 223 | 91 Entsorgung Baumaterialien, 92 Entsorgung Gebäudetechnik | ID, UUID, Name, «Bezug» (kg oder m²), UBP, Primärenergie, THG, je Total / Herstellung / Entsorgung (nur Entsorgung belegt) [2] |

Die herstellerspezifischen Zeilen sind in der Excel-Datei als gruppierte Unterzeilen ausgeblendet («Anzeigen der herstellerspezifischen und herstellerregionenspezifischen Daten durch Anklicken der '+' am linken Rand») und tragen siebenstellige IDs (z. B. 01.002.05) [2][3]. Sortierkriterium: «1. Gruppe gemäss vorderem Teil der ID-Nummer (z.B. ID-Nr. 06.xxx) 2. innerhalb Gruppe alphabetisch nach Name in deutscher Sprache» [2].

### 2.3 Materialgruppen (Blatt Baumaterialien)

0 Vorbereitungsarbeiten · 01 Beton · 02 Mauersteine · 03 Andere Massivbaustoffe · 04 Mörtel und Putze · 05 Fenster, Sonnenschutz, Fassadenverkleidungen · 06 Metallbaustoffe · 07 Holz und Holzwerkstoffe · 08 Klebstoffe und Fugendichtungsmassen · 09 Dichtungsbahnen und Schutzfolien · 10 Wärmedämmstoffe · 11 Bodenbeläge · 12 Türen · 13 Rohre · 14 Anstrichstoffe, Beschichtungen · 15 Kunststoffe · 21 Kücheneinbauten und -möbel [2].

### 2.4 Beispielzeilen (Werte aus der Datei, kg CO₂-eq je Bezugseinheit)

| ID-Nummer | Bezeichnung | Rohdichte / Flächenmasse | Bezug | UBP'21 Total | THG Total | THG Herstellung | THG Entsorgung | Biogener C [kg C] | ID Entsorgung |
|---|---|---|---|---|---|---|---|---|---|
| 01.002 | Hochbaubeton (ohne Bewehrung) | 2300 kg/m³ | kg | 153 | 0.101 | 0.0887 | 0.0126 | 0 | 91.061 |
| 01.002.05 | Hochbaubeton, zirkulit® NPK A, 280kg CEM II/C-M (ohne Bewehrung) (herstellerspezifisch) | 2208.7 | kg | 122 | 0.0765 | 0.0635 | 0.013 | 0.001 | 91.061 |
| 02.001 | Backstein | 900 | kg | 371 | 0.266 | 0.254 | 0.0127 | 0 | 91.136 |
| 06.003 | Armierungsstahl | 7850 | kg | 1590 | 0.785 | 0.773 | 0.0122 | 0 | 91.143 |
| 06.012 | Stahlprofil, blank | 7850 | kg | 1290 | 0.737 | 0.73 | 0.00693 | 0 | 91.143 |
| 06.002 | Aluminiumprofil, blank | 2690 | kg | 11500 | 5.7 | 5.69 | 0.00792 | 0 | 91.141 |
| 07.003 | Brettschichtholz | 439 | kg | 769 | 0.335 | 0.286 | 0.0492 | 0.446 | 91.047 |
| 07.003.01 | Brettschichtholz, Produktion Schweiz | 439 | kg | 681 | 0.253 | 0.204 | 0.0492 | 0.447 | 91.047 |
| 10.008 | Steinwolle | 32–160 | kg | 1360 | 0.816 | 0.757 | 0.0592 | 0 | 91.173 |
| 10.001 | Glaswolle | 20–100 | kg | 1960 | 1.1 | 1.04 | 0.0592 | 0 | 91.173 |
| 10.004 | Polystyrol expandiert (EPS) | 15–40 | kg | 9800 | 7.6 | 4.51 | 3.09 | 0 | 91.151 |
| 10.010 | Zellulosefasern | 35–60 | kg | 556 | 0.28 | 0.209 | 0.0709 | 0.404 | 91.046 |
| 05.006 | Fensterrahmen Holz-Metall 7,6 | 170.2 kg/m² | m² | 808000 | 397 | 354 | 43 | 37.8 | 91.030 |
| 03.005 | Flachglas beschichtet | 2500 | kg | 1990 | 1.2 | 1.18 | 0.0191 | 0 | 91.032 |
| 12.008 | Aussentüre, Holz | 45.3 kg/m² | m² | 125000 | 62.2 | 54.6 | 7.64 | 15.5 | 91.164 |
| 03.008 | Gipskartonplatte | 850 | kg | 523 | 0.301 | 0.283 | 0.0187 | 0.018 | 91.063 |
| 11.014 | Linoleum, 2.5 mm | 2.9 kg/m² | m² | 15800 | 6.36 | 5.84 | 0.516 | 0.786 | 91.012 |
| 34.002 | Elektroanlagen Büro (Gebäudetechnik) | – | m² EBF | – | 24.1 | 22.6 | 1.47 | – | – |
| 32.006 | Lüftungsanlage, spez. Luftmenge 4 m3/hm2 EBF | – | m² EBF | – | 30.6 | 29.8 | 0.748 | – | – |
| 31.016 | Erdsonden, für Sole-Wasser-Wärmepumpe | – | m Sondenlänge | – | 23.2 | 20.7 | 2.56 | – | – |
| 34.024 | Solarstromanlage, Marktmix | – | kWp | – | 1070 | 1070 | inkl. | – | – |
| 45.020 | CH-Verbrauchermix (Energie) | – | kWh Endenergie | 515 | 0.125 | – | – | – | – |
| 62.001 | Aushub maschinell, Durchschnitt (Transporte) | – | m³ Aushubvolumen | – | 0.433 | – | – | – | – |
| 91.061 | Entsorgung, Beton | – | kg | – | 0.0127 | – | 0.0127 | – | – |

Beobachtungen aus der Datei: (a) Die Zeilen 07.002 und 07.003 heissen beide «Brettschichtholz» und tragen identische Werte (nur 07.002 hat den Untereintrag 07.002.02 «Brettstapel Strattura»); Ursache nicht geklärt. (b) Die Fensterdatensätze tragen Zusätze «7,5/7,6» bzw. «2,5/2,6» (05.004–05.007, 05.029–05.032), die in der Datei nicht erläutert sind; vermutlich Rahmenanteil (Annahme). (c) Rohdichte ist teils als Bereich («32-160») oder Zeichenkette angegeben, also nicht direkt rechenbar; eine Import-Routine muss das abfangen. (d) Bei Bezug «kg» braucht jede Materialzeile Dicke und Dichte, bei Bezug «m²» (Fenster, Türen, Beläge) die Bauteilfläche, bei Gebäudetechnik meist die EBF.

### 2.5 Konsequenzen für die Maske

Die Liste liefert Kennwerte pro Material oder Anlage, getrennt nach Herstellung und Entsorgung; Ersatz (B4) und Jahreswerte entstehen erst durch die Amortisationszeit der eBKP-H-Elementgruppe (SIA 2032 Anhang C) [8][16]. Für eine nachvollziehbare Ergebnisübernahme muss die Maske deshalb pro Zeile mindestens führen: KBOB-ID (und UUID), Listenversion, Bezugseinheit, Menge in dieser Einheit, THG Herstellung und Entsorgung getrennt, Amortisationszeit. Open-Data-Spiegel: lcadata.ch (LT Plus AG, AGPL-3.0; «Excel, CSV and JSON export functionality available»; «This data is not created or verified by us») [31]; das Feldschema der API wurde nicht verifiziert.

---

## 3. ecobau-Instrumente, SIA 2032, SIA 390/1, Minergie-ECO/SNBS und Bund

### 3.1 ecoBKP, ecoDevis, ecoProdukte (BKP und NPK, nicht eBKP-H)

- **ecoBKP 2026:** «Vorgaben an ökologische und gesunde Baumaterialien und Prozesse ... für Planung und Ausschreibung», «für 30 BKP-Gruppen» [7]. Kapitel nach dreistelligen BKP-Positionen (z. B. 112 Abbrüche/Rückbau, 201 Baugrubenaushub, 211 Baumeisterarbeiten, 213/214/215 Montagebau, 221 Fenster, 224 Bedachung, 225 Dichtungen/Dämmungen, 226 Fassadenputze, 230 Elektro, 240 Heizung, 244 Lüftung, 250 Sanitär, 271 Gipser, 273 Schreiner, 281–285 Beläge/Bekleidungen, 287 Baureinigung, 421 Gartenarbeiten); je Kapitel die Reiter «Material/Prozess», «Vorgaben», «Hinweise/Quellen»; Empfehlungen als «1. Priorität», «2. Priorität», «nicht empfohlen»; Verweise auf Minergie-ECO («Ausschlussvorgabe Minergie-ECO 120.04», «Vorgabe Minergie-ECO 210.07») [5][9]. Minergie beschreibt ihn als «ecoBKP – nachhaltig planen und bauen nach BKP» und «Nachschlagewerk für gesundes, kreislauffähiges und ökologisches Bauen» [9]. Französische Variante: ecoCFC [5].
- **Einziger eBKP-H-Bezug:** Kapitel ecoBKP 21: «Die dreistelligen BKP-Positionen sind nach Gewerken gegliedert, wodurch gewerkeübergreifende Empfehlungen nicht möglich sind. In diesem zweistelligen BKP werden deshalb Varianten empfohlen, die auf dem Vergleich typischer Baukonstruktionen beruhen.» «Die Bauteilbezeichnungen sind jeweils gefolgt vom Code nach eBKP-H.» Verglichen werden u. a. «Fundament, Bodenplatte gedämmt (C01)», «Aussenwandkonstruktion über Terrain (C02)», «Dachkonstruktion über Terrain (C04)», «Deckenkonstruktion ... (C04)» [5]. Als Grundlage nennt ecobau «Anhang D der Norm SIA 390/1» mit «über 70 Bauteile[n] oder Komponenten mit ihrer Umweltwirkung» [5]; laut Inhaltsverzeichnis der SIA 390/1:2025 ist Anhang D jedoch «(normativ) Personenflächen und alternative Bezugsgrössen» [10]. Gemeint ist vermutlich die Berechnungstabelle in SIA 2032:2020 Anhang D (nicht verifiziert).
- **ecoDevis 2026:** «nachhaltig nach NPK ausschreiben», «für 45 NPK-Gruppen», integriert in «von der CRB zertifizierte Devisierungsprogramme mit IfA18-Schnittstelle» [7][9]. Jedes ecoDevis hat «Allgemeine Anforderungen» und «Materialvorgaben» und verweist auf konkrete NPK-Positionen («RC-Beton kann im NPK 315 mit der Position 064 ausgeschrieben werden») [6]. EPDs kommen nur am Rand vor: «Der RC-Anteil kann z.B. der Umwelt-Produktedeklaration (EPD) entnommen werden» [5].
- **ecoProdukte:** Produktelabel (eco1, eco2, ecoBasis), «kompatibel mit ... ecoBKP und ecoDevis, sowie mit den Vorgaben der Gebäudelabels Minergie(-P/-A)-ECO, SNBS und SGNI» [9]. Seit 2025 stützen sich ecoDevis, ecoBKP und ecoProdukte «auch auf Treibhausgasemissionen als Bewertungskriterium» [8].
- **Fazit:** BKP (SN 506 500) gliedert nach Arbeitsgattungen, NPK nach Leistungspositionen; beides ist für die Materialwahl und Ausschreibung gedacht. Die Ökobilanz eines Gebäudes braucht Bauteile mit Flächen und Amortisationszeiten, und dafür verwenden SIA 2032, Minergie-ECO und SNBS den eBKP-H (SN 506 511) [16][17][20]. ecobau selbst: «Die Werte ... werden auf Bauteilebene anhand der Mengen summiert, woraus sich eine Gebäudebilanz ergibt» und «Für die Lebensdauer der Bauteile werden theoretische Amortisationszeiten verwendet (siehe SIA Merkblatt 2032, Anhang C)» [8].

### 3.2 SIA 2032 (Graue Energie – Ökobilanzierung für die Erstellung von Gebäuden)

Ergänzend zur Vornotiz: «Ausser bei der Baugrube und der Tragkonstruktion (Elementgruppen B und C) entspricht die Amortisationszeit der Nutzungsdauer. Für die Baugrube und die Tragkonstruktion wird die Amortisationszeit niedriger angesetzt ... damit kommende Generationen nicht mit den Abschreibungen für die heutigen Investitionen in Graue Energie belastet werden» [16]. Anhang D (Berechnungstabelle Vorstudien/Vorprojekt, Datenstand 2012) liefert Bauteil-Kennwerte mit Amortisationszeit, z. B. Fenster «Mittelwert 2-fach-/3-fach Verglasung» 150 kg Erstellung + 7 kg Entsorgung je m² BTF, 30 Jahre; Betondecke 82 + 7 kg/m², 60 Jahre; Flachdachaufbau gedämmt 42 + 26 kg/m², 30 Jahre; Elektroanlage Büro 21 + 10 kg/m² EBF, 30 Jahre; Aushub ohne Grundwasser 8.7 kg/m³, 60 Jahre [16]. Die SNBS verweist zudem auf «SIA 2032:2020 ... Anhang B – Einflussgrössen» [20].

### 3.3 SIA 390/1:2025 «Klimapfad – Treibhausgasbilanz über den Lebenszyklus von Gebäuden»

- SN 591390/1:2025, gültig ab 1.2.2025, 52 Seiten, «Ersetzt SIA 2040:2017»; genehmigt am 5.12.2024 [10] (SNV nennt 56 Seiten [11]). Inhalt: 2.3 Anforderungen Wohnen, 2.4 Anforderungen Büro, 2.5 Schule, 2.6 Verkauf, 2.7 Restaurant; 3.2 Erstellung, 3.3 Betrieb, 3.4 Mobilität; Anhänge A (informativ) Herleitung der Zielwerte, B Beiträge zu Netto-Null, C Primärenergie nicht erneuerbar, D (normativ) Personenflächen und alternative Bezugsgrössen, E Betriebsenergiebedarf, F Einflussfaktoren, G Publikationen [10]. Grundlage sind «die SIA-Merkblätter 2031 ..., 2032 ... und 2039 ... sowie die Dokumentation (SIA D 0236)» [12].
- Vorwort: «Die Basis-Zielwerte (Zielwert B) dieser Norm, welche sinngemäss den bisherigen Zielwerten im SIA-Effizienzpfad entsprechen, sind wirksam und ab sofort umzusetzen. Die neu angesetzten ambitionierten Zielwerte (Zielwert A) sind bei konsequentem Einsatz aller Mittel heute erreichbar»; «Auf Festlegungen zur Anrechenbarkeit ... von Negativemissionen wird in dieser Norm verzichtet. Biogen eingelagerter Kohlenstoff ... wird deshalb separat ausgewiesen»; «Bei den Messgrössen fokussiert die neue Norm auf die Treibhausgasemissionen» [10].
- Begriffe (nach Minergie): «Richtwerte ... Richtwerte müssen nicht eingehalten werden», «Zusatzanforderung B: Höchstwert für die Summe der Treibhausgasemissionen aus Erstellung und Betrieb», «Zielwert B: ... Höchstwert für die Summe ... aus Erstellung, Betrieb und Mobilität» [14].

| Zielwerte Erstellung Neubau (kg CO₂-eq/m² EBF·a) | Wohnen MFH | Wohnen EFH | Verwaltung/Büro | Schulen | Verkauf | Restaurants | Quelle |
|---|---|---|---|---|---|---|---|
| SIA 390/1 Richtwert Erstellung, Basis | 9 | 9 | 9 | 9 | 9 | 9 | Bundesrat, Tabelle 1 [12]; espazium: «Budget von 9 kg CO2/m² (Neubau, alle Gebäudekategorien)» [13] |
| SIA 390/1 Richtwert Erstellung, ambitioniert | 6 | 6 | 6 | 6 | 6 | 6 | [12] («rund 30 Prozent tiefer») |
| SIA 390/1 Richtwert Erstellung, Umbau | – | – | 5.0 | 5.0 | – | – | Kanton Zug: «Umbauten (Kategorien Verwaltungsbauten und Schulbauten) 5,0 kg CO2-eq/m2 und Jahr» [15] |
| Minergie 2024 (Baustandard, Grenzwert) | 11 | 12 | 12 | 11 | 17 | 14 | [12] |
| MuKEn 2025 (Vernehmlassung) | 12 | 13 | 13 | 12 | 18 | 15 | [12] |

Für Wohnen Neubau sind zusätzlich belegt: Betrieb B 2.0 / A 1.0, Mobilität B 4.0 / A 3.0, Zielwert B 13.0 / A 10.0, Zusatzanforderung B 11.0 / A 7.0 [13][29]. Die Betriebs- und Mobilitätsrichtwerte für Büro (Ziffer 2.4) konnten aus öffentlichen Quellen nicht verifiziert werden; sie sind in der Norm nachzuschlagen. Für SIA 2040:2017 gilt dasselbe (nur Wohnen-Werte öffentlich); da SIA 2040 ersetzt ist, sollte der Prototyp ausschliesslich SIA 390/1 referenzieren.

### 3.4 Minergie-ECO, Minergie und SNBS-Hochbau 311

- **Minergie-ECO (Berechnungsanleitung 2023.2):** «Die Nutzungsdauer von Gebäuden wird mit 60 Jahren angenommen. Die Amortisationsdauer der Bauteile richtet sich nach dem SIA-Merkblatt 2032. Der Bilanzperimeter umfasst das gesamte Gebäude inklusive beheizter und unbeheizter Gebäudeteile.» «Die Detaillierte Erfassung erfolgt nach Elementgruppen gemäss eBKP-H.» «Der Grenzwert 1 wurde in Anlehnung an die Richtwerte des SIA-Merkblatts 2040 ... festgelegt» [17]. Grenzwerte sind objektspezifisch (beheizt/unbeheizt, Zuschläge für PV 7.1 kg/m² Panelfläche, Kollektoren 5.6, Erdsonden 0.3 kg CO₂-eq/(m² EBF·a)) [18].

| Minergie, Version 2023.2 (kg CO₂-eq/m²·a) | ECO GW1 (EBF) | ECO GW2 (EBF) | Minergie-GW (EBF) | ECO GW1 / GW2 / Minergie-GW (GF–EBF, unbeheizt) |
|---|---|---|---|---|
| Wohnen MFH | 8.0 | 10.0 | 12.4 | 2.8 / 4.5 / 5.5 |
| Verwaltung | 8.0 | 11.0 | 13.6 | 2.8 / 4.5 / 5.5 |
| Schule | 8.0 | 11.0 | 12.4 | 2.8 / 4.5 / 5.5 |
| Verkauf | 11.0 | 16.0 | 19.9 | 2.8 / 4.5 / 5.5 |

Quelle: Tabelle «Bezeichnung ECO GWTHEBF1 / GWTHEBF2 / Minergie-GWTHEBF» [18]. Minergie zum Verhältnis zur SIA: «Im Mittel entspricht der Basis-Richtwert Erstellung für Neubauten in etwa dem Grenzwert 1 von ECO für beheizte Flächen. Der ambitionierte Richtwert ist wesentlich strenger» [14].

- **Minergie-Nachweis Bereich Erstellung (Erläuterungsbericht 2026):** Modellgebäude je Gebäudekategorie, Formel «Ökobilanz Modell [m² EBF·a] = Σ Ökobilanzen Bauteile [pro m² Bauteil] × Bauteilflächen Modell [m²] / EBF Modell [m²]»; Visualisierung nach Bauteilgruppen «Baugrube», «Untergeschosse», «Wände», «Decken», «Dach», «Fassade», «Haustechnik», «Photovoltaik», «Erdwärmesonde» («methodisch eine Abschätzung ... nicht Teil der Nachweisführung»); Referenz 85 Minergie-ECO-Projekte, davon 16 Verwaltung [19].
- **SNBS-Hochbau 2023.1, Kriterium 311 «Treibhausgasemissionen Erstellung»:** «Die Bewertungsmethode der Messgrösse 1 entspricht der Methodik gemäss Minergie-ECO»; «Gemäss Minergie-ECO (210.02), aktuelle Version». Notenskala (Messgrösse 1, 1–5.5 Punkte): Note 1 > 1.4·GW2, Note 2 1.4·GW2 bis 1.2·GW2, Note 3 1.2·GW2 bis GW2, Note 4 GW2 bis (GW1+GW2)/2, Note 5 (GW1+GW2)/2 bis GW1, Note 6 ≤ GW1 (jeweils +RW). Messgrösse 2 «Restwert aus rückzubauenden Bauten» (0/0.5 Punkte, Basiswerte 8 kg/m²·a Bestand, 10 kg/m²·a Neubau). «Kreislaufwirtschaft: Wiederverwendete Materialien und Bauteile dürfen mit «null» bilanziert werden.» «Bei einer vereinfachten Berechnung wird empfohlen, dem Resultat Reserven von 15 % zuzuschlagen.» Nachweis PZ (Vorprojekt): «SNBS-Hilfstool Energie und THGE», «Nachvollziehbare Berechnung der grauen Energie/THGE samt Plänen»; DZ (Bauabschluss): «Revidiertes SNBS-Hilfstool», «Detaillierte, nachvollziehbare Berechnung der grauen Energie/THGE samt Bauteilen und Plänen». Tools: SNBS-Hilfstool 311/312/313/321/322, greenBIM-Plug-in für Revit und ArchiCAD, «Von ecobau zugelassene Softwarelösungen (z. B. Enerweb 380/1 Eco, GREG, Lesosai, Thermo)» [20]. Für Verwaltung (GW1 8.0, GW2 11.0) ergibt das: Note 6 ≤ 8.0, Note 5 ≤ 9.5, Note 4 ≤ 11.0, Note 3 ≤ 13.2, Note 2 ≤ 15.4 kg CO₂-eq/m²·a (abgeleitet).

### 3.5 Bund

- **BBL-Nachhaltigkeitsstrategie (19.8.2025):** «Das BBL verwendet den Standard Nachhaltiges Bauen Schweiz (SNBS-Hochbau) als Planungsgrundlage und berücksichtigt ergänzend und projektspezifisch das passende Minergie-ECO Label und den SIA-Klimapfad (SIA 390/1)»; «hat bei Neubauten das Ziel einer Zertifizierung nach SNBS und/oder Minergie-P/A-ECO»; Scope-3-Emissionen «werden ergänzt, nachdem das entsprechende Vorgehen auf Ebene der gesamten Bundesverwaltung geklärt wurde» [23].
- **Bundesrat (Bericht zum Postulat 20.4135, 20.8.2025):** Vorbildrolle «könnte zum Beispiel umgesetzt werden, indem Neubauten des Bundes eine Mindestnote gemäss SNBS erreichen müssen»; die Plattform Ökobilanzdaten ist die «einheitliche Grundlage zur Ökobilanzierung von Bauprojekten und entsprechend zur Nachweiserbringung» [12].
- **KBOB-Faktenblatt (4.4.2025):** Messgrössen «GTHGE [kgCO2eq/m2EBF] gemäss SIA 2032 (absoluter Wert)», «GTHGE [kgCO2eq/m2EBF und Jahr]», «Restwert Bestandsbauten» [24]. **VEK/NNBS (30.10.2025):** «Die Standards SNBS Infrastruktur und SNBS Hochbau sollen einen wesentlichen Beitrag zur Umsetzung und in der Beschaffung leisten» [25].
- **«Anleitung TP2 / Netto-Null»:** mit den Suchbegriffen «Anleitung», «TP2», «Netto-Null», «BBL», «Erstellung» weiterhin nicht auffindbar. Für den Prototyp sollte der Begriff durch die belegten Systeme ersetzt werden (SIA 2032-Methodik, SNBS 311, SIA 390/1-Richtwerte); der «Kontrollwert 9.1» bleibt Projektannahme (nicht verifiziert).

---

## 4. Was soll der Lieferant erfassen? (EPD-Liste, KBOB-Materialien, Bauteile oder Aggregat)

| Variante | Was der Lieferant eingibt | Nachrechenbar | Aufwand Lieferant | Passung zu Tools/Labels | Beurteilung für THG-32 |
|---|---|---|---|---|---|
| A Aggregat je eBKP-H-Hauptgruppe (heutige Maske) | Menge, THG je Hauptgruppe, Endwert, PDF | nein | gering | kein Label verlangt Hauptgruppen; SIA 2032/Minergie/SNBS arbeiten mit Elementgruppen [16][17][20] | zu grob: Amortisation ist elementgruppenspezifisch (C 60 a, D 20–30 a, E/F/G 30–40 a), Hauptgruppensummen lassen sich nicht auf Jahreswerte prüfen |
| B Ergebnisse je eBKP-H-Elementgruppe (SIA 2032 Ziffer 3.3.2) | Menge in Bezugsgrösse, Konstruktionstyp bzw. massgebende KBOB-IDs, THG Herstellung/Entsorgung, Amortisation | Plausibilität ja (Kennwert × Menge), volle Neuberechnung nein | mittel; entspricht dem Export der zugelassenen Tools [17][20] | deckungsgleich mit Minergie-ECO «detaillierte Erfassung» und SNBS-Nachweis «samt Bauteilen» [17][20] | **empfohlen als Pflichtebene** |
| C Bauteile mit Schichten (Material = KBOB-ID, Dicke/Dichte) | wie B plus Schichtaufbau | ja | hoch (nur aus Tool/IFC sinnvoll) | so arbeiten Lesosai, GREG, Enerweb, IfcLCA (Vornotiz, Abschnitt 4) | optional per «Aufschlüsseln» oder Import; nicht manuell |
| D Liste von EPDs mit Mengen | EPD-Referenz, deklarierte Einheit, Menge | nur mit EPD-Datenbank | hoch | in der Schweiz nicht labelkonform: Minergie-Netto-Null verlangt «nur Materialien der aktuellen KBOB-Liste» (Vornotiz [9]); die KBOB-Regeln verlangen, EPD-Vordergrunddaten in die UVEK-Hintergrunddaten einzubetten [3] | nicht als Primärstruktur; EPD nur als Herkunftsangabe eines herstellerspezifischen Datensatzes |

**eBKP-H vs. BKP:** Der BKP ordnet Kosten nach Gewerken (ecoBKP, ecoDevis, Werkverträge), der eBKP-H nach Bauteilen mit Bezugsgrössen nach SIA 416 (Vornotiz, Abschnitt 2.6). Alle Schweizer Ökobilanz-Systeme (SIA 2032, Minergie-ECO, SNBS 311, Minergie-Nachweis Erstellung) sind eBKP-H-basiert [16][17][19][20]; ecobau hält den BKP in ecoBKP 21 selbst für ungeeignet für Bauteilvergleiche [5]. Der Prototyp verwendet mit KV-32 bereits den eBKP-H (SN 506 511); THG-32 sollte dieselbe Gliederung und, wo möglich, dieselben Mengen nutzen («Mengen aus KV-32 übernehmen»).

---

## 5. Datenmodell für den Prototyp

### 5.1 Ebenen

1. **Lieferung/Gebäude** (Kopfdaten): Objekt-ID, Gebäudekategorie (hier «Verwaltung»), EBF, GF, GF–EBF, Projektart (Neubau), SIA-Phase, Systemgrenze «SIA 2032: A1–A3, A4–A5, B4, C1–C4», Datengrundlage «KBOB/ecobau-Liste 2022, Version 9.0 (14.07.2026)» [1][2], Tool und Version, Datenqualität, Betrachtungszeitraum 60 a.
2. **Hauptgruppe eBKP-H** (B, C, D, E, F, G; I nur mit Begründung): Summenzeile, nicht editierbar, mit Vergleich zur Vorphase.
3. **Elementgruppe eBKP-H** (Liste nach SIA 2032 Ziffer 3.3.2, vgl. Minergie [17]): B06.01/02, B06.04, B07.02; C01, C02.01 (A unter / B über Terrain), C02.02, C03, C04.01, C04.04, C04.05, C04.08; D01, D05, D07, D08; E01, E02, E03; F01.01–F01.03; G01–G04. Pflichtebene der Erfassung.
4. **Bauteil / Konstruktionstyp** (optional, «Aufschlüsseln» wie in KV-32): z. B. «Aussenwand über Terrain, Beton 25 cm», Lage beheizt/unbeheizt.
5. **Schicht / Material** (optional, nur über Import aus Tool-Export oder IFC): KBOB-ID + UUID, Dicke, Rohdichte, Menge in KBOB-Bezugseinheit.

### 5.2 Spalten einer Elementgruppen-/Bauteilzeile

| Spalte | Typ / Einheit | Pflicht | Herkunft | Bemerkung |
|---|---|---|---|---|
| eBKP-H-Code | Code (SN 506 511) | P | KV-32 / Tool | Elementgruppe, bei Aufschlüsselung Element |
| Bezeichnung / Konstruktionstyp | Text | P | Tool | z. B. nach SIA 2032 Anhang D oder Bauteilkatalog |
| Lage | beheizt / unbeheizt / unter Terrain | O | AR | für Grenzwertbildung Minergie (EBF vs. GF–EBF) [18] |
| Menge, Einheit | Zahl; m² BTF, m³, m, Stk., m² EBF | P | KV-32 / Ausmass | Bezugsgrösse der Elementgruppe bzw. des KBOB-Datensatzes [2][16] |
| Datenquelle | KBOB-ID(s) + UUID, Listenversion; alternativ «Hersteller-EPD (EN 15804+A2), nicht KBOB-konform» | P | Tool | Mehrere IDs je Zeile zulässig (massgebende Materialien) |
| THG Herstellung (A1–A3) | kg CO₂-eq | P | Tool | Spalte «Herstellung» der Liste [2] |
| THG Errichtung (A4–A5) | kg CO₂-eq | O | Tool | SIA 2032 vernachlässigt Transporte Lager–Baustelle (Vornotiz) |
| THG Entsorgung (C1–C4) | kg CO₂-eq | P | Tool | Spalte «Entsorgung», verknüpft über «ID-Nummer Entsorgung» [2] |
| Amortisationszeit | a (60/40/30/20) | P (Vorgabe aus Code) | SIA 2032 Anhang C [16] | änderbar mit Begründung |
| THG pro Jahr | kg CO₂-eq/a | A | = (Herstellung + Entsorgung) / Amortisationszeit | Kern von SIA 2032 [8][16] |
| THG über 60 a inkl. Ersatz (B4) | kg CO₂-eq | A | = THG pro Jahr × 60 | für Modell ecCo / Scope 3 (absolut) |
| Kennwert | kg CO₂-eq/m² EBF·a | A | = THG pro Jahr / EBF | Vergleich mit Zielwerten |
| Biogener Kohlenstoff | kg C | O | Tool | separat, nicht verrechnet [2][10] |
| UBP'21, Graue Energie | UBP, kWh oil-eq | O | Tool | UBP für ecCo-Zusatzbewertungen (Vornotiz [2]) |
| Reuse / Bestand | Flag + Text | O | AR | «mit null bilanziert» ausweisen [20] |
| Bemerkung, Datenqualität | Text, Auswahl | O | ÖB | geschätzt / geplant / ausgeführt |

### 5.3 Abgeleitete Kennwerte und Zielwerte (Verwaltung, Neubau)

| Kennwert / Zielwert | Wert | Einheit | Quelle / Status |
|---|---|---|---|
| Erstellung pro Jahr (Endwert) | Σ THG pro Jahr / EBF | kg CO₂-eq/m² EBF·a | SIA 2032; KBOB-Faktenblatt [24] |
| Erstellung absolut | Σ (THG pro Jahr × 60) / EBF | kg CO₂-eq/m² EBF | KBOB-Faktenblatt verlangt beide [24] |
| Erstellung initial (upfront) | Σ (Herstellung + Entsorgung) / EBF | kg CO₂-eq/m² EBF | PSP weist «Upfront-Emissionen» separat aus [27] |
| Betrieb, Mobilität | aus Formularen Betrieb (Energie-Blatt, z. B. CH-Verbrauchermix 0.125 kg/kWh [2]) bzw. SIA 2039 | kg CO₂-eq/m² EBF·a | nur als Verweis in THG-32; nötig für Zielwert SIA 390/1 |
| SIA 390/1 Richtwert Erstellung Basis / ambitioniert | 9.0 / 6.0 | kg CO₂-eq/m² EBF·a | [12][13] |
| SIA 390/1 Richtwert Erstellung Umbau | 5.0 | kg CO₂-eq/m² EBF·a | [15] |
| Minergie-ECO GW1 / GW2 | 8.0 / 11.0 (beheizt); 2.8 / 4.5 (unbeheizt) | kg CO₂-eq/m²·a | [18]; projektspezifisch mit Zuschlägen PV/Erdsonde |
| SNBS 311 Note 6 / 5 / 4 | ≤ 8.0 / ≤ 9.5 / ≤ 11.0 | kg CO₂-eq/m²·a | abgeleitet aus [18][20] |
| Minergie-Baustandard / MuKEn 2025 | 13.6 (2023.2) bzw. 12 (2024) / 13 | kg CO₂-eq/m²·a | [12][18] |
| Projektziel BBL | 8.5 | kg CO₂-eq/m² EBF·a | fiktive Projektvorgabe (so belassen, als fiktiv kennzeichnen) |
| Kontrollwert «TP2» | 9.1 | kg CO₂-eq/m² EBF·a | nicht verifiziert |

### 5.4 Beispielzeilen Verwaltungsgebäude (6480 m² GF, 5600 m² EBF)

Modellannahmen: 1 UG + EG + 4 OG à 1080 m² GF, Grundfläche 1080 m², Fassade 2376 m² (Fensteranteil 45 %), Massivbau, Erdsonden-Wärmepumpe, Lüftung 4 m³/h·m², hinterlüftete Fassade. Kennwerte aus der KBOB-Liste V9.0 [2], wo eine Bauteilsumme nötig war, aus SIA 2032 Anhang D [16] (Fenster, Flachdachaufbau, Aushub inkl. Deponie); Amortisation nach Anhang C [16]. Ausgewählte 10 von 18 gerechneten Elementgruppen; alle Zahlen fiktiv.

| eBKP-H | Bezeichnung / Konstruktionstyp | Menge | Einheit | Massgebende KBOB-Datensätze (ID) | THG Herstellung [t] | THG Entsorgung [t] | Amort. [a] | THG pro Jahr [t/a] | Kennwert [kg/m² EBF·a] |
|---|---|---|---|---|---|---|---|---|---|
| B06.01 | Aushub Baugrube, ohne Grundwasser | 5 850 | m³ | 62.001 Aushub maschinell (0.433 kg/m³) + Deponie/Transport (SIA 2032 Anh. D: 8.7 kg/m³) | 46.4 | 0.0 | 60 | 0.77 | 0.14 |
| C01 | Bodenplatte/Fundament, Beton 40 cm, gedämmt | 1 080 | m² | 01.002 Hochbaubeton; 06.003 Armierungsstahl (100 kg/m³); 10.005 XPS 12 cm | 169.9 | 26.3 | 60 | 3.27 | 0.58 |
| C02.01 | Aussenwandkonstruktion Beton 25 cm (A: 462 m² unter Terrain, B: 1306 m² über Terrain) | 1 768 | m² | 01.002; 06.003 (80 kg/m³) | 117.5 | 13.2 | 60 | 2.18 | 0.39 |
| C04.01 | Deckenkonstruktion Beton 28 cm | 5 400 | m² | 01.002; 06.003 (110 kg/m³) | 437.0 | 45.8 | 60 | 8.05 | 1.44 |
| D01 | Elektroanlagen Büro | 5 600 | m² EBF | 34.002 Elektroanlagen Büro (22.6 / 1.47 kg/m² EBF) | 126.6 | 8.2 | 30 | 4.49 | 0.80 |
| D07 | Lüftungsanlage 4 m³/h·m² | 5 600 | m² EBF | 32.006 (29.8 / 0.748 kg/m² EBF) | 166.9 | 4.2 | 30 | 5.70 | 1.02 |
| E02.03 | Fassadenbekleidung hinterlüftet: Steinwolle 20 cm, Faserzement 8 mm, Alu-Unterkonstruktion | 1 306 | m² | 10.008 Steinwolle; 03.003 Faserzementplatte; 06.002 Aluminiumprofil | 57.3 | 1.5 | 40 | 1.47 | 0.26 |
| E03 | Fenster Holz-Metall, 3-fach IV | 1 070 | m² | 05.006 Fensterrahmen Holz-Metall; 03.005 Flachglas beschichtet (Bauteilwert SIA 2032 Anh. D: 150 / 7 kg/m²) | 160.5 | 7.5 | 30 | 5.60 | 1.00 |
| F01.02 | Flachdach gedämmt (Dämmung, Abdichtung, Kies) | 1 080 | m² | 10.004 EPS; 09.xxx Bitumenbahn; 03.011 Kies (Bauteilwert SIA 2032 Anh. D: 42 / 26 kg/m²) | 45.4 | 28.1 | 30 | 2.45 | 0.44 |
| G02 | Bodenbelag: Anhydrit 60 mm + Linoleum 2.5 mm | 5 400 | m² | 04.005 Unterlagsboden Anhydrit; 11.014 Linoleum | 82.3 | 11.0 | 30 | 3.11 | 0.56 |

Summen des vollständigen Modells (18 Elementgruppen, zusätzlich B06.04, C02.02, C04.04, D05.2, D05.3/4, D08, G01, G04):

| Hauptgruppe | THG Herstellung + Entsorgung initial [t] | THG pro Jahr [t/a] | THG über 60 a inkl. Ersatz [t] | Kennwert [kg CO₂-eq/m² EBF·a] | Anteil | Vorgabe im Prototyp [Mio kg] | Beurteilung |
|---|---|---|---|---|---|---|---|
| B Vorbereitung | 110 | 1.8 | 110 | 0.33 | 4 % | – | fehlt in der Vorgabe; aufnehmen (Minergie/SIA bilanzieren Aushub und Baugrubenabschluss) [17] |
| C Konstruktion Gebäude | 953 | 15.9 | 953 | 2.84 | 34 % | 1.7 | zu hoch: 1.7 Mio entspräche ≈ 300 kg/m² EBF allein für das Tragwerk; plausibel nur mit zwei UG/Tiefgarage und Pfählung. Für die Demo 1.2–1.3 Mio |
| D Technik Gebäude | 436 | 13.9 | 835 | 2.49 | 29 % | 0.3 | zu tief über 60 a (Amortisation 20–30 a verdoppelt bis verdreifacht den Initialwert); 0.3–0.45 Mio nur als Initialwert richtig. Literatur: «Gebäudetechnik rund 25 % ... grösste Einzelkomponente» [26], 24 % bei einem Basler Projekt «entspricht Erfahrungen für Neubauten» [27] |
| E Äussere Wandbekleidung | 227 | 7.1 | 424 | 1.26 | 15 % | 0.5 | plausibel (Fenster dominieren [26]) |
| F Bedachung | 73 | 2.4 | 147 | 0.44 | 5 % | 0.1 | plausibel |
| G Ausbau | 181 | 6.0 | 362 | 1.08 | 13 % | 0.3 | plausibel |
| **Total** | **1 981** | **47.2** | **2 832** | **8.43** | 100 % | 2.9 (Endwert ≈ 8.6) | Summe und Endwert plausibel |

Absolutwerte des Modells: 506 kg CO₂-eq/m² EBF über 60 Jahre, 354 kg/m² EBF initial. Einordnung: Minergie-ECO GW1 8.0 / GW2 11.0 für Verwaltung [18], SIA 390/1 Basis 9.0 [12]; publizierte Verwaltungs-Neubauten von PSP: ATMOS Zürich 10.5, B2Binz 10.7, Clime 9.31 kg CO₂e/m²·a (Lebenszyklus 60 a, «Verwaltung, ohne Mieterausbau») [27]; Estia: untersuchte Gebäude liegen näher beim Basiswert 9 als beim ambitionierten Wert 7, letzteren erreichte keines [28]; brenet/BFE: Neubau 2020 «rund 12 kg ... in der Erstellung» (Wohnen) [29]. Ein Endwert von ≈ 9 ist für einen guten Massivbau damit realistisch und entspricht SNBS Note 5 bzw. Minergie-ECO «befriedigend», knapp über GW1. Vorschlag für die Demo-Hauptgruppen (über 60 a, Mio kg): B 0.11, C 1.20, D 0.80, E 0.44, F 0.15, G 0.36 = 3.06 Mio → 9.1 kg CO₂-eq/m² EBF·a (passt zum Eintrag «Endwert 9.1» in der Historie).

---

## 6. EPDs, Bauteilkatalog und Inhalt des Ökobilanz-Berichts

- **KBOB-Liste als Referenz:** «Die KBOB/ecobau-Liste liefert vergleichbare Ökobilanzdaten», Durchschnittsdaten «Markt Schweiz» plus «herstellerspezifische Daten (siebenstellige ID-Nummern)» [3]. Herstellerspezifische Daten «müssen durch eine Fachperson aus der Liste «Fachpersonen für die Erstellung und Verifizierung von Ökobilanzen» ... erfolgreich verifiziert und validiert werden»; «Die eingereichten Daten bleiben für fünf Jahre gültig»; «Der Eintrag in die KBOB/ecobau-Liste ist kostenlos» [3]. Das ist ein eigenes Verfahren, keine EPD-Programmanerkennung.
- **Hersteller-EPDs nach EN 15804:** «Wurde für das Bauprodukt bereits eine EPD oder eine Ökobilanz erstellt unter Verwendung einer anderen Datenbasis (beispielsweise ecoinvent V3 ff, GaBi oder andere), so sind die (herstellerspezifischen) Vordergrunddaten in den zutreffenden ... Datenbestände[n] einzubetten» (UVEK DQRv2:2022 bzw. BAFU:2026) [3]. Modul D wird nach «SN EN 15804+A2» ausgewiesen (Ziffer 8.23), der Nationale Anhang der SN EN 15804+A2 ist referenziert (Ziffer 9.3), und für biogenen Kohlenstoff gilt: «Es ist eine vollständige und ausgeglichene Bilanz von Entnahmen und Freisetzungen von biogenem CO2 zu erstellen, wie dies die EN 15804:2012+A2:2019 verlangt» [3]. Ausländische EPDs sind also nicht direkt in Minergie-ECO/SNBS/Netto-Null verwendbar; in der Maske gehört eine EPD-Referenz deshalb in das Feld «Datenquelle» einer Materialzeile, mit Kennzeichnung «nicht KBOB-konform, informativ», nicht in eine eigene Struktur.
- **Bauteilkatalog (bauteilkatalog.ch):** von BFE und Verein ecobau finanziert, Kataloge «KBOB / ecobau / IPB 2009/1:2022» und «FLEX-Katalog 2023», Stufen BASIC/PRO [30]; die Bauteilstruktur und eine allfällige eBKP-H-Zuordnung konnten auf der Seite nicht ausgelesen werden (nicht verifiziert). Für den Prototyp genügt die Konstruktionstyp-Liste aus SIA 2032 Anhang D [16] bzw. dem Minergie-Nachweis (Vornotiz [8]).
- **Inhalt des Ökobilanz-Berichts (Pflichtdokument in THG-32), abgeleitet aus [3][16][17][20][24]:** Projektangaben und Gebäudekategorie; Flächen (EBF, GF, GF–EBF) und Phase; Systemgrenze mit Modulen (A1–A3, A4–A5, B4, C1–C4) und Vernachlässigungen; Datengrundlage mit Listenname und Version (z. B. «KBOB/ecobau-Liste 2022, Version 9.0») und Tool mit Version; Bauteilliste nach eBKP-H mit Mengen, Konstruktionsaufbau und KBOB-IDs («samt Bauteilen und Plänen» [20]); Amortisationszeiten je Elementgruppe; Resultate je Elementgruppe und Modul, absolut und pro Jahr; Kennwerte pro m² EBF (absolut und pro Jahr) und Vergleich mit den Grenz-/Richtwerten (GW1/GW2, SIA 390/1); biogener Kohlenstoff separat; Restwert bei Bestandsbauten (SIA 2032 Anhang F); Reuse-Bauteile mit null bilanziert und gelistet; Pläne; maschinenlesbarer Tool-Export (XLSX/JSON); Verantwortliche und Datum.

---

## 7. Empfehlung für den Prototyp (THG-32)

1. **Gliederung:** Pflichtebene = eBKP-H-Elementgruppen nach SIA 2032 Ziffer 3.3.2 (Abschnitt 5.1), Hauptgruppen B–G als Summenzeilen; «I Umgebung» nur mit Begründung; «Aufschlüsseln» öffnet optional Bauteile/Konstruktionstypen wie in KV-32. `groupRef` um B06 (m³ bzw. m² Baugrube), D (m² EBF), E03 (m² Fenster), F (m² Dachfläche) ergänzen.
2. **Spalten:** Menge + Einheit, Konstruktionstyp / massgebende KBOB-IDs, THG Herstellung, THG Entsorgung, Amortisationszeit (Vorgabe aus Code, editierbar), abgeleitet THG pro Jahr, THG über 60 a und Kennwert kg CO₂-eq/m² EBF·a; optional biogener Kohlenstoff, UBP, Graue Energie, Reuse-Flag (Abschnitt 5.2).
3. **Kopfdaten:** Gebäudekategorie «Verwaltung», EBF 5600 / GF 6480 / GF–EBF 880, Projektart Neubau, Systemgrenze «SIA 2032: A1–A3, A4–A5, B4, C1–C4», Datengrundlage «KBOB/ecobau-Liste 2022, Version 9.0 (14.07.2026)», Tool z. B. «Lesosai 2026» (fiktiv), Datenqualität «geplant (SIA 32)».
4. **Zielwerte (`targets`):** «SIA 390/1 Richtwert Erstellung Basis 9.0» (bestehend, korrekt), neu «SIA 390/1 ambitioniert 6.0», «Minergie-ECO GW1 8.0 / GW2 11.0», «Projektziel BBL 8.5 (fiktiv)»; «SIA 31 Vorphase» beibehalten. Den Begriff «Anleitung TP2» und den Kontrollwert 9.1 nur verwenden, wenn die Quelle geklärt ist.
5. **Beispielwerte:** Hauptgruppen über 60 a: B 0.11, C 1.20, D 0.80, E 0.44, F 0.15, G 0.36 Mio kg CO₂-eq; Endwert 9.1 kg CO₂-eq/m² EBF·a, absolut 546 kg/m² EBF; Elementgruppen-Zeilen aus Abschnitt 5.4 (Technik und Fenster als grösste Einzelposten nach dem Tragwerk).
6. **Texte:** Fusszeile neu: «Erfasst werden die Ergebnisse der Ökobilanz nach SIA 2032 je eBKP-H-Elementgruppe (Datengrundlage KBOB/ecobau-Liste 2022, Version 9.0). Kennwert = (THG Herstellung + Entsorgung) / Amortisationszeit nach SIA 2032 Anhang C / EBF; Betrachtungszeitraum 60 Jahre. Die CDE Bund berechnet keine Emissionen. Werte fiktiv.» Manuelle Prüfungen: «Systemgrenze SIA 2032 eingehalten (A1–A3, A4–A5, B4, C1–C4)», «KBOB/ecobau-Liste 2022, Version 9.0 verwendet», «Biogener Kohlenstoff separat ausgewiesen, nicht verrechnet», «Reuse-Bauteile mit null bilanziert und gelistet».
7. **Dokumente:** Ökobilanz-Bericht (PDF, Pflicht, Inhalt nach Abschnitt 6) und Tool-Export (XLSX/JSON, Pflicht); Importe «Excel importieren (Tool-Export)», «IFC importieren», «Mengen aus KV-32 übernehmen» beibehalten.
8. **Reporting-Zeile:** «Modell ecCo» beibehalten; ergänzen «Übergabe: THG Erstellung pro Jahr und absolut, Scope 3 (Annahme: Kategorie Kapitalgüter), Datengrundlage und Version» (nicht verifiziert, vgl. Vornotiz Abschnitt 5.4).

---

## 8. Quellen (alle abgerufen am 2026-11-04)

1. KBOB, Seite «Ökobilanzdaten im Baubereich» (Dateiliste mit Versionen und Daten): https://www.kbob.admin.ch/de/oekobilanzdaten-im-baubereich
2. KBOB/ecobau-Liste 2022, Version 9.0, XLSX (heruntergeladen und ausgewertet, 605 134 Bytes): https://www.kbob.admin.ch/dam/de/sd-web/GUOl1trUNEVH/%C3%96kobilanzdaten_im_Baubereich_V9.0.xlsx
3. Plattform Ökobilanzdaten im Baubereich, «Regeln für die Ökobilanzierung von Baumaterialien und Bauprodukten in der Schweiz», Version 9.0, 01.09.2026: https://www.kbob.admin.ch/dam/de/sd-web/2F8oM9Rvsj83/Plattform_OeDB_Bilanzierungsregeln_Baustoffe_v9.0.pdf
4. ecobau, «Plattform Ökobilanzdaten im Baubereich»: https://www.ecobau.ch/de/instrumente/oekobilanzen
5. ecobau, «ecoBKP 2026»: https://www.ecobau.ch/de/instrumente/ecobkp
6. ecobau, «ecoDevis 2026»: https://www.ecobau.ch/de/instrumente/ecodevis
7. ecobau, Instrumente (Übersicht): https://www.ecobau.ch/de/instrumente
8. ecobau, Themen «Graue Energie»: https://www.ecobau.ch/de/themen/graue-energie
9. Minergie, «Vorgabenkatalog ECO, alle Gebäudekategorien», Version 2023.1: https://www.minergie.ch/media/vorgabenkatalog-eco-alle-gebaeudekategorien-v2023-1.pdf
10. SIA, Vorschau SIA 390/1:2025 (Titelblatt, Inhaltsverzeichnis, Vorwort, Kommission): https://shop.sia.ch/eb010073-dd38-48cb-b8e3-affb0f747675/D/DownloadAnhang
11. SNV, «Klimapfad – Treibhausgasbilanz über den Lebenszyklus von Gebäuden, SN 591390/1:2025»: https://insights.snv.ch/en/page/klimapfad-treibhausgasbilanz-uber-den-lebenszyklus-en
12. Bundesrat, Bericht in Erfüllung des Postulats 20.4135, 20.08.2025 (Tabelle 1: Vergleich MuKEn 2025, Minergie 2024, SIA 390/1): https://www.parlament.ch/centers/eparl/curia/2020/20204135/Bericht%20BR%20D.pdf
13. espazium, P. Knüsel, «Klimapfad zeigt den Weg», 16.04.2025: https://www.espazium.ch/de/aktuelles/sia-klimapfad-norm-390-effizienz-energie
14. Minergie, «Vergleich Minergie – Klimapfad (SIA 390/1)»: https://www.minergie.ch/media/vergleich_minergie-klimapfad.pdf
15. Kanton Zug, Kantonsrat, Vorlage 3856.2 «CO2-Bilanz» (Richtwerte SIA 390/1 Neubau 9.0, Umbau 5.0): https://kr-geschaefte.zug.ch/dokumente/13887/3856-2-18236_CO2-Bilanz.pdf
16. SIA, Korrigenda C1 zu SIA 2032:2010 (2013), Anhang C Amortisationszeit, Anhang D Berechnungstabelle: https://shop.sia.ch/8d7e837c-2888-4e04-b628-f36edbd1d39c/D/DownloadAnhang
17. Minergie, «Berechnung der Grauen Energie und der Treibhausgasemissionen beim Minergie Zusatzprodukt ECO», Version 2023.2, 31.10.2023: https://www.minergie.ch/media/231031_me-eco_berechnung_graue_energie-thge_v2023-2_de.pdf
18. Minergie, «Berechnungsmethodik Grenzwerte THGE in Erstellung», Version 2023.2, 05.12.2023: https://www.minergie.ch/media/231205_gw-berechnung_thge_in_erstellung_2023.2.pdf
19. Minergie, «Minergie-Nachweis Bereich Erstellung – Methodik, Funktionsweise und Aufbau», 20.05.2026: https://www.minergie.ch/media/erlaeuterungsbericht-nachweis-bereich-erstellung.pdf
20. NNBS, «Kriterienbeschrieb SNBS-Hochbau, Version 2023.1», 09.02.2024 (Kriterium 311, S. 132–133): https://nnbs.ch/wp-content/uploads/2024/02/2024-02-09_Kriterienbeschrieb_SNBS-Hochbau_Version_2023.1_web.pdf
21. NNBS, «Leitfaden SNBS-Hochbau 2023.1», Oktober 2024: https://nnbs.ch/wp-content/uploads/2024/10/2024-10_Leitfaden-SNBS-Hochbau_2023.1_de_web.pdf
22. NNBS, Downloads (Hilfstools, Nachweisliste, Pre-Klima-Check): https://nnbs.ch/downloads/
23. BBL, «Nachhaltigkeitsstrategie», 19.08.2025: https://www.bbl.admin.ch/dam/de/sd-web/SysldmDt4Tyk/20250819_Nachhaltigkeitsstrategie_DE.pdf
24. KBOB, Faktenblatt «Graue Treibhausgasemissionen bei der Erstellung von Gebäuden», 04.04.2025: https://www.kbob.admin.ch/dam/de/sd-web/EVJE4OxZ16O1/20250404_FB_Graue_Treibhausgasemissionen_DE.pdf
25. VEK/NNBS, «SNBS Standards – Bundesbauten», 30.10.2025: https://www.vorbild-energie-klima.admin.ch/dam/fr/sd-web/aZUKINaHmRBK/VEK-NNBS-SNBS-BB-Standard-20251030.pdf
26. treeze Ltd. et al. im Auftrag BFE, «Zielwert Gesamtumweltbelastung Gebäude – Machbarkeitsstudie», 03.12.2014 (Abschnitt 8.3.3): https://pubdb.bfe.admin.ch/de/publication/download/7752
27. PSP Swiss Property, «Nachhaltigkeit – Scope 3» (Geschäftsbericht 2025): https://www.psp.info/fileadmin/internet/nachhaltigkeit/pdf/2025/PSP_Nachhaltigkeit_Scope-3_GB25_de.pdf
28. Estia SA, Analyse «PRELCO» (fr; Benchmarks SIA 390/1): https://www.estia.ch/_files/ugd/4e84bd_9b50048e8fd54e5fae4b77efd6c0ab81.pdf
29. BFE/brenet, «Gebäude frei von Treibhausgasen», Fachbeitrag, November 2024: https://pubdb.bfe.admin.ch/de/publication/download/11933
30. Bauteilkatalog (BFE/ecobau): https://www.bauteilkatalog.ch/
31. CH LCA data (lcadata.ch) und Repository «swiss-lca-data» (LT Plus AG, AGPL-3.0): https://lcadata.ch und https://github.com/louistrue/swisslcadata
32. SSREI, «SIA 390/1 versus Gebäudelabels des Bundes»: https://ssrei.ch/sia-390-1-versus-gebaeudelabels-des-bundes/
33. Stadt Luzern, Stadtrat, Beantwortung zur SIA 390/1 (Zielwerte B im Gebäudestandard Energiestadt): https://www.stadtluzern.ch/_doc/6340613
