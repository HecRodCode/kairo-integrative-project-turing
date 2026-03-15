import { guards, sessionManager } from '../../src/core/auth/session.js';
import { API_BASE } from '../../src/core/config.js';

const GROUP_SIZE = 4;
const THEME_KEY = 'kairo_theme';
const GROUP_STATE_KEY = 'kairo_groups_state_v2';
const LEADERS_HISTORY_KEY = 'kairo_groups_leaders_history_v1';

let coders = [];
let manualMode = false;
let manualAssignments = {}; // { coderId: { group: "A", role: "leader" | "member" } }
let currentGroups = [];
let leadersHistory = [];
let historyVisible = false;

const coderList = document.getElementById('coder-list');
const groupsContainer = document.getElementById('groups-container');
const groupsHint = document.getElementById('groups-hint');
const codersCount = document.getElementById('coders-count');

const btnRandom = document.getElementById('btn-random');
const btnManual = document.getElementById('btn-manual');
const btnLevel = document.getElementById('btn-level');

let btnHistory = null;
let historyPanel = null;
let historyList = null;

start();

async function start() {
  const session = await guards.requireAuth();
  if (!session) return;

  const role = session.user.role.toLowerCase();
  if (role !== 'tl' && role !== 'admin') {
    sessionManager.redirectByRole(session.user);
    return;
  }

  applyThemeFromStorage();
  injectGroupsStyles();
  ensureThemeButton();
  ensureHistoryUI();

  document.querySelectorAll('.btn-logout').forEach((btn) => {
    btn.addEventListener('click', function () {
      sessionManager.logout();
    });
  });

  loadHistoryFromStorage();
  loadStateFromStorage();

  await loadCoders();
  normalizeManualAssignments();
  renderCoderList();
  restoreGroupsFromStorage();
  renderHistory();
  wireButtons();
}

function applyThemeFromStorage() {
  const stored = localStorage.getItem(THEME_KEY) || 'dark';
  document.documentElement.setAttribute('data-theme', stored);
}

function ensureThemeButton() {
  const topbarRight = document.querySelector('.topbar-right');
  if (!topbarRight) return;

  let btn = document.getElementById('btn-theme');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'btn-theme';
    btn.className = 'icon-btn group-theme-btn';
    btn.title = 'Cambiar tema';
    btn.innerHTML =
      '<i class="fa-solid fa-moon" id="icon-moon"></i>' +
      '<i class="fa-solid fa-sun" id="icon-sun" style="display:none"></i>';
    topbarRight.appendChild(btn);
  }

  syncThemeIcon(document.documentElement.getAttribute('data-theme') || 'dark');

  btn.addEventListener('click', function () {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    syncThemeIcon(next);
  });
}

function syncThemeIcon(theme) {
  const moon = document.getElementById('icon-moon');
  const sun = document.getElementById('icon-sun');
  if (!moon || !sun) return;
  moon.style.display = theme === 'dark' ? 'block' : 'none';
  sun.style.display = theme === 'light' ? 'block' : 'none';
}

function ensureHistoryUI() {
  const actions = document.querySelector('.groups-actions');
  const body = document.querySelector('.groups-body');
  if (!actions || !body) return;

  btnHistory = document.createElement('button');
  btnHistory.className = 'btn-action-secondary';
  btnHistory.id = 'btn-history';
  btnHistory.innerHTML =
    '<i class="fa-solid fa-timeline"></i> Historial de líderes';
  actions.appendChild(btnHistory);

  historyPanel = document.createElement('section');
  historyPanel.id = 'leaders-history-panel';
  historyPanel.className = 'leaders-history hidden';
  historyPanel.innerHTML =
    '<div class="leaders-history-head">' +
    '<h3>Historial de líderes por fecha de creación</h3>' +
    '<span class="leaders-history-badge" id="leaders-history-count">0 registros</span>' +
    '</div>' +
    '<div class="leaders-history-list" id="leaders-history-list"></div>';

  body.insertAdjacentElement('afterend', historyPanel);
  historyList = document.getElementById('leaders-history-list');

  btnHistory.addEventListener('click', function () {
    historyVisible = !historyVisible;
    historyPanel.classList.toggle('hidden', !historyVisible);
    if (historyVisible) {
      renderHistory();
    }
  });
}

