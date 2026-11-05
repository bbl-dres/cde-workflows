# Referenzmaterial

`cde-r/` enthält Screenshots des Referenzsystems **cde-r.bbl.admin.ch** (1x, Windows, Brave) als Basis für die
Gap-Analyse in `docs/reviews/`. Der Ordner ist per `.gitignore` vom Repository ausgeschlossen (interne Oberfläche,
Benutzernamen). Dateiname = Seite + Breite in CSS-Pixeln.

| Datei | Seite | Hinweis |
|---|---|---|
| `dashboard-1528.png` | Startseite nach dem Login | Ganzes Fenster, 1528 x 1138 |
| `tasks-all-row-actions-1537.png` | `/tasks/all` | Zeilenaktionen als fixe Spalte rechts |
| `project-delivery-plan-1534.png` | `/projects/{id}/delivery-plan` | Projektmenü 240 px, Kacheln, leere Tabelle |
| `composite-ilp-real-vs-prototype-3069.png` | links Referenz, rechts Prototyp | Vergleichsbild des Autors |

`compare/` (ebenfalls ignoriert) nimmt die automatisch erzeugten Vergleichsbilder auf (`node tests/refshots.mjs`),
jeweils Referenz links, Prototyp rechts, gleiche Fensterbreite. Seiten ohne Referenz (Dokumente, LOIN, Logs, DWG-Lieferungen,
responsive Breiten 900 und 640 px) werden nur als `ours-*.png` abgelegt.

Weitere Screenshots (z. B. Projekte Liste/Karten, Überblick, Benachrichtigungen, Erstellen-Drawer, schmale
Fensterbreiten für das responsive Verhalten) bitte mit demselben Schema ablegen.

## `sources/` – Normen, Richtlinien und Datengrundlagen Dritter (lokal, ignoriert)

Heruntergeladene oder erhaltene Quellen der Recherche-Notizen in `docs/research/`. PDFs sind mit docling (DocumentConverter,
`export_to_markdown`) nach Markdown konvertiert, damit Agenten den Inhalt lesen können; der Kopfkommentar jeder `.md` nennt
Quelle und Datum der Konvertierung. Urheberrecht Dritter, deshalb per `.gitignore` vom Repository ausgeschlossen.

| Datei | Herausgeber, Stand | Inhalt | Markdown |
|---|---|---|---|
| `Auszug_eBKP_2020_Web.pdf` | CRB, SN 506 511:2020 (Auszug) | eBKP-H, Hauptgruppen, Elementgruppen und Elemente | `Auszug_eBKP_2020_Web.md`, bereinigt `eBKP-H_2020_Verzeichnis.md` |
| `Ökobilanzdaten_im_Baubereich_V9.0.xlsx` | KBOB/ecobau-Liste 2022, Version 9.0 (14.07.2026) | Ökobilanzdaten Baumaterialien, Gebäudetechnik, Energie, Transporte, Entsorgung | – (Struktur in `docs/research/2026-11-04-oekobilanz-bauemissionen-sia32.md`) |
| `Plattform_OeDB_Bilanzierungsregeln_Baustoffe_v9.0.pdf` | Plattform Ökobilanzdaten im Baubereich, Version 9.0, 01.09.2026, 34 S. | Regeln für hersteller- und produktspezifische Datensätze der KBOB/ecobau-Liste, Modul D, Umweltindikatoren (Kap. 10) | `.md` |
| `astra_8b001_anwendung_der_oekobilanz.pdf` | ASTRA 8B001, Ausgabe 2025 V1.00, 100 S. | Ökobilanz-Methode für die Infrastruktur von Nationalstrassen: Lebenszyklusphasen nach SN EN 15643-5, Projektbeispiele, Datenmanagement. Anderer Fokus als der Hochbau des BBL, als Methodenreferenz abgelegt | `.md` (zwei docling-Läufe, Seiten 1–62 und 63–100) |
| `ecoDevis_2026.pdf` | ecobau, ecoDevis 2026 | Ausschreibungshilfe nach NPK | – |
| `20230116_Faktenblatt_CO2-Emissionsfaktoren_04-2024_DE.pdf` | Faktenblatt CO₂-Emissionsfaktoren, Stand 04-2024 | Emissionsfaktoren Energieträger | – |

## `beispiele/` – Beispiele realer Lieferungen (lokal, ignoriert)

Vom BBL erhaltene Fachberichte, wie Planende sie heute als Lieferung einreichen; Grundlage der Empfehlungen zur Eingabemaske in
`docs/research/2026-11-05-oekobilanz-eingabemaske-erstellung-betrieb.md`. Die Berichte nennen Projekte, Firmen und Kontaktdaten
der Verfassenden, deshalb liegen sie nur lokal (per  ausgeschlossen; im Repository ist nur dieser Index). PDFs mit docling nach Markdown konvertiert.

| Datei (`.pdf` und `.md`) | Lieferung | Verfasst von, Stand | Inhalt |
|---|---|---|---|
| `BBL Beispiel - 250659_Be_20250804_Ökobilanzierung` | Ökobilanz Erstellung und Betrieb, Neubau Restaurations- und Konferenzgebäude Agroscope, Posieux (realisiert) | Gartenmann Engineering AG, 11.08.2025, 11 S. | Bilanz Erstellung je Bauteil und Gebäudetechnik (Lesosai, KBOB-Liste 7.0), Betrieb mit der Rechenhilfe SIA 390/1 (Energiedienstleistungen, PV-Ertrag, Netzbezug), Einordnung nach SIA 390/1 (Nutzung Restaurant), Minergie-ECO und Netto-Null-Absenkpfad |
| `BBL Beispiel - 4000-1096_251003_Oekobilanz-Optimierungspotential_260305` | Ökobilanz und Optimierungspotenzial, Neubau Unterkunftsgebäude Dono Nazionale, CST Tenero (in Betrieb seit 2024) | WaltGalmarini AG, 03.10.2025, Index 05.03.2026, 26 S. | Ergebnis je Bauteilgruppe mit Haupttreibern, Varianten konservativ/progressiv mit Reduktionsfaktoren je Bauteil, PV-Auslegung (Eigenverbrauch, Autarkie, Modul D), Mehrkosten je t CO₂-eq, Anforderungen für Architekturwettbewerbe |
