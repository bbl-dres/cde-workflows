// Columns of the task tables («Tabelle konfigurieren», gear icon). Mirrors the dialog of the CDE Bund:
// columns without data in the prototype are listed but cannot be switched on.
export const TASK_COLUMNS = [
  { key: 'name', label: 'Name', width: 'minmax(0,1.4fr)', fixed: true, sort: true },
  { key: 'bereich', label: 'Bereich', unavailable: true },
  { key: 'project', label: 'Projekt', width: 'minmax(0,1.1fr)', globalOnly: true },
  { key: 'desc', label: 'Beschreibung', width: 'minmax(0,1.1fr)', sort: true },
  { key: 'status', label: 'Status', width: '150px', sort: true },
  { key: 'typ', label: 'Typ', width: '110px', sort: true },
  { key: 'zug', label: 'Zugewiesen an', width: '150px', sort: true },
  { key: 'fuer', label: 'Aufgabe für', width: '125px' },
  { key: 'kat', label: 'Kategorien', width: '80px' },
  { key: 'start', label: 'Geplanter Start', width: '125px', sort: true },
  { key: 'ende', label: 'Geplantes Ende', width: '125px', sort: true },
  { key: 'zugAm', label: 'Zugewiesen am', unavailable: true },
  { key: 'gestartet', label: 'Gestartet am', unavailable: true },
  { key: 'abgeschlossen', label: 'Abgeschlossen am', unavailable: true },
  { key: 'ueberfaellig', label: 'Überfällig', unavailable: true },
  { key: 'erstellt', label: 'Erstellt am', unavailable: true },
  { key: 'erstelltVon', label: 'Erstellt von', unavailable: true },
  { key: 'upd', label: 'Aktualisiert am', width: '115px', sort: true },
  { key: 'updVon', label: 'Aktualisiert von', unavailable: true },
];

export const DEFAULT_TASK_COLS = TASK_COLUMNS.filter(c => !c.unavailable).map(c => c.key);