async function loadCoders() {
  try {
    const res = await fetch(`${API_BASE}/tl/dashboard`, {
      credentials: 'include',
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error('Error cargando coders');
    }

    coders = data.coders || [];
    codersCount.textContent = coders.length + ' coders';
  } catch (e) {
    groupsHint.textContent = 'No se pudieron cargar los coders.';
  }
}

function getGroupLetters() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const count = Math.max(4, Math.min(12, Math.ceil(coders.length / 2)));
  const letters = [];
  for (let i = 0; i < count; i++) {
    letters.push(alphabet[i]);
  }
  return letters;
}

function renderCoderList() {
  coderList.innerHTML = '';

  if (coders.length === 0) {
    coderList.innerHTML = '<p class="empty-state">Sin coders disponibles.</p>';
    return;
  }

  const groupLetters = getGroupLetters();

  for (let i = 0; i < coders.length; i++) {
    const c = coders[i];

    const name = c.full_name || '—';
    const email = c.email || '—';
    const week = c.current_week || '—';
    const score = c.average_score || '—';
    const assignment = manualAssignments[String(c.id)] || {
      group: '',
      role: 'member',
    };

    let controls = '';

    if (manualMode) {
      let groupOptions = '<option value="">Sin grupo</option>';
      for (let j = 0; j < groupLetters.length; j++) {
        const letter = groupLetters[j];
        groupOptions +=
          '<option value="' +
          letter +
          '"' +
          (assignment.group === letter ? ' selected' : '') +
          '>Grupo ' +
          letter +
          '</option>';
      }

      controls =
        '<div class="manual-controls">' +
        '<select class="manual-select manual-group-select" data-id="' +
        c.id +
        '">' +
        groupOptions +
        '</select>' +
        '<select class="manual-select manual-role-select" data-id="' +
        c.id +
        '"' +
        (assignment.group ? '' : ' disabled') +
        '>' +
        '<option value="member"' +
        (assignment.role !== 'leader' ? ' selected' : '') +
        '>Miembro</option>' +
        '<option value="leader"' +
        (assignment.role === 'leader' ? ' selected' : '') +
        '>Líder</option>' +
        '</select>' +
        '</div>';
    }

    const div = document.createElement('div');
    div.className =
      'coder-card' + (assignment.role === 'leader' && assignment.group ? ' coder-leader' : '');
    div.innerHTML =
      '<div class="coder-main">' +
      '<div>' +
      '<h4>' +
      name +
      '</h4>' +
      '<p class="muted">' +
      email +
      '</p>' +
      '</div>' +
      (assignment.role === 'leader' && assignment.group
        ? '<span class="leader-chip">Líder G' + assignment.group + '</span>'
        : '') +
      '</div>' +
      '<div class="coder-meta">' +
      '<span>Semana: <strong>' +
      week +
      '</strong></span>' +
      '<span>Score: <strong>' +
      score +
      '</strong></span>' +
      '</div>' +
      controls;

    coderList.appendChild(div);
  }

  if (manualMode) {
    wireManualControls();
  }
}

