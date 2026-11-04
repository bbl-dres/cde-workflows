# Ökobilanzdaten und Systemgrenzen für die Ökobilanz Bauemissionen (THG-32)

Stand: 4. November 2026 · Recherche zu den Auswahlfeldern «Ökobilanzdaten» und «Systemgrenze» in den Grundlagen des
Datenformulars THG-32. Fragen: Welche Ökobilanz-Datenquellen sind im DACH-Raum gebräuchlich, was gilt für das Modell ecCo
des Bundes, und welche Systemgrenzen kommen neben SIA 2032 in Frage (insbesondere SNBS)? Die Begriffe folgen der Seite
[kbob.admin.ch › Ökobilanzdaten im Baubereich](https://www.kbob.admin.ch/de/oekobilanzdaten-im-baubereich): Die Liste heisst
«Ökobilanzdaten im Baubereich» bzw. «KBOB/ecobau-Liste 2022», ein Eintrag ist eine «Position», die ID ein «eindeutiger
Bezeichner (UUID)» neben der ID-Nummer der Excel-Liste; das Wort «Datensatz» verwendet die Seite nicht.

## 1. Ökobilanzdaten (Datenquellen)

| Quelle | Land, Herausgeber | Regelwerk, Hintergrunddaten | Verwendung | Stand |
|---|---|---|---|---|
| **KBOB/ecobau-Liste 2022 «Ökobilanzdaten im Baubereich»**, Version 9.0 | CH, KBOB mit ecobau und IPB | KBOB-Bilanzierungsregeln (Plattform Ökobilanzdaten im Baubereich); Hintergrund: UVEK-Ökobilanzdatenbestand auf ecoinvent-Basis; 815 Positionen in Baumaterialien, Gebäudetechnik, Energie, Transporte, Entsorgung; Durchschnittsdaten plus herstellerspezifische und herstellerregionenspezifische Positionen | Pflichtbasis für SIA 2032:2020, SIA 390/1:2025, SNBS Hochbau 2023.1, Minergie/Minergie-ECO; damit Standard für Bauten des Bundes | V9.0 (2026); Aktualisierung des Hintergrunddatenbestands angekündigt |
| KBOB/ecobau-Liste 2022, Version 8.02 | CH | wie oben, Vorversion (Namen und ID-Format in 9.0 harmonisiert, neue herstellerspezifische Positionen) | laufende Projekte, Vergleich mit Vorphase | abgelöst |
| **ÖKOBAUDAT** (Release 2024-II) | DE, BMWSB/BBSR | EN 15804+A2; zwei Varianten der Hintergrunddaten: Sphera MLC (ehemals GaBi) und ecoinvent; rund 900 generische und produktspezifische Datensätze; A1-Datensätze werden nicht mehr gepflegt | BNB, QNG (mit EPD-Datensätzen nach QNG-Rechenregeln), DGNB (generische ÖKOBAUDAT-Daten); verbreitetste Quelle in Deutschland | 2024-II |
| **baubook** | AT, baubook GmbH (IBO, Energieinstitut Vorarlberg) | Produkt- und Bauteildatenbank; Kennwerte nach EN 15804+A1 und +A2, jeweils mit ecoinvent oder GaBi als Hintergrund; A1 und A2 dürfen nicht gemischt werden | OI3-Index (Wohnbauförderung, Gebäudepass; derzeit noch A1/ecoinvent mit Übergangsregel), klimaaktiv | laufend; IBO-Richtwerte 2025 nach A2 angekündigt |
| **ecoinvent** 3.12 (3.11: 2024) | CH, ecoinvent Association | Hintergrunddatenbank (Sachbilanzen) mit EN 15804-Add-on; lizenzpflichtig | Hintergrund für KBOB (via UVEK), baubook, ÖKOBAUDAT-ecoinvent-Variante und die meisten EPD-Programme; direkt in LCA-Software (SimaPro, openLCA, One Click LCA) | 3.12 (2025/2026) |
| **Herstellerspezifische EPD** (EN 15804+A2) | DACH: IBU (DE), Bau-EPD GmbH (AT), EPD-Programme mit gegenseitiger Anerkennung | produktspezifische Deklarationen; ÖKOBAUDAT übernimmt Bau-EPD- und IBU-Daten; die KBOB-Liste führt herstellerspezifische Positionen nach eigenen Regeln (nicht EPD) | QNG verlangt EPD-Datensätze; in der Schweiz nur über die KBOB-Regeln anrechenbar (Faktenblatt betonsuisse: KBOB- und EPD-Regeln unterscheiden sich) | laufend |
| Tool-Datenbanken (One Click LCA, Lesosai, GREG, Enerweb 380/1 ECO) | – | integrieren die KBOB-Liste (One Click LCA nennt «KBOB-Ökobilanzdaten» und CemSuisse) bzw. ÖKOBAUDAT/INIES als Länderdurchschnitte | Berechnungstool, keine eigene Datenquelle | – |

**Modell ecCo** («Modell Vorbild Klima Bund», GS-UVEK, löst RUMBA ab Ende 2025 ab): Die Bundesverwaltung erfasst ihre
Treibhausgasemissionen «gemäss Greenhouse Gas Protocol» (Scope 1–3, inkl. gemieteter Gebäude und vorgelagerter Emissionen).
Die Seite nennt keine Materialdatenbank und keine Norm für Erstellungsemissionen. Für Gebäude des Bundes liefert das BBL
die Erstellungsemissionen nach SIA 2032:2020 mit den KBOB/ecobau-Daten (KBOB-Faktenblatt «Graue Treibhausgasemissionen
bei der Erstellung von Gebäuden», 2025) — die KBOB ist das Koordinationsorgan der öffentlichen Bauherren, in dem das BBL
vertreten ist. Die Datenquelle für ecCo ist also die KBOB-Liste; ecCo selbst rechnet nicht mit Materialdaten, sondern
übernimmt die bilanzierten Werte. Quellen: [uvek.admin.ch/de/ecco](https://www.uvek.admin.ch/de/ecco),
[BAFU, Validierung Scope-3-Modul Immobilien (SIA 2032, KBOB)](https://www.bafu.admin.ch/dam/bafu/de/dokumente/klima/externe-studien-berichte/validierung-des-scope3-moduls-fuer-immobilien.pdf.download.pdf/validierung-des-scope3-moduls-des-co2-rechners.pdf).

**Empfehlung Dropdown «Ökobilanzdaten»**: KBOB/ecobau-Liste 2022 V9.0 als Vorgabe, V8.02 für laufende Projekte, ÖKOBAUDAT
und baubook für Auslandbauten (DE, AT) und Vergleiche, ecoinvent als Hintergrunddaten in LCA-Software, herstellerspezifische
EPD als Ergänzung (im Formular bereits je Emissionsquelle als «herstellerspezifisch» markierbar).

## 2. Systemgrenzen (Bilanzperimeter) für die Erstellung

| Systemgrenze | Inhalt | Daten, Bezug | Quelle |
|---|---|---|---|
| **SIA 2032:2020** «Graue Energie – Ökobilanzierung für die Erstellung von Gebäuden» | Erstellung inkl. Ersatz und Entsorgung über 60 Jahre; Bilanzperimeter ganzes Gebäude mit beheizten und unbeheizten Teilen; Elementgruppen B–G inkl. Gebäudetechnik; Amortisationszeiten je Elementgruppe (Anhang C) | KBOB-Liste; Bezug EBF (kg CO₂-eq/m² EBF·a) | Merkblatt SIA 2032; [Minergie Berechnungsmethodik 2026](https://www.minergie.ch/media/berechnungsmethodik-thge-in-erstellung-minergie-2026-1_1.pdf) |
| **SNBS Hochbau 2023.1**, Kriterium 311 «Treibhausgasemissionen Erstellung» | «Vollständige Systemgrenze nach SIA 2032:2020» (erweitert gegenüber Minergie-ECO: Baugrubensicherung, Pfählungen, Sonnenschutz, Baugrubenabschluss); Noten in Schritten von 2.5 kg CO₂-eq/m²·a; Mobilität (313) als einziges Label weiterhin bilanziert; PV: Eigenverbrauch 100 %, Netzeinspeisung 40 % anrechenbar | «Berechnung nach SIA 2032:2020, Grundlage KBOB 2009/1:2022»; Hilfstool SNBS | [NNBS, THGE und Energie in SNBS 2023.1](https://nnbs.ch/wp-content/uploads/2024/01/2024-02-20-Zoom-Lunch-Energie-und-THGE-Martin-Kaercher.pdf), [Kriterienbeschrieb SNBS-Hochbau 2023.1](https://www.snbs-hochbau.ch/media/2023-09-13_kriterienbeschrieb_snbs-hochbau_version-2023.1_1_.pdf) |
| **Minergie / Minergie-ECO** (2023, Methodik 2026) | SIA 2032:2020 mit KBOB-Liste, Bilanzperimeter ganzes Gebäude; objektspezifischer Grenzwert = Basisgrenzwerte für EBF und GF−EBF plus Zuschläge für PV, Solarthermie und Erdsonden; ECO mit Zielwert GW1 und Grenzwert GW2, Minergie nur Grenzwert für Neubauten | KBOB-Liste; kg CO₂-eq/(m² EBF·a) | [Minergie Berechnungsmethodik 2026](https://www.minergie.ch/media/berechnungsmethodik-thge-in-erstellung-minergie-2026-1_1.pdf), [Minergie-ECO Berechnung 2023.2](https://www.minergie.ch/media/231031_me-eco_berechnung_graue_energie-thge_v2023-2_de.pdf) |
| **SIA 390/1:2025** «Klimapfad» | Treibhausgasbilanz über den Lebenszyklus: Erstellung (nach SIA 2032), Betrieb, Mobilität; Richtwerte «Basis» und «ambitioniert» mit Absenkpfad bis 2050; seit 1.2.2025 in Kraft, ersetzt den Effizienzpfad Energie | KBOB-Liste | [SNV, SN 591390/1:2025](https://insights.snv.ch/en/page/klimapfad-treibhausgasbilanz-uber-den-lebenszyklus-en), [Minergie, Vergleich Minergie–Klimapfad](https://www.minergie.ch/media/vergleich_minergie-klimapfad.pdf) |
| **EN 15978 (DGNB 2023, QNG, BNB)** | Lebenszyklusmodule A1–A3, B4, B6, C3–C4, D separat; Betrachtungszeitraum 50 Jahre; DGNB mit generischen ÖKOBAUDAT-Daten, QNG mit EPD-Datensätzen nach QNG-Rechenregeln | ÖKOBAUDAT; kg CO₂-eq/(m² NRF·a) | [One Click LCA, DGNB DE 2023 Env 1.1](https://oneclicklca.zendesk.com/hc/en-us/articles/18362047674012-DGNB-DE-2023-Env-1-1-Deutsch), [Linear, TGA in der Ökobilanzierung](https://www.linear.eu/en/blog/key-contributions-of-mep-in-the-life-cycle-assessment-of-buildings/) |
| **OI3 (AT, klimaaktiv, Wohnbauförderung)** | Ökoindex der thermischen Gebäudehülle (BG0–BG3, je nach Perimeter inkl. Innenbauteile und Haustechnik); nach EN 15804+A1 mit ecoinvent, Übergangsregel A1→A2 | baubook, IBO-Richtwerte | [baubook, OI3-Leitfaden Übergangsregel 2024](https://www.baubook.info/de/oekoprogramme/oekoindex/downloads/oi3-berechnungsleitfaden_v5-0_ergaenzung_uebergangsregel_en-15804-a1auf-a2_2024-11-26.pdf) |

**Empfehlung Dropdown «Systemgrenze»**: SIA 2032:2020 als Vorgabe (Grundlage aller Schweizer Nachweise), SNBS Hochbau 2023.1
(Kriterium 311, vollständige SIA-2032-Grenze; Planungsgrundlage des BBL), Minergie-ECO, SIA 390/1 Klimapfad, EN 15978 für
Auslandbauten und DGNB/QNG, «Abweichend, im Bericht begründet» als Rest.

## 3. Grenzen der Recherche

Normtexte (SIA 2032:2020, SIA 390/1:2025, SNBS-Kriterienbeschrieb, EN 15978) wurden nicht im Original gelesen; die Angaben
stützen sich auf die verlinkten Sekundärquellen (Minergie-Methodik, NNBS-Präsentation, Herausgeberseiten). Zahlenwerte der
Richt- und Grenzwerte sind deshalb nicht übernommen. Der ÖKOBAUDAT-Release trägt auf der Datenbankseite ein Datum in der
Zukunft (22.07.2026 für 2024-II); die Versionsangabe ist vor einer Verwendung zu prüfen. Für ecCo ist die Schnittstelle für
Erstellungsemissionen beim GS-UVEK zu klären (siehe Notiz vom 3. November 2026, Abschnitt 5.4).

Weitere Quellen: [ecobau, Hintergrundinformationen Ökobilanzen](https://www.ecobau.ch/de/instrumente/oekobilanzen/hintergrundinformationen),
[betonsuisse, Vergleich KBOB- und EPD-Bilanzierungsregeln (2025)](https://www.betonsuisse.ch/files/pdf1/faktenblatt_kbob_und_epd-2.pdf),
[ÖKOBAUDAT](https://www.oekobaudat.de/en), [ÖKOBAUDAT, LCA data according to EN 15804+A2](https://www.oekobaudat.de/en/service/article/lca-data-according-to-en-15804-a2.html),
[baubook, Ökobilanzen](https://www.baubook.info/de/baubook/news/archiv/oekobilanzen), [ecoinvent v3.12](https://ecoinvent.org/blog/ecoinvent-version-3-12/),
[IBU, Allgemeine Programmanleitung](https://ibu-epd.com/wp-content/uploads/2024/06/07-Allgemeine-Programmanleitung.pdf),
[One Click LCA, globale LCA-Daten](https://oneclicklca.com/de/why-us/capabilities/global-lca-data),
[Studie Ökobilanzen von Baustoffen für Tragwerke im DACH-Raum](https://ouci.dntb.gov.ua/en/works/l1WV8MP7/).
