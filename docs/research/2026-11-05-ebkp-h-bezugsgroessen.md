# eBKP-H (SN 506 511) – Bezugsgrössen and units

Research date 2026-11-05. Scope: Hauptgruppen A–Z and Elementgruppen; edition 2020, edition 2012 as fallback. Source tags in square brackets are resolved in section 3.

**What the sources establish**

- Edition 2020 has two reference systems. «Die Bezugsgrössen sind aus dem Bezugssystem A und/oder B der vorliegenden Norm auszuwählen» [N20 4.6]. A is the default («primärer Vorschlag»); B is a model-based alternative (volume, count) and exists only for some cost groups; where there is no B, A is mandatory [AWH20 4.1]. A and B are assigned to every level (Hauptgruppe, Elementgruppe, Element).
- A Bezugsgrösse consists of «Einheit, Abkürzung und Grösse (Dimension bzw. Anzahl)» [N20 4.6]. The norm prints it as unit + abbreviation + name, e.g. «m² FOGA Fläche Aussenwand über Terrain», «m EPRL Länge aussen liegende Absturzsicherung», «St EDN Anzahl Türen» [N20 5.2].
- The 2020 abbreviations are English and identical in the German, French and Italian editions [CRB-web]. The norm names «FA (GF), SA (GSF), MUAH (NF), ESA (BUF)» (SIA 416) and «CERA, HRA, VRA» (Energiebezugsfläche EBF, SIA 380) [N20 4.6]. Edition 2012 used German abbreviations (GSF, GF, FAW, FB, BUF, NF, NFH, BBJ, BBW, BBY) [OAK12].
- Besides geometric quantities there are «Berechnungsbezüge»: «Bezugsgrösse aus einer Summe von Elementen, z.B. PSBY, für die Summe aller Hauptgruppen B bis Y» [N20 4.7]; their unit is CHF.
- The norm's own tables (chapter 5.2 with Bezugsgrösse A/B per code, chapter 5.4 «Bezugsgrössen») are not public. CRB's free excerpts print only Hauptgruppe E (norm) and the pages C04 and E02 (handbook). The mapping below combines those excerpts with two public client documents that reproduce the norm values: the Stadt Zürich examples (report output of a cost-planning software; the guideline requires «Die Bezugsgrösse A ist anzuwenden» and «Hier dürfen die Normpositionen nicht verändert werden») and Tabelle 12 of the Kanton St.Gallen guideline (all Elemente, system A).
- Cross-check done for this file: 111 Element codes occur in both the Zürich examples and the St.Gallen table with a Bezugsgrösse, and all 111 agree in abbreviation and unit. The 16 codes of Hauptgruppe E also agree with the CRB norm excerpt, C04 with the CRB handbook excerpt, E03 with the CRB eBKP-Browser screenshot.

## 1. Distinct units / Bezugsgrössen

### 1.1 Units (edition 2020)

| Unit | Meaning | Where it occurs |
|---|---|---|
| m² | area | By far the most frequent: Hauptgruppen A–J and W; 41 of the 54 sourced Elementgruppen; 196 of the 281 Elemente that have a Bezugsgrösse A in [SG] |
| m³ | volume | Elementgruppen B05 (DBV), B06 (BEV); Elemente B05.02/.03, B06.01/.02/.05/.06, H09.08 [ZH; SG]. System B: C04 (CRV) [AWH20] |
| m | length | Elementgruppe C03 (COL); Elemente B03.01/.02, B04.01–.08, B07.02, C03.01/.02, E02.06, E03.05, G05.03, I02.07/.08, I03.06, I04.02 [ZH; SG; N20] |
| St | count («Anzahl») | Elementgruppen D08, D09, D10, D12; Elemente D02.01–.07, D03.01–.04, D04.01–.05, all of D08–D12, G01.06, G05.02/.06, H09.06/.07/.09, I03.05, I05.08, I06.01–.04, J04.01/.02 [ZH; SG]. System B: E03.02 (EDN), E03.03 (ELDN) [N20] |
| m³/h | air volume flow | Element D04.06 (SHAV «Luftvolumenstrom Rauch- und Wärmebehandlungsanlage») [ZH; SG]. System B: D07.01 (VAV) [ZH-WL] |
| CHF | cost amount (Berechnungsbezug) | Hauptgruppen V (SSBT), Y (SSBW), Z (PSBY); Elementgruppen A02 (SSA01), C05 (SSD), D02 (SD110), V01 (SSBT), V03 (SSBJ), Z01 (PSBY); Elemente G06.01/.02 (SSD) [ZH; CRB-PB; N20 4.7] |
| none | – | 17 Elementgruppen have no sourced value (section 4). The St.Gallen table lists no Bezugsgrösse for any code in A02, C05, G06.01/.02, V, W, Y, Z; the Zürich output shows CHF or m² FA for the ones it uses. Whether the norm leaves any cost group without a Bezugsgrösse is not established |

Spelling: the norm and the Zürich output write «m», «St»; the St.Gallen table writes «m¹», «St.»; the French norm edition writes «p» for St. Not found as a norm Bezugsgrösse in any source: kW, kWp, kg, t, h, %, «pauschal». The units «pl», «gl.», «Mt», «%», «Stk» appear only in user-defined positions below the Element level or in planners' own sheets [ZH; FF].

### 1.2 Bezugsgrössen at Hauptgruppen and Elementgruppen level (edition 2020, system A)

