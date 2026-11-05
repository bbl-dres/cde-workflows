// Initial application state, derived from the mock data: application shell (user, dialogs, drawers, favorites),
// the Datenformulare of every project (state.projects[pid]), the Planlieferungen DWG and the settings.

import { DEFAULT_TASK_COLS } from './columns.js';
import { initialPlans } from './plan.js';
import { mockProject, groupAmounts, KEYS } from './mock.js';

export const STATE_VERSION = 18;   // bump whenever the shape of the persisted state changes (sessions with an older version start fresh)

/** Values and workflow state of the Datenformulare of one project (see model/form.js and model/mock.js). */
export function initProject(data, project) {
  const M = mockProject(project, data), D = data.forms;
  const inst = (D.byProject || {})[project.id] || {};
  const groupCodes = kind => (kind === 'thg' ? Object.keys(data.thg.eg) : data.ebkp.ebkp.map(g => g.code));
  const forms = Object.fromEntries(Object.entries(inst).map(([kind, I]) => [kind, {
    step: I.step, dates: [...(I.dates || [])], rejected: false,
    // «detail» = positions shown (KV/KS: Aufschlüsseln) or group opened (THG); «direct» = one amount / group closed
    modes: Object.fromEntries(groupCodes(kind).map(g => [g, (D.kinds[kind].detailDefault || []).includes(g) ? 'detail' : 'direct'])),
    gvals: KEYS[kind] ? groupAmounts(M[KEYS[kind][1]], data) : {}, checks: {}, missingOnly: false, events: [], comment: '',
    removed: {}, added: [], nNew: 0,                       // positions removed / Kostenelemente added in the Erfassung (KV/KS)
    units: {}, kws: {},                                    // KV/KS: Einheit chosen and Kennwert CHF/m² GF entered per Kostenelement or Hauptgruppe (else from the norm / derived)
    docs: [],                                              // files the imports brought in ([name, type, req, by, date]), on top of the documents of the instance
  }]));
  return { kvQ: M.kvQ, kvV: M.kvV, ksQ: M.ksQ, ksV: M.ksV, thgSrc: M.thgSrc, thgHead: M.thgHead, thgBetr: M.thgBetr, sia: M.sia, forms };
}
const initProjects = data => Object.fromEntries(data.projects.projects.map(p => [p.id, initProject(data, p)]));

export function initialState(data) {
  return {
    __v: STATE_VERSION,
    // Application shell
    user: data.users.defaultUser,
    ui: { studyOpen: false, dialog: null, notif: false, notifUnreadOnly: false, userMenu: false, navOpen: {}, toast: null, sideOpen: false, planTab: 'rules', planFilter: 'all', planSearch: '', importMenu: false, ovArea: 'e', busy: null, search: '', searchOpen: false, searchIdx: -1 },
    favorites: ['musterhausen'],
    taskCols: [...DEFAULT_TASK_COLS],
    notifRead: [],
    // Study tweaks (the «props» of the design study)
    tweaks: { showMarkers: true, anlagekostenMio: (data.projects.projects.find(p => p.detailed) || data.projects.projects[0]).anlagekostenMio },
    // Datenformulare per project: position values, Emissionsquellen and Betrieb of the Ökobilanz, Bezugsmengen SIA 416, workflow per form
    projects: initProjects(data),
    // Dialogs / flows
    orderType: 'thg',
    imp: { form: 'kv', step: 1, filter: 'alle', mode: 'ueber', done: false, applied: 0, file: null, undo: null },   // Excel importieren: form of the dialog, chosen file { name, size, payload }, state before the import (undo)
    plans: initialPlans(data),                          // Planlieferungen DWG für das Flächenmanagement (SAP RE-FX) (DWG-UG … DWG-DG, Musterhausen)
    // Settings
    tplSel: data.templates.initialSelected,
    tplOn: { ...data.templates.initialActive },
  };
}