function wireManualControls() {
  const groupSelects = document.querySelectorAll('.manual-group-select');
  for (let i = 0; i < groupSelects.length; i++) {
    groupSelects[i].addEventListener('change', function () {
      const coderId = groupSelects[i].getAttribute('data-id');
      const group = groupSelects[i].value;
      const roleSelect = document.querySelector(
        '.manual-role-select[data-id="' + coderId + '"]'
      );

      if (!group) {
        delete manualAssignments[coderId];
        if (roleSelect) {
          roleSelect.value = 'member';
          roleSelect.disabled = true;
        }
      } else {
        const previous = manualAssignments[coderId] || { role: 'member' };
        manualAssignments[coderId] = {
          group: group,
          role: previous.role || 'member',
        };
        if (roleSelect) {
          roleSelect.disabled = false;
        }
      }

      keepSingleLeaderPerGroup();
      saveStateToStorage();
      renderCoderList();
    });
  }

  const roleSelects = document.querySelectorAll('.manual-role-select');
  for (let i = 0; i < roleSelects.length; i++) {
    roleSelects[i].addEventListener('change', function () {
      const coderId = roleSelects[i].getAttribute('data-id');
      const role = roleSelects[i].value;
      const current = manualAssignments[coderId];

      if (!current || !current.group) {
        roleSelects[i].value = 'member';
        roleSelects[i].disabled = true;
        return;
      }

      manualAssignments[coderId] = {
        group: current.group,
        role: role,
      };

      keepSingleLeaderPerGroup(coderId);
      saveStateToStorage();
      renderCoderList();
    });
  }
}

function keepSingleLeaderPerGroup(lastLeaderId) {
  const byGroup = {};
  const ids = Object.keys(manualAssignments);

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const item = manualAssignments[id];
    if (!item || !item.group) continue;
    if (!byGroup[item.group]) byGroup[item.group] = [];
    byGroup[item.group].push({ coderId: id, role: item.role || 'member' });
  }

  const groups = Object.keys(byGroup);
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    const leaders = byGroup[g].filter((entry) => entry.role === 'leader');
    if (leaders.length <= 1) continue;

    let keeper = leaders[0].coderId;
    if (lastLeaderId) {
      for (let j = 0; j < leaders.length; j++) {
        if (leaders[j].coderId === String(lastLeaderId)) {
          keeper = String(lastLeaderId);
          break;
        }
      }
    }

    for (let j = 0; j < leaders.length; j++) {
      const id = leaders[j].coderId;
      manualAssignments[id].role = id === keeper ? 'leader' : 'member';
    }
  }
}

function renderGroups(groups) {
  groupsContainer.innerHTML = '';

  if (!groups || groups.length === 0) {
    groupsContainer.innerHTML = '<p class="empty-state">No hay grupos.</p>';
    return;
  }

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];
    if (!g.members || g.members.length === 0) continue;

    let members = '';
    for (let j = 0; j < g.members.length; j++) {
      const m = g.members[j];
      const isLeader = g.leader && String(g.leader.id) === String(m.id);
      members +=
        '<li class="' +
        (isLeader ? 'leader-member' : '') +
        '">' +
        '<span>' +
        (m.full_name || '—') +
        '</span>' +
        (isLeader ? '<span class="mini-chip">Líder</span>' : '') +
        '</li>';
    }

    const leaderName = g.leader ? g.leader.full_name || '—' : 'Sin líder';

    const div = document.createElement('div');
    div.className = 'group-card';
    div.innerHTML =
      '<div class="group-header">' +
      '<div>' +
      '<p class="group-eyebrow">' +
      (g.modeLabel || 'Grupos') +
      '</p>' +
      '<div class="group-title">' +
      g.title +
      '</div>' +
      '</div>' +
      '<span class="group-size">' +
      g.members.length +
      ' integrantes</span>' +
      '</div>' +
      '<div class="group-leader">' +
      '<i class="fa-solid fa-crown"></i> Líder: <strong>' +
      leaderName +
      '</strong>' +
      '</div>' +
      '<ul class="group-list">' +
      members +
      '</ul>' +
      '<p class="group-date">' +
      formatDate(g.createdAt) +
      '</p>';

    groupsContainer.appendChild(div);
  }
}