| Abbr. 2020 | Abbr. 2012 / SIA 416 | Unit | German name | Used for (Hauptgruppe; Elementgruppen) | Source |
|---|---|---|---|---|---|
| SA | GSF | m² | Grundstücksfläche | A, B; A01, B01, B04 | N20 4.6; ZH; SG; OAK12 |
| FA | GF | m² | Geschossfläche | C, D, G, W; B02, B03, D01, D03, G05, G06, W01, W02, W04 | N20 4.6; ZH; SG; OAK12 |
| FGA | FAW | m² | Fläche Aussenwand | E | N20; ZH; N12 |
| FUA | FAWU | m² | Fläche Aussenwand unter Terrain | E01 | N20; ZH; SG; N12 |
| FOGA | FAWUE | m² | Fläche Aussenwand über Terrain | E02 | N20; AWH20; ZH; N12 |
| IEWA | FEA | m² | Fläche Element Aussenwand (2012: Fläche Einbaute zu Aussenwand) | E03 | N20; CRB-PB; ZH; N12 |
| BRA | FB | m² | Fläche Bedachung Gebäude | F | ZH; CRB-PB; SG (F02.03); OAK12 |
| RCA | FDH | m² | Fläche Dachhaut | F01 | ZH; ZH-WL; ZH-XL |
| IRA | – | m² | «Element zu Dach» | F02 | ZH; ZH-WL |
| ESA | BUF | m² | Bearbeitete Umgebungsfläche | I; I01, I02, I05, I06 | N20 4.6; ZH; SG; OAK12 |
| GSA | – | m² | Fläche Grünfläche | I03 | ZH; SG |
| HSA | – | m² | not sourced | I04 | ZH |
| USA | NF | m² | Nutzfläche | J (derived, see 2.1); J02, J03 | ZH legend; SG; OAK12 |
| MUAH, MUAH1, MUAH7, MUAH8 | NFH (2012 H 4: NFH4) | m² | Nutzfläche (NF) zu H / zu H01, H07, H08 | H (derived, see 2.1); H01, H07, H08 | N20 4.6; SG; OAK12; SPI12 |
| BSFA | FBF | m² | Fläche Fundament, Bodenplatte | C01 | ZH; ZH-WL; SG; ZH-XL |
| WA | – | m² | Fläche Wandkonstruktion | C02 | ZH; AWH20 |
| CRA | – | m² | Fläche Deckenkonstruktion, Dachkonstruktion | C04 | AWH20; ZH |
| PDA | – | m² | not sourced | G01 | ZH |
| FCA | – | m² | Fläche Bodenbelag | G02 | ZH; SG |
| WICA | – | m² | Fläche Wandbekleidung | G03 | ZH; SG |
| CCA | – | m² | Fläche Deckenbekleidung | G04 | ZH; SG |
| OFSA | – | m² | not sourced | B08 | ZH |
| AFFA | – | m² | Geschossfläche (GF) fremdes Bauwerk | B09 | SG only |
| PNFA | – | m² | Geschützte Nettogeschossfläche (NGF) | D04 | ZH; SG |
| HRA | – | m² | Energiebezugsfläche (EBF) Wärme | D05 | N20 4.6; ZH; SG |
| CERA | – | m² | Energiebezugsfläche (EBF) Kälte | D06 | N20 4.6; ZH; SG |
| VRA | – | m² | Belüftete Energiebezugsfläche (EBF) | D07 | N20 4.6; ZH; SG |
| DBV | – | m³ | Volumen Rückbau Bauwerk | B05 | ZH; SG |
| BEV | – | m³ | Volumen Aushub | B06 | ZH; SG |
| COL | – | m | not sourced (Elemente: «Länge Aussenstütze», «Länge Innenstütze») | C03 | ZH |
| WCP | AAW | St | Anzahl Apparate (2012: Anzahl Anschlusspunkte Wasser) | D08 | ZH; ZH-WL; SG; ZH-XL |
| WWCP | – | St | Anzahl Apparate für Abwasser | D09 | ZH; ZH-WL; SG |
| GCPN | – | St | Anzahl Anschlusspunkte Gasanlage | D10 | ZH; SG |
| IN | – | St | not sourced | D12 | ZH |
| SSA01 | – | CHF | cost amount; in the example equal to the cost of A01 | A02 | ZH |
| SSD | – | CHF | cost amount; in the example equal to the cost of Hauptgruppe D | C05 (and G06.01/.02) | ZH |
| SD110 | – | CHF | cost amount; in the example equal to D01–D10 without D02 | D02 | ZH |
| SSBT | BBJ | CHF | cost amount; in the example equal to the sum B–J | V; V01 | ZH; CRB-PB; OAK12 |
| SSBJ | – | CHF | cost amount; in the example equal to the sum B–J | V03 | ZH |
| SSBW | BBW | CHF | cost amount (2012: Betrag B–W) | Y | CRB-PB; OAK12 |
| PSBY | BBY | CHF | «Summe aller Hauptgruppen B bis Y» | Z; Z01 | N20 4.7; ZH; CRB-PB; OAK12 |

The 2012 abbreviations FDH, FBF and AAW come from Stadt Zürich's 2012-based form, not from a CRB document. About 130 further abbreviations exist only at Element level (e.g. EWA, IWA, CA, FRA, EWIA, ADPN), plus one MUAH code per Element of H; they are listed with names in [SG] pages 27–36 and, without names, in the «Elemente» column of table 2.2.

## 2. Mapping

### 2.1 Hauptgruppen

