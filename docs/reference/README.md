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