function randomGroups() {
  const shuffled = coders.slice().sort(function () {
    return Math.random() - 0.5;
  });

  const groups = [];
  let groupNumber = 1;
  const now = new Date().toISOString();

  for (let i = 0; i < shuffled.length; i += GROUP_SIZE) {
    const members = shuffled.slice(i, i + GROUP_SIZE);
    groups.push({
      title: 'Grupo ' + groupNumber,
      members: members,
      leader: members[0] || null,
      modeLabel: 'Aleatorio',
      createdAt: now,
    });
    groupNumber++;
  }

  return groups;
}

function levelGroups() {
  const level1 = [];
  const level2 = [];
  const level3 = [];
  const noData = [];
  const now = new Date().toISOString();

  for (let i = 0; i < coders.length; i++) {
    const week = Number(coders[i].current_week);

    if (!week) noData.push(coders[i]);
    else if (week <= 4) level1.push(coders[i]);
    else if (week <= 8) level2.push(coders[i]);
    else level3.push(coders[i]);
  }

  const groups = [
    { title: 'Nivel 1 (Semanas 1-4)', members: level1, modeLabel: 'Por nivel' },
    { title: 'Nivel 2 (Semanas 5-8)', members: level2, modeLabel: 'Por nivel' },
    { title: 'Nivel 3 (Semanas 9+)', members: level3, modeLabel: 'Por nivel' },
    { title: 'Sin datos', members: noData, modeLabel: 'Por nivel' },
  ];

  for (let i = 0; i < groups.length; i++) {
    groups[i].leader = groups[i].members[0] || null;
    groups[i].createdAt = now;
  }

  return groups;
}

function manualGroups() {
  const byGroup = {};

  for (let i = 0; i < coders.length; i++) {
    const coder = coders[i];
    const assign = manualAssignments[String(coder.id)];
    if (!assign || !assign.group) continue;
    if (!byGroup[assign.group]) byGroup[assign.group] = [];
    byGroup[assign.group].push({
      coder: coder,
      role: assign.role || 'member',
    });
  }

  const labels = Object.keys(byGroup).sort();
  if (labels.length === 0) {
    groupsHint.textContent =
      'Primero asigna coders a grupos manuales para poder generarlos.';
    return null;
  }

  const groups = [];
  const now = new Date().toISOString();

  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const assigned = byGroup[label];

    if (assigned.length < 2) {
      groupsHint.textContent =
        'Cada grupo manual debe tener un líder y al menos otro coder.';
      return null;
    }

    let leader = null;
    for (let j = 0; j < assigned.length; j++) {
      if (assigned[j].role === 'leader') {
        leader = assigned[j].coder;
        break;
      }
    }

    if (!leader) {
      groupsHint.textContent =
        'Cada grupo manual necesita un líder antes de crear los grupos.';
      return null;
    }

    const members = assigned.map(function (entry) {
      return entry.coder;
    });

    groups.push({
      title: 'Grupo ' + label,
      members: members,
      leader: leader,
      modeLabel: 'Manual',
      createdAt: now,
    });
  }

  return groups;
}

function wireButtons() {
  btnRandom.addEventListener('click', function () {
    manualMode = false;
    renderCoderList();
    const groups = randomGroups();
    useGeneratedGroups(groups, 'Grupos generados al azar.', 'random');
  });

  btnLevel.addEventListener('click', function () {
    manualMode = false;
    renderCoderList();
    const groups = levelGroups();
    useGeneratedGroups(groups, 'Grupos generados por nivel de estudio.', 'level');
  });

  btnManual.addEventListener('click', function () {
    if (!manualMode) {
      manualMode = true;
      renderCoderList();
      groupsHint.textContent =
        'Modo manual: asigna grupo, define un líder y vuelve a presionar para crear.';
      saveStateToStorage();
      return;
    }

    const groups = manualGroups();
    if (!groups) {
      saveStateToStorage();
      return;
    }

    useGeneratedGroups(groups, 'Grupos manuales generados.', 'manual');
  });
}