| Code | Name | 2020, system A | Unit | Source 2020 | 2012 | Unit | Source 2012 |
|---|---|---|---|---|---|---|---|
| A | Grundstück | SA – Grundstücksfläche (GSF) | m² | ZH; CRB-PB | GSF – Grundstücksfläche | m² | OAK12; CRB-KE |
| B | Vorbereitung | SA – Grundstücksfläche (GSF) | m² | ZH; CRB-PB | GSF – Grundstücksfläche | m² | OAK12; CRB-KE |
| C | Konstruktion Gebäude | FA – Geschossfläche (GF) | m² | ZH | GF – Geschossfläche | m² | OAK12; CRB-KE |
| D | Technik Gebäude | FA – Geschossfläche (GF) | m² | ZH | GF – Geschossfläche | m² | OAK12; CRB-KE |
| E | Äussere Wandbekleidung Gebäude | FGA – Fläche Aussenwand | m² | N20; ZH | FAW – Fläche Aussenwand | m² | N12; OAK12; CRB-KE |
| F | Bedachung Gebäude | BRA – Fläche Bedachung Gebäude | m² | ZH; CRB-PB | FB – Fläche Bedachung Gebäude | m² | OAK12; CRB-KE |
| G | Ausbau Gebäude | FA – Geschossfläche (GF) | m² | ZH; CRB-PB | GF – Geschossfläche | m² | OAK12; CRB-KE |
| H | Nutzungsspezifische Anlage Gebäude | MUAH – Nutzfläche (NF) zu H: **derived**, not shown at Hauptgruppe level (norm names «MUAH (NF)»; SG has MUAH1 «Nutzfläche (NF) zu H01») | m² | N20 4.6; SG | NFH – Nutzfläche zu H | m² | OAK12; CRB-KE; name from FF |
| I | Umgebung Gebäude | ESA – Bearbeitete Umgebungsfläche (BUF) | m² | ZH | BUF – Bearbeitete Umgebungsfläche | m² | OAK12; CRB-KE |
| J | Ausstattung Gebäude | USA – Nutzfläche (NF): **derived**, not shown at Hauptgruppe level (all Elemente of J01–J03 use it; ZH lists «USA Nutzfläche (NF)») | m² | SG; ZH legend | NF – Nutzfläche | m² | OAK12 |
| V | Planungskosten | SSBT – cost amount (in the example = sum B–J) | CHF | ZH; CRB-PB | BBJ – cost amount (FF: «Betrag von B-J») | CHF | OAK12; CRB-KE |
| W | Nebenkosten zu Erstellung | FA – Geschossfläche (GF) | m² | ZH; CRB-PB | GF – Geschossfläche | m² | OAK12; CRB-KE |
| Y | Reserve, Teuerung | SSBW – cost amount | CHF | CRB-PB | BBW – cost amount (FF: «Betrag B-W») | CHF | OAK12; CRB-KE |
| Z | Mehrwertsteuer | PSBY – «Summe aller Hauptgruppen B bis Y» | CHF | N20 4.7; ZH; CRB-PB | BBY – cost amount (FF: «Betrag B-Y») | CHF | OAK12; CRB-KE |

OAK12 prints the 2012 column as «597 m² GSF», «319 m² GF», «385 m² FAW», «150 m² FB», «0 m² NFH», «438 m² BUF», «241 m² NF», «713'074 CHF BBJ», «929'318 CHF BBW», «929'318 CHF BBY». CRB-KE (eBKP-Assistant, March 2021) still shows these German codes for eBKP-H; CRB-PB (March 2025, «Baukostenplan Hochbau, Bezugsgrössen A (2021)») shows SA, BRA, FA, SSBT, SSBW, PSBY.

### 2.2 Elementgruppen, edition 2020, system A

54 of the 71 Elementgruppen are sourced: 48 from the Zürich output, 6 from the St.Gallen table only. Column «Elemente»: Bezugsgrösse A of the Elemente of the group (suffix, abbreviation, unit) from [SG], unless marked (ZH). Source «SG#» means the St.Gallen table gives a value on the Elementgruppe row (its optional aggregation level); where it differs from the Zürich output, the Zürich value is used and the difference is noted.

