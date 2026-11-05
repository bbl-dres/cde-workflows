# Third-party components

The prototype itself is MIT-licensed (see [LICENSE](LICENSE)). It uses the following third-party software, assets, services and reference material. Versions are pinned where the component is loaded or vendored.

## Libraries (run in the browser)

| Component | Version | Licence | Where | Use |
|---|---|---|---|---|
| [MapLibre GL JS](https://maplibre.org/) | 4.7.1 | BSD-3-Clause | cdnjs, SRI in `index.html` | Maps on the start page and the project overview |
| [jsPDF](https://github.com/parallax/jsPDF) | 2.5.2 | MIT | jsDelivr, SRI in `js/plancheck/report.js`, loaded on the first Prüfbericht | PDF report of a plan check |
| [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) | 3.8.4 | MIT | jsDelivr, SRI in `js/plancheck/report.js` | Tables in the PDF report |
| [@mlightcad/libredwg-web](https://github.com/mlightcad/libredwg-web) (LibreDWG compiled to WebAssembly) | 0.7.11 | **GPL-3.0** ([licence](js/vendor/libredwg-web/LICENSE), [sources and checksums](js/vendor/libredwg-web/README.md)) | vendored in `js/vendor/libredwg-web/`, loaded on the first plan check | Reading DWG files in the browser |
| [plan-check](https://github.com/bbl-dres/plan-check) (Prüfplattform Flächenmanagement, BBL) | port of November 2026 | MIT ([licence](js/plancheck/LICENSE), [origin per file](js/plancheck/THIRD_PARTY.md)) | ported into `js/plancheck/` | Rules, geometry, viewer and SIA 416 figures of the plan check |

LibreDWG is a GNU project under GPL-3.0-or-later: keep its licence text and notices together with the WebAssembly build when redistributing the application.

## Assets

| Component | Version | Licence | Where | Use |
|---|---|---|---|---|
| [Lucide](https://lucide.dev/) icons (`lucide-static`) | 0.460.0 | ISC | 70 SVG files in `assets/icons/` | Interface icons, rendered as CSS masks |
| Pictograms of the eBKP-H Hauptgruppen (design study, 05.11.2026) | – | MIT (this repository) | 14 SVG files in `assets/ebkp/` | Line pictograms A–Z of the bar lists, rendered as CSS masks |
| [Noto Sans](https://fonts.google.com/noto/specimen/Noto+Sans), Noto Sans Mono | Google Fonts | SIL Open Font License 1.1 | Google Fonts CDN, `index.html` | Interface and monospace typeface |
| Project photos | – | CC0 1.0, CC BY 3.0, CC BY-SA 4.0 per photo ([credits](assets/projects/ATTRIBUTION.md)) | `assets/projects/` | Illustrations of the fictional projects; source Wikimedia Commons, not BBL material |
| Sample DWG plans | – | see [js/plancheck/THIRD_PARTY.md](js/plancheck/THIRD_PARTY.md) | `assets/plans/` | Musterplan and office sample of the plan check |
| Swiss flag mark | – | Swiss federal symbol, used only to mimic the CDE Bund header of this demonstration | `assets/swiss-logo-flag.png` | Topbar logo |

## Online services (no account, no key)

| Service | Terms | Use |
|---|---|---|
| [CARTO basemaps](https://carto.com/basemaps/) «Positron» vector tiles | © CARTO, © OpenStreetMap contributors (ODbL); CARTO basemap terms for non-commercial use | Primary map style worldwide |
| [Esri World Light Gray Base](https://www.arcgis.com/home/item.html?id=ed712cb1db3e4bae9e85329040fb9a49) raster tiles | © Esri, HERE, Garmin, FAO, NOAA, USGS, © OpenStreetMap contributors; Esri terms of use | Fallback map style when the CARTO style cannot be loaded |
| cdnjs, jsDelivr, Google Fonts | respective CDN terms | Delivery of the libraries and fonts above |

Nothing is uploaded to these services except the tile, script and font requests of the browser. DWG files are parsed locally.

## Reference material (documentation only, not redistributed as code)

| Material | Owner | Where | Use |
|---|---|---|---|
| eBKP-H SN 506 511:2020, excerpt | CRB / SIA, © CRB 2020 | `docs/reference/sources/Auszug_eBKP_2020_Web.pdf`, converted with docling to `.md`, cleaned directory in `eBKP-H_2020_Verzeichnis.md` | Codes and names of the Hauptgruppen, Elementgruppen and Elemente in `data/ebkp.json` and `data/thg.json` |
| KBOB/ecobau «Ökobilanzdaten im Baubereich» 2022, Version 9.0, and KBOB Faktenblatt CO₂-Emissionsfaktoren | KBOB, [kbob.admin.ch](https://www.kbob.admin.ch/de/oekobilanzdaten-im-baubereich) | `docs/reference/sources/`, `docs/research/` | KBOB IDs and names of the Emissionsquellen |
| ecoDevis 2026 | eco-bau | `docs/reference/sources/` | Research notes |
| Bautendokumentationen des BBL | BBL, [bbl.admin.ch](https://www.bbl.admin.ch/de/bautendokumentationen) | `data/projects.json` | Public project names; phases, values, firms and people are fictional |
| CAD-Richtlinie BBL V1.0 | BBL | via plan-check | The 40 rules of the plan check |

## Development tools (not shipped)

| Tool | Licence | Use |
|---|---|---|
| Node.js (`node --test`) | MIT | Unit tests |
| Chromium browser (Edge, Chrome or Brave) via the DevTools protocol | – | Browser tests, screenshots, responsive audit |
| Python `http.server` | PSF | Local static server |
| [docling](https://github.com/docling-project/docling), [pypdf](https://github.com/py-pdf/pypdf) | MIT, BSD-3-Clause | Conversion and cross-check of the eBKP-H excerpt |
| Pillow | HPND | Cropping and resizing of the project photos |