function useGeneratedGroups(groups, hint, mode) {
  currentGroups = groups;
  renderGroups(currentGroups);
  groupsHint.textContent = hint;
  saveHistoryEntry(currentGroups, mode);
  saveStateToStorage();
  if (historyVisible) renderHistory();
}

function saveHistoryEntry(groups, mode) {
  if (!groups || groups.length === 0) return;
  const createdAt = groups[0].createdAt || new Date().toISOString();
  const leaders = [];

  for (let i = 0; i < groups.length; i++) {
    if (!groups[i].leader) continue;
    leaders.push({
      groupTitle: groups[i].title,
      leaderId: groups[i].leader.id,
      leaderName: groups[i].leader.full_name || '—',
    });
  }

  if (leaders.length === 0) return;

  leadersHistory.unshift({
    createdAt: createdAt,
    mode: mode,
    leaders: leaders,
  });

  leadersHistory = leadersHistory.slice(0, 100);
  localStorage.setItem(LEADERS_HISTORY_KEY, JSON.stringify(leadersHistory));
}

function renderHistory() {
  if (!historyList) return;

  const count = document.getElementById('leaders-history-count');
  if (count) {
    count.textContent = leadersHistory.length + ' registros';
  }

  if (leadersHistory.length === 0) {
    historyList.innerHTML =
      '<p class="empty-state">Aún no hay historial de líderes.</p>';
    return;
  }

  let html = '';
  for (let i = 0; i < leadersHistory.length; i++) {
    const row = leadersHistory[i];
    let leaders = '';

    for (let j = 0; j < row.leaders.length; j++) {
      leaders +=
        '<li><strong>' +
        row.leaders[j].groupTitle +
        ':</strong> ' +
        row.leaders[j].leaderName +
        '</li>';
    }

    html +=
      '<article class="history-card">' +
      '<div class="history-row">' +
      '<span class="history-date">' +
      formatDate(row.createdAt) +
      '</span>' +
      '<span class="history-mode">' +
      modeLabel(row.mode) +
      '</span>' +
      '</div>' +
      '<ul class="history-leaders">' +
      leaders +
      '</ul>' +
      '</article>';
  }

  historyList.innerHTML = html;
}

function modeLabel(mode) {
  if (mode === 'manual') return 'Manual';
  if (mode === 'level') return 'Por nivel';
  return 'Aleatorio';
}

function formatDate(iso) {
  if (!iso) return 'Sin fecha';
  try {
    return new Date(iso).toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_e) {
    return iso;
  }
}

function normalizeManualAssignments() {
  const normalized = {};
  const ids = Object.keys(manualAssignments);

  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const item = manualAssignments[id];

    if (typeof item === 'string') {
      normalized[id] = { group: item, role: 'member' };
    } else if (item && typeof item === 'object') {
      normalized[id] = {
        group: item.group || '',
        role: item.role === 'leader' ? 'leader' : 'member',
      };
    }
  }

  manualAssignments = normalized;
  keepSingleLeaderPerGroup();
}

function saveStateToStorage() {
  const snapshot = {
    manualMode: manualMode,
    manualAssignments: manualAssignments,
    groups: currentGroups.map(function (g) {
      return {
        title: g.title,
        modeLabel: g.modeLabel || 'Grupos',
        createdAt: g.createdAt || new Date().toISOString(),
        leaderId: g.leader ? g.leader.id : null,
        leaderName: g.leader ? g.leader.full_name || '—' : null,
        members: g.members.map(function (m) {
          return {
            id: m.id,
            full_name: m.full_name || '—',
            email: m.email || '—',
            current_week: m.current_week || '—',
            average_score: m.average_score || '—',
          };
        }),
      };
    }),
    hint: groupsHint.textContent || '',
  };

  localStorage.setItem(GROUP_STATE_KEY, JSON.stringify(snapshot));
}