| Code | Name | Bezugsgrösse A (abbr. – name) | Unit | Elemente (system A) | Source |
|---|---|---|---|---|---|
| A01 | Grundstück, Baurecht | SA – Grundstücksfläche (GSF) | m² | .01/.02/.04 SA m²; .03 PFA m² | ZH; SG# |
| A02 | Nebenkosten zu Grundstück, Baurecht | SSA01 – cost amount (Berechnungsbezug; in the example = cost of A01); name not sourced | CHF | .06/.07 SSA01 CHF (ZH) | ZH |
| B01 | Untersuchung, Aufnahme, Messung | SA – Grundstücksfläche (GSF) | m² | .01–.04 SA m² | ZH; SG# |
| B02 | Baustelleneinrichtung | FA – Geschossfläche (GF) | m² | .01–.08 FA m² | ZH |
| B03 | Provisorium | FA – Geschossfläche (GF) | m² | .01 TRSL m; .02 TUL m; .03 TFA m²; .04 TCA m²; .05 TUFA m² | ZH (SG# differs: SA) |
| B04 | Erschliessung durch Werkleitungen | SA – Grundstücksfläche (GSF) | m² | .01 UHCL m; .02 ULCL m; .03 UHPL m; .04 UCPL m; .05 UDWL m; .06 USWL m; .07 USRL m; .08 UGPL m | ZH |
| B05 | Rodung, Rückbau | DBV – Volumen Rückbau Bauwerk | m³ | .01 TFCA m²; .02/.03 DBV m³ | ZH; name from SG (B05.02) |
| B06 | Baugrube | BEV – Volumen Aushub | m³ | .01 NCSV m³; .02 CSV m³; .03 SSA m²; .04 BRSA m²; .05 BFV m³; .06 DV m³ | ZH; SG# |
| B07 | Baugrundverbesserung, Bauwerkssicherung | not sourced | – | .01 BSFA m²; .02 PL m; .03 UA m²; .04 SPA m² | – |
| B08 | Gerüst | OFSA – name not sourced | m² | .01 FSA m²; .02 FA m²; .03 TRA m²; .04 PSA m² | ZH |
| B09 | Anpassung angrenzendes Bauwerk | AFFA – Geschossfläche (GF) fremdes Bauwerk | m² | .01/.03 AFFA m²; .02 UFA m² | SG# only |
| C01 | Fundament, Bodenplatte | BSFA – Fläche Fundament, Bodenplatte | m² | .01/.03 BSA m²; .02 FOA m²; .04 SREA m²; .05 LEA m² | ZH; ZH-WL; SG# |
| C02 | Wandkonstruktion | WA – Fläche Wandkonstruktion | m² | .01 EWA m²; .02 IWA m² | ZH; name from AWH20 |
| C03 | Stützenkonstruktion | COL – name not sourced | m | .01 PCL m; .02 ICL m | ZH |
| C04 | Deckenkonstruktion, Dachkonstruktion | CRA – Fläche Deckenkonstruktion, Dachkonstruktion | m² | .01 CA m²; .02 ISRA m²; .03 ILA m²; .04 SFRA m²; .05 SPRA m²; .06 ESRA m²; .07 ELA m²; .08 ECA m² | AWH20; ZH |
| C05 | Ergänzende Leistung zu Konstruktion | SSD – cost amount (Berechnungsbezug; in the example = cost of Hauptgruppe D); name not sourced | CHF | .01/.02 SSD CHF (ZH) | ZH |
| D01 | Elektroanlage | FA – Geschossfläche (GF) | m² | .01–.11 FA m² | ZH |
| D02 | Gebäudeautomation | SD110 – cost amount (Berechnungsbezug; in the example = sum D01–D10 without D02); name not sourced | CHF | .01/.02 ADPN St; .03 FDN St; .04 CPRN St; .05 NCN St; .06 CCN St; .07 CPIN St | ZH (SG# differs: FA, m²) |
| D03 | Sicherheitsanlage | FA – Geschossfläche (GF) | m² | .01 ACPN St; .02 ACN St; .03 VSN St; .04 LCN St | ZH |
| D04 | Technische Brandschutzanlage | PNFA – Geschützte Nettogeschossfläche (NGF) | m² | .01 FADN St; .02 GDN St; .03 SHN St; .04 DEPN St; .05 FEN St; .06 SHAV m³/h; .07 PNFA m² | ZH; name from SG (D04.07) |
| D05 | Wärmetechnische Anlage | HRA – Energiebezugsfläche (EBF) Wärme | m² | .01–.06 HRA m² | ZH; name from SG |
| D06 | Kältetechnische Anlage | CERA – Energiebezugsfläche (EBF) Kälte | m² | .01–.06 CERA m² | ZH; name from SG |
| D07 | Lufttechnische Anlage | VRA – Belüftete Energiebezugsfläche (EBF) | m² | .01–.06 VRA m² | ZH; name from SG |
| D08 | Wassertechnische Anlage | WCP – Anzahl Apparate | St | .01/.03/.04/.05/.06 WCP St; .02 DWTN St | ZH; ZH-WL; name from SG |
| D09 | Abwassertechnische Anlage | WWCP – Anzahl Apparate für Abwasser | St | .01/.03/.04/.05 WWCP St; .02 WWTN St | ZH; ZH-WL; name from SG |
| D10 | Gastechnische Anlage | GCPN – Anzahl Anschlusspunkte Gasanlage | St | .01–.05 GCPN St | ZH; name from SG |
| D11 | Anlage für Spezialmedien | not sourced (all Elemente: SSCP «Anzahl Anschlusspunkte Spezialmedien», St) | – | .01–.05 SSCP St | – |
| D12 | Beförderungsanlage | IN – name not sourced | St | .01 PLN St; .02 HDLN St; .03 SLN St; .04 ETN St; .05 MWN St; .06 LTTN St | ZH |
| E01 | Äussere Wandbekleidung unter Terrain | FUA – Fläche Aussenwand unter Terrain | m² | .01 WWPA m²; .02 EIBA m²; .03 PLBA m² | N20; ZH; ZH-WL; SG# |
| E02 | Äussere Wandbekleidung über Terrain | FOGA – Fläche Aussenwand über Terrain | m² | .01 OCA m²; .02 EIA m²; .03 WCA m²; .04 CWA m²; .05 SCA m²; .06 EPRL m | N20; AWH20; ZH; ZH-WL |
| E03 | Element in Aussenwand | IEWA – Fläche Element Aussenwand | m² | .01 EWIA m²; .02 EDA m²; .03 ELDA m²; .04 SUSA m²; .05 PRL m | N20; CRB-PB; ZH; ZH-WL |
| F01 | Dachhaut | RCA – Fläche Dachhaut | m² | .01 RWBA m²; .02 FRA m²; .03 PRNA m²; .04 SRA m² | ZH; name from ZH-WL (spelled «RCS» there) |
| F02 | Element zu Dach | IRA – «Element zu Dach» (wording of ZH-WL) | m² | .01 IFRA m²; .02 IPRA m²; .03 BRA m² | ZH; ZH-WL |
| G01 | Trennwand, Innentür, Innentor | PDA – name not sourced | m² | .01 FPA m²; .02 MPA m²; .03 IA m²; .04 WIA m²; .05 IDA m²; .06 IGA St | ZH |
| G02 | Bodenbelag | FCA – Fläche Bodenbelag | m² | .01 SFA m²; .02 FCA m² | ZH; name from SG (G02.02) |
| G03 | Wandbekleidung | WICA – Fläche Wandbekleidung | m² | .01 CWSA m²; .02 WICA m² | ZH; name from SG (G03.02) |
| G04 | Deckenbekleidung | CCA – Fläche Deckenbekleidung | m² | .01 CSA m²; .02 CCA m² | ZH; name from SG (G04.02) |
| G05 | Einbauten, Schutzeinrichtung zu Ausbau | FA – Geschossfläche (GF) | m² | .01 CSMA m²; .02 FKN St; .03 WFL m; .04 ICA m²; .05 PRBA m²; .06 SPN St; .07 FA m² | ZH; SG# |
| G06 | Ergänzende Leistung zu Ausbau | FA – Geschossfläche (GF) | m² | .01/.02 SSD CHF (ZH); .03/.04 FA m² | ZH; SG# |
| H01 | Produktionsanlage | MUAH1 – Nutzfläche (NF) zu H01 | m² | .01–.05 MUAH11…15 m² | SG# only |
| H02 | Laboranlage | not stated explicitly (pattern in SG: MUAH2 «Nutzfläche (NF) zu H02», m²) | – | .01–.05 MUAH21…25 m² | – |
| H03 | Grossküche | not stated explicitly (pattern in SG: MUAH3, m²) | – | .01–.05 MUAH31…35 m² | – |
| H04 | Wäscherei-, Reinigungsanlage | not stated explicitly (pattern in SG: MUAH4, m²) | – | .01–.05 MUAH41…45 m² | – |
| H05 | Anlage für Gesundheit | not stated explicitly (pattern in SG: MUAH5, m²) | – | .01–.12 MUAH51…512 m² | – |
| H06 | Anlage für Bildung, Kultur | not stated explicitly (pattern in SG: MUAH6, m²) | – | .01–.04 MUAH61…64 m² | – |
| H07 | Sportanlage, Freizeitanlage | MUAH7 – Nutzfläche (NF) zu H07 | m² | .01–.04 MUAH71…74 m² | SG# only |
| H08 | Anlage für Erholung | MUAH8 – Nutzfläche (NF) zu H08 | m² | .01–.04 MUAH81…84 m² | SG# only |
| H09 | Weitere nutzungsspezifische Anlage | not stated explicitly (pattern in SG: MUAH9, m²) | – | .01–.05 MUAH91…95 m²; .06 PSVN St; .07 MTN St; .08 CCV m³; .09 MSN St | – |
| I01 | Umgebungsgestaltung | ESA – Bearbeitete Umgebungsfläche (BUF) | m² | .01/.02 ESA m² | ZH |
| I02 | Bauwerk in der Umgebung | ESA – Bearbeitete Umgebungsfläche (BUF) | m² | .01 SSEA m²; .02 RWA m²; .03 FWA m²; .04 SSRA m²; .05/.06 MSA m²; .07 VPBL m; .08 ECL m | ZH |
| I03 | Grünfläche | GSA – Fläche Grünfläche | m² | .01 TSA m²; .02 SEA m²; .03 PAA m²; .04 VPA m²; .05 SPLN St; .06 KGL m; .07 GWA m²; .08 BEA m²; .09 GSA m² | ZH; name from SG (I03.09) |
| I04 | Hartfläche | HSA – name not sourced | m² | .01 SBA m²; .02 KHL m; .03/.04 SUA m² | ZH |
| I05 | Technik Umgebung | ESA – Bearbeitete Umgebungsfläche (BUF) | m² | .01–.07 ESA m²; .08 PPCN St | ZH |
| I06 | Ausstattung Umgebung | ESA – Bearbeitete Umgebungsfläche (BUF) | m² | .01 EMFN St; .02 EFFN St; .03 EAN St; .04 EWCN St | ZH |
| J01 | Mobiliar | not sourced (all Elemente: USA «Nutzfläche NF», m²) | – | .01–.04 USA m² | – |
| J02 | Kleininventar | USA – Nutzfläche (NF) | m² | .01–.03 USA m² | SG# only |
| J03 | Textilien | USA – Nutzfläche (NF) | m² | .01/.02 USA m² | SG# only |
| J04 | Kunst am Bau | not sourced (Elemente: AIN «Anzahl Kunstobjekte», ABN «Anzahl künstlerisch gestaltete Bauteile», St) | – | .01 AIN St; .02 ABN St | – |
| V01 | Planer | SSBT – cost amount (Berechnungsbezug; in the example = sum B–J); name not sourced | CHF | .06/.07 SSBT CHF (ZH) | ZH |
| V02 | Unternehmer | not sourced | – | – | – |
| V03 | Auftraggeber | SSBJ – cost amount (Berechnungsbezug; in the example = sum B–J); name not sourced | CHF | .01/.02 SSBJ CHF (ZH) | ZH |
| W01 | Bewilligung, Gebühr | FA – Geschossfläche (GF) | m² | .01/.02 FA m² (ZH) | ZH |
| W02 | Versicherung, Garantie | FA – Geschossfläche (GF) | m² | .01/.02 FA m² (ZH) | ZH |
| W03 | Kapitalkosten | not sourced | – | – | – |
| W04 | Bewirtung, Öffentlichkeitsarbeit, Entschädigung | FA – Geschossfläche (GF) | m² | .01/.02 FA m² (ZH) | ZH |
| W05 | Inbetriebnahme | not sourced | – | – | – |
| W06 | Vermietung, Verkauf | not sourced | – | – | – |
| W07 | Betriebserfolg | not sourced | – | – | – |
| Y01 | Reserve | not sourced (Hauptgruppe Y: SSBW, CHF) | – | – | – |
| Y02 | Teuerung | not sourced (Hauptgruppe Y: SSBW, CHF) | – | – | – |
| Z01 | Mehrwertsteuer | PSBY – «Summe aller Hauptgruppen B bis Y» (N20 4.7) | CHF | .01 PSBY CHF (ZH) | ZH; N20 |

### 2.3 System B (edition 2020): the only entries found

| Code | Bezugsgrösse A | Bezugsgrösse B | Source |
|---|---|---|---|
| C04 | m² CRA Fläche Deckenkonstruktion, Dachkonstruktion | m³ CRV Volumen Deckenkonstruktion, Dachkonstruktion | AWH20 |
| E | m² FGA Fläche Aussenwand | m² FGMA Modell-Fläche Aussenwand | N20 |
| E01 | m² FUA Fläche Aussenwand unter Terrain | m² FUNA Modell-Fläche Aussenwand unter Terrain (printed «FUNA» in the German and French excerpts) | N20 |
| E02 | m² FOGA Fläche Aussenwand über Terrain | m² FOMA Modell-Fläche Aussenwand über Terrain | N20; AWH20 |
| E03 | m² IEWA Fläche Element Aussenwand | none | N20 |
| E03.01 | m² EWIA Fläche Fenster | m² EWFA Rahmenfläche Fenster | N20 |
| E03.02 | m² EDA Fläche Tür | St EDN Anzahl Türen | N20 |
| E03.03 | m² ELDA Fläche Tor | St ELDN Anzahl Tore | N20 |
| D07.01 | m² VRA Belüftete Energiebezugsfläche (EBF) | m³/h VAV «Volumen pro Stunde» | ZH-WL |

### 2.4 Edition 2012, Elementgruppen (fallback, partial)

Codes of 2012 are written «E 1», «E 2.5»; numbering and content of some groups changed in 2020, so the 2012 codes do not map 1:1.

| Code 2012 | Name 2012 | Bezugsgrösse | Unit | Source |
|---|---|---|---|---|
| E 1 | Äussere Wandbekleidung unter Terrain | FAWU – Fläche Aussenwand unter Terrain | m² | N12 |
| E 2 | Äussere Wandbekleidung über Terrain | FAWUE – Fläche Aussenwand über Terrain | m² | N12 |
| E 3 | Einbaute zu Aussenwand | FEA – Fläche Einbaute zu Aussenwand | m² | N12 |
| C 1 | Bodenplatte, Fundament | FBF – Fläche Bodenplatte, Fundament | m² | ZH-XL; FF (not a CRB document) |
| F 1 | Dachhaut | FDH – Fläche Dachhaut | m² | ZH-XL; FF (not a CRB document) |
| D 7 | Lufttechnische Anlage | VD7 – «Volumen pro Stunde zur Lufttechnischen Anlage» | m³/h | ZH-XL (not a CRB document) |
| D 8 | name not checked | AAW – Anzahl Anschlusspunkte Wasser | St | ZH-XL (not a CRB document) |
| H 4 | Spitalanlage | NFH4 – Nutzfläche zu H 4 (Element H 4.1: NFH41) | m² | SPI12 |

Elemente of E in 2012 [N12]: E 1.1 m² FWU, E 1.2 m² FAWDU, E 1.3 m² FSU, E 2.1 m² FBAE, E 2.2 m² FAWDA, E 2.3 m² FFB, E 2.4 m² FFSY, E 2.5 m² FBUS, E 2.6 m LASI, E 3.1 m² FFE, E 3.2 m² FTT, E 3.3 m² FSSC.

## 3. Sources

| Tag | URL | Content |
|---|---|---|
| N20 | https://www.crb.ch/_Resources/Persistent/5/1/7/d/517de4b60fd6f28b6137e873ea1c9284f345e648/Auszug_eBKP_2020_Web.pdf | CRB excerpt of SN 506 511:2020 (same file as the local `docs/reference/sources/Auszug_eBKP_2020_Web.pdf`): chapters 4.6/4.7 and the sample page of chapter 5.2 with Bezugsgrösse A and B for E, E01–E03 and their Elemente. French edition with the same sample: https://www.crb.ch/_Resources/Persistent/2/1/6/b/216bb99a6e2f0603c4f02d284982639fea8ab8dd/Auszug_eBKP_H_2020_Web_fr.pdf |
| AWH20 | https://www.crb.ch/_Resources/Persistent/0/a/f/3/0af357470aeba9a335a55a44d1901f45b0970bc1/Auszug_AWHB_eBKPH_2020_web_03_2021_DE.pdf | CRB excerpt of the Anwenderhandbuch 2020: rules for systems A and B (chapter 4.1), sample pages C04 and E02 with «Messregel A / B» |
| CRB-web | https://www.crb.ch/de/normen-standards/baukostenplane/baukostenplan-hochbau-ebkp-h | CRB product page: second system B; abbreviations «einheitlich in Englisch» |
| CRB-PB | https://www.crb.ch/_Resources/Persistent/c/f/1/e/cf1e638586bc90857600c5b77cf0a0aac71f9f1d/CRB_Produktblatt_eBKP-Assistant_A4_DE.pdf | CRB product sheet eBKP-Assistant (March 2025): screenshots with Hauptgruppen codes SA, BRA, FA, SSBT, SSBW, PSBY and the eBKP-Browser table for E03 (Mengeneinheit, Bezugscode, Bezugsbezeichnung) |
| CRB-KE | https://www.crb.ch/_Resources/Persistent/6/c/d/f/6cdf311dd01c7f8fd580df6d59cefb80de21fe21/Kurzeinfuehrung_eBKP-Assistant_2021_de.pdf | CRB short introduction eBKP-Assistant (March 2021): screenshots with «Bezugscode» per Hauptgruppe in German abbreviations (GSF, GF, FAW, FB, NFH, BUF, BBJ, BBW, BBY) |
| CRB-RS | https://www.crb.ch/_Resources/Persistent/b/a/2/9/ba297291c00a30fbd079717708722c535963b497/Regelsatz_wichtigste_Punkte_de_Web_Nov21.pdf | CRB summary of the IFC rule set (November 2021): «Bei einigen Elementen sind Beträge in Schweizer Franken als Bezugsgrösse in der Norm vorgegeben (z.B. A01.01 Grundstückserwerb ff.)»; H is evaluated through the Nutzfläche of the assigned rooms |
| ZH | https://www.stadt-zuerich.ch/content/dam/web/de/planen-bauen/projekte-und-ausschreibungen/dokumente/hochbauvorhaben/vorgaben/bauoekonomie/beispiel-kostenvoranschlag-kv-wegleitung-bauoekonomie-ebkp-h.pdf | Stadt Zürich, Amt für Hochbauten: example Kostenvoranschlag «eBKP-H (SN 506511D/2020)» (PDF dated May 2026), 21 pages, column «Bezug» for Hauptgruppen, 48 Elementgruppen and 128 Elemente. Same data at Elementgruppe level in the KGS example (…/beispiel-grobkostenschaetzung-kgs-wegleitung-bauoekonomie-ebkp-h.pdf) and at Element level in the KS example (…/beispiel-kostenschaetzung-ks-wegleitung-bauoekonomie-ebkp-h.pdf), same folder |
| ZH-WL | https://www.stadt-zuerich.ch/content/dam/web/de/planen-bauen/projekte-und-ausschreibungen/dokumente/hochbauvorhaben/vorgaben/bauoekonomie/wegleitung-bauoekonomie.pdf | Stadt Zürich, Wegleitung Bauökonomie (December 2025): «Die Bezugsgrösse A ist anzuwenden»; page 11 lists «Flächen eBKP-H (SN 506 511:2020)» for C01, E01–E03, F01, F02, D07, D08, D09 |
| ZH-XL | https://www.stadt-zuerich.ch/content/dam/web/de/planen-bauen/projekte-und-ausschreibungen/dokumente/hochbauvorhaben/vorgaben/bauoekonomie/vorlage-baukostenkennwerte.xlsx | Stadt Zürich form «Baukostenkennwerte», sheet «Eingabe»: «Flächen eBKP-H (SN 506 511:2012)» with FBF, FAW, FAWU, FAWUE, FEA, FDH, AAW, VD7 |
| SG | https://www.sg.ch/bauen/hochbau/richtlinien-und-vorlagen/planungsvorgaben/_jcr_content/Par/sgch_downloadlist/DownloadListPar/sgch_download_1095203107.ocFile/Richtlinie%20fuer%20Planende.pdf | Kanton St.Gallen, Hochbauamt, «Richtlinie für Planende» version 1.1.1 (04.01.2026), Anhang A-3.2, Tabelle 12 (pages 27–36): Code, Bezeichnung, Bezugsgrösse (abbreviation and name), Einheit for every Element of eBKP-H 2020, system A; written as «GSF(SA)», «GF(FA)», «BUF(ESA)», «NF(USA)» |
| OAK12 | https://crb.ch/_Resources/Persistent/6/1/1/9/61196df8221baf7f801ec951672120c2850c3a5b/Auszug_OAK_Kennwerte_de-2.pdf | CRB excerpt Objektarten-Katalog OAK (2012; same file as the local `docs/reference/sources/Auszug_OAK_Kennwerte_de-2.pdf`): table «Kosten nach Hauptgruppen eBKP-H (2012)» with Bezugsmenge per Hauptgruppe |
| N12 | https://planerwissen2go.com/wp-content/uploads/2017/08/PLANERWISSEN2go_eBKP-H_12_de.pdf | Third-party mirror of CRB's excerpt of SN 506 511:2012: chapter 4.7 and the sample page of chapter 5.2 for E |
| SPI12 | https://www.crb.ch/_Resources/Persistent/8/b/e/1/8be17d9ccedf72a83de8c200a030591303098e95/Auszug_Handbuch_Spitalbau_de.pdf | CRB excerpt «Handbuch Spitalbau» (2012): «m2 \| NFH4 \| Nutzfläche zu H 4» |
| FF | https://www.frauenfeld.ch/public/upload/assets/46373/Beilage%2012%20Bericht%20Kalkulation%20Casino%20Frauenfeld%20-.pdf?fp=1 | Planner's cost report Casino Frauenfeld (2025), practice example in 2012-style abbreviations with names per Hauptgruppe; contains planner's own abbreviations and one deviation (C on GV) |
| HBA-ZH | https://www.zh.ch/content/dam/zhweb/bilder-dokumente/themen/planen-bauen/hochbau/planungsgrundlagen/wegleitungen/wegleitungen/wl_baukostenmanagement.pdf | Kanton Zürich, HBA-Wegleitung Baukostenmanagement: requires «eBKP-H Bezugsgrösse A … gemäss CRB eBKP-H Anwenderhandbuch»; contains no list |
| BauPlus | https://help.bauplus.ch/123.html | Software help: A is the primary proposal, B the alternative; «Individuelle Berechnungsbezüge sind nicht vorgesehen, es werden nur die der Normen unterstützt» (read through a page summary only) |

## 4. Gaps and confidence

- **Not an extract of the norm.** Apart from Hauptgruppe E (norm excerpt) and C04 (handbook excerpt), every 2020 value comes from documents of public clients that reproduce the norm, not from SN 506 511 itself. The agreement between the independent Zürich and St.Gallen documents (111 of 111 Element codes) and with the CRB excerpts makes the abbreviations and units reliable; a final check against chapter 5.2/5.4 of the norm or the CRB eBKP-Assistant is still outstanding.
- **Elementgruppen without a sourced value (17 of 71):** B07, D11, H02–H06, H09, J01, J04, V02, W03, W05, W06, W07, Y01, Y02. For D11, J01 and H02–H06/H09 the Elemente are known and suggest the group value (SSCP, USA, MUAH2…), but that is an inference. For W03, W05–W07 the sibling groups W01, W02, W04 use FA (m²); for Y01/Y02 the Hauptgruppe uses SSBW (CHF). Neither is confirmed for the missing groups.
- **Sourced from St.Gallen only (6):** B09, H01, H07, H08, J02, J03. These sit on rows the St.Gallen guideline marks as its own optional aggregation level. On two such rows St.Gallen differs from the Zürich output (B03: SA instead of FA; D02: FA in m² instead of SD110 in CHF), so St.Gallen group-level values are less certain than its Element-level values.
- **Hauptgruppen H and J in 2020** are derived (MUAH, USA), not read off a Hauptgruppe row. Their 2012 values (NFH, NF) are sourced. Hauptgruppe Y (SSBW) rests on one CRB marketing screenshot photographed at an angle; the letters are legible, but it is a single source.
- **Names missing** for OFSA (B08), COL (C03), IN (D12), PDA (G01), HSA (I04) and for the cost-sum references SSA01, SSD, SD110, SSBT, SSBJ, SSBW. Their meaning in table 1.2 is read from the numbers in the Zürich example (e.g. SSD = 495'000 = cost of D), not from a definition. In that example PSBY is 2'809'500 while B–Y adds up to 2'800'000; the difference equals A02.07, so the software's VAT base is not simply B–Y.
- **A01 and CHF:** CRB's rule-set note says CHF amounts are the Bezugsgrösse «in der Norm» for some Elemente, «z.B. A01.01 Grundstückserwerb ff.» [CRB-RS], whereas Zürich and St.Gallen both show m² SA for A01.01/A01.02. This is unresolved; the note may refer to system B or to A02.
- **F01:** the Zürich examples print RCA, the Zürich guideline text prints «RCS». RCA is used here because it appears in three software outputs.
- **System B** is public only for the nine rows in 2.3. Which other codes have a B value, and with which unit, could not be found.
- **Edition 2012:** only the Hauptgruppen and group E are sourced from CRB documents. FBF, FDH, AAW and VD7 come from a Stadt Zürich form; no complete 2012 list per Elementgruppe was found.
- **Units:** the six units in 1.1 are all that occur in the sources for system A down to Element level. If the form must also accept positions below Element level, practice documents additionally use pl/gl. (pauschal), Mt, % and Stk; those are not norm values.
- **Looked for without result:** a German Wikipedia article on eBKP-H (none found under the expected title or by search), werk-material.online (licence required; CRB's bSDD entry holds a single sample object), an eBKP-H dictionary in bSDD (none), CRB's IFC rule set as a download (only the summary PDF was found), ETH and FHNW lecture or paper material with a Bezugsgrössen table (none found). A UZH CUREM thesis and the Frauenfeld report contain cost estimates with planners' own abbreviations (e.g. BOF, WF, DDF); they were not used for the mapping. web.archive.org and GitHub code search could not be reached from this environment, so archived CRB PDFs and open-source data sets were not checked.

## 5. Use in the prototype

- **Dropdown «Einheit»** of the cost forms KV-32 and KS-31 (`data/forms.json › kinds.kv.units`, `kinds.ks.units`): the six units of section 1.1 (m², m³, m, St, m³/h, CHF) and «pauschal». «pauschal» is not a value of the norm: it stands for a Kostenelement without a Bezugsgrösse and is the default of the 17 Elementgruppen without a sourced value.
- **CHF** is a Berechnungsbezug (a sum of cost groups), not a quantity that is measured. The form therefore asks for no Menge when the unit is CHF, as with «pauschal».
- **Catalogue** (`data/ebkp.json › elements`): every sourced Elementgruppe carries unit, abbreviation and name of its Bezugsgrösse A (table 2.2), shown as hover text of the unit; names the sources do not give stay empty. The six values that rest on the St.Gallen table only (B09, H01, H07, H08, J02, J03) are included.
- **Sample rows** of the Musterprojekt (`data/ebkp.json › ebkp`) follow the catalogue. J01 Mobiliar has no sourced value and is counted in pieces (St), a choice of the delivery team.
- **A01** uses m² SA (Zürich and St.Gallen agree at group level); the CRB note on CHF for «A01.01 ff.» (section 4) is not resolved.
- Not adopted: system B, the abbreviations at Element level, the 2012 edition.