function loadStateFromStorage() {
  try {
    const raw = localStorage.getItem(GROUP_STATE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    manualMode = !!parsed.manualMode;
    manualAssignments = parsed.manualAssignments || {};
    currentGroups = parsed.groups || [];
    if (parsed.hint) groupsHint.textContent = parsed.hint;
  } catch (_e) {
    manualMode = false;
    manualAssignments = {};
    currentGroups = [];
  }
}

function restoreGroupsFromStorage() {
  if (!currentGroups || currentGroups.length === 0) return;

  const coderById = {};
  for (let i = 0; i < coders.length; i++) {
    coderById[String(coders[i].id)] = coders[i];
  }

  const restored = [];
  for (let i = 0; i < currentGroups.length; i++) {
    const g = currentGroups[i];
    if (!g.members || g.members.length === 0) continue;

    const members = [];
    for (let j = 0; j < g.members.length; j++) {
      const fromApi = coderById[String(g.members[j].id)];
      members.push(fromApi || g.members[j]);
    }

    let leader = null;
    if (g.leaderId != null && coderById[String(g.leaderId)]) {
      leader = coderById[String(g.leaderId)];
    } else if (g.leaderName) {
      for (let j = 0; j < members.length; j++) {
        if (members[j].full_name === g.leaderName) {
          leader = members[j];
          break;
        }
      }
    }
    if (!leader) leader = members[0] || null;

    restored.push({
      title: g.title,
      members: members,
      leader: leader,
      modeLabel: g.modeLabel || 'Grupos',
      createdAt: g.createdAt || new Date().toISOString(),
    });
  }

  currentGroups = restored;
  renderGroups(currentGroups);
}

function loadHistoryFromStorage() {
  try {
    const raw = localStorage.getItem(LEADERS_HISTORY_KEY);
    leadersHistory = raw ? JSON.parse(raw) : [];
  } catch (_e) {
    leadersHistory = [];
  }
}

function injectGroupsStyles() {
  if (document.getElementById('group-page-enhanced-style')) return;

  const style = document.createElement('style');
  style.id = 'group-page-enhanced-style';
  style.textContent = `
    .groups-toolbar {
      margin: 18px 0 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .groups-actions {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    .groups-hint {
      margin: 0;
      padding: 10px 12px;
      border: 1px solid var(--accent-border);
      background: var(--accent-dim);
      color: var(--text-main);
      border-radius: 10px;
      font-size: 13px;
    }
    .groups-body {
      display: grid;
      grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.2fr);
      gap: 16px;
      align-items: start;
    }
    .coder-list,
    .groups-container {
      background: var(--bg-card);
      border: 1px solid var(--border-glass);
      border-radius: 16px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 10px;
      backdrop-filter: blur(14px);
      min-height: 220px;
    }
    .coder-card {
      border: 1px solid var(--border-glass);
      border-radius: 14px;
      padding: 12px;
      background:
        linear-gradient(
          145deg,
          rgba(168, 85, 247, 0.10),
          rgba(56, 189, 248, 0.05)
        );
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: transform .15s ease, border-color .2s ease, box-shadow .2s ease;
    }
    .coder-card:hover {
      transform: translateY(-1px);
      border-color: var(--accent-border);
      box-shadow: 0 8px 22px var(--primary-glow);
    }
    .coder-card.coder-leader {
      border-color: rgba(245, 158, 11, 0.45);
    }
    .coder-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .coder-main h4 {
      margin: 0;
      font-size: 14px;
      color: var(--text-main);
    }
    .muted {
      margin: 2px 0 0;
      color: var(--text-muted);
      font-size: 12px;
    }
    .leader-chip {
      border: 1px solid rgba(245, 158, 11, 0.45);
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 999px;
      white-space: nowrap;
    }
    .coder-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      color: var(--text-muted);
      font-size: 12px;
    }
    .manual-controls {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .manual-select {
      width: 100%;
      border: 1px solid var(--border-glass);
      border-radius: 10px;
      padding: 8px 10px;
      color: var(--text-main);
      background: var(--input-bg);
      font-size: 12.5px;
      outline: none;
    }
    .manual-select:focus {
      border-color: var(--accent-border);
      box-shadow: 0 0 0 2px var(--accent-dim);
    }
    .manual-select:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .group-card {
      border: 1px solid var(--border-glass);
      border-radius: 16px;
      padding: 14px;
      background:
        radial-gradient(circle at right top, rgba(168, 85, 247, 0.18), transparent 45%),
        linear-gradient(160deg, rgba(168, 85, 247, 0.10), rgba(15, 23, 42, 0.15));
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    [data-theme='light'] .group-card {
      background:
        radial-gradient(circle at right top, rgba(124, 58, 237, 0.12), transparent 45%),
        linear-gradient(160deg, rgba(124, 58, 237, 0.08), rgba(241, 245, 249, 0.7));
    }
    .group-header {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      align-items: flex-start;
    }
    .group-eyebrow {
      margin: 0 0 3px;
      color: var(--text-muted);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 700;
    }
    .group-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--text-main);
    }
    .group-size {
      border-radius: 999px;
      padding: 5px 10px;
      font-size: 11px;
      font-weight: 700;
      color: var(--accent);
      border: 1px solid var(--accent-border);
      background: var(--accent-dim);
      white-space: nowrap;
    }
    .group-leader {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      border: 1px solid rgba(245, 158, 11, 0.45);
      background: rgba(245, 158, 11, 0.12);
      color: #f59e0b;
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12.5px;
    }
    .group-leader strong {
      color: var(--text-main);
    }
    .group-list {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 7px;
    }
    .group-list li {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 7px 9px;
      border-radius: 10px;
      border: 1px solid var(--border-glass);
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.03);
      font-size: 13px;
    }
    .group-list li.leader-member {
      border-color: rgba(245, 158, 11, 0.4);
      background: rgba(245, 158, 11, 0.08);
    }
    .mini-chip {
      font-size: 10px;
      border-radius: 999px;
      padding: 2px 7px;
      background: rgba(245, 158, 11, 0.16);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.45);
      font-weight: 700;
    }
    .group-date {
      margin: 0;
      color: var(--text-muted);
      font-size: 11px;
      text-align: right;
    }
    .leaders-history {
      margin-top: 14px;
      background: var(--bg-card);
      border: 1px solid var(--border-glass);
      border-radius: 14px;
      padding: 14px;
      backdrop-filter: blur(12px);
    }
    .leaders-history.hidden {
      display: none;
    }
    .leaders-history-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 10px;
    }
    .leaders-history-head h3 {
      margin: 0;
      color: var(--text-main);
      font-size: 14px;
    }
    .leaders-history-badge {
      border: 1px solid var(--accent-border);
      background: var(--accent-dim);
      color: var(--accent);
      border-radius: 999px;
      padding: 4px 9px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .leaders-history-list {
      display: grid;
      gap: 9px;
    }
    .history-card {
      border: 1px solid var(--border-glass);
      border-radius: 12px;
      padding: 10px;
      background: rgba(255, 255, 255, 0.02);
    }
    .history-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 7px;
      color: var(--text-muted);
      font-size: 12px;
    }
    .history-mode {
      border: 1px solid var(--accent-border);
      color: var(--accent);
      background: var(--accent-dim);
      border-radius: 999px;
      padding: 2px 8px;
      font-weight: 600;
    }
    .history-leaders {
      margin: 0;
      padding-left: 17px;
      color: var(--text-main);
      font-size: 13px;
      display: grid;
      gap: 4px;
    }
    .group-theme-btn {
      width: 36px;
      height: 36px;
      display: inline-grid;
      place-items: center;
    }
    @media (max-width: 900px) {
      .groups-body {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 520px) {
      .manual-controls {
        grid-template-columns: 1fr;
      }
    }
  `;

  document.head.appendChild(style);
}
