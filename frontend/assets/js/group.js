import { guards, sessionManager } from '../../src/core/auth/session.js';
import { API_BASE } from '../../src/core/config.js';

const GROUP_SIZE = 4;

let coders = [];
let manualMode = false;
let manualAssignments = {}; // { coderId: "A" }

const coderList = document.getElementById('coder-list');
const groupsContainer = document.getElementById('groups-container');
const groupsHint = document.getElementById('groups-hint');
const codersCount = document.getElementById('coders-count');

const btnRandom = document.getElementById('btn-random');
const btnManual = document.getElementById('btn-manual');
const btnLevel = document.getElementById('btn-level');
const btnLogout = document.getElementById('btn-logout');

start();

async function start() {
  const session = await guards.requireAuth();
  if (!session) return;

  const role = session.user.role.toLowerCase();
  if (role !== 'tl' && role !== 'admin') {
    sessionManager.redirectByRole(session.user);
    return;
  }

document.querySelectorAll('.btn-logout').forEach(btn => {
  btn.addEventListener('click', function () {
    sessionManager.logout();
  });
});

  await loadCoders();
  renderCoderList();
  wireButtons();
}

async function loadCoders() {
  try {
    const res = await fetch(`${API_BASE}/tl/dashboard`, { credentials: 'include' });
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

function renderCoderList() {
  coderList.innerHTML = '';

  if (coders.length === 0) {
    coderList.innerHTML = '<p class="empty-state">Sin coders disponibles.</p>';
    return;
  }

  for (let i = 0; i < coders.length; i++) {
    const c = coders[i];

    const name = c.full_name || '—';
    const email = c.email || '—';
    const week = c.current_week || '—';
    const score = c.average_score || '—';

    let selectHtml = '';

    if (manualMode) {
      const selected = manualAssignments[c.id] || '';

      selectHtml =
        '<select class="manual-select" data-id="' + c.id + '">' +
        '<option value="">Sin grupo</option>' +
        '<option value="A"' + (selected === 'A' ? ' selected' : '') + '>Grupo A</option>' +
        '<option value="B"' + (selected === 'B' ? ' selected' : '') + '>Grupo B</option>' +
        '<option value="C"' + (selected === 'C' ? ' selected' : '') + '>Grupo C</option>' +
        '<option value="D"' + (selected === 'D' ? ' selected' : '') + '>Grupo D</option>' +
        '</select>';
    }

    const div = document.createElement('div');
    div.className = 'coder-card';
    div.innerHTML =
      '<div>' +
      '<h4>' + name + '</h4>' +
      '<p class="muted">' + email + '</p>' +
      '</div>' +
      '<div class="coder-meta">' +
      '<span>Semana: <strong>' + week + '</strong></span>' +
      '<span>Score: <strong>' + score + '</strong></span>' +
      '</div>' +
      selectHtml;

    coderList.appendChild(div);
  }

  if (manualMode) {
    const selects = document.querySelectorAll('.manual-select');
    for (let i = 0; i < selects.length; i++) {
      selects[i].addEventListener('change', function () {
        const coderId = selects[i].getAttribute('data-id');
        const value = selects[i].value;

        if (value === '') {
          delete manualAssignments[coderId];
        } else {
          manualAssignments[coderId] = value;
        }
      });
    }
  }
}

function renderGroups(groups) {
  groupsContainer.innerHTML = '';

  if (groups.length === 0) {
    groupsContainer.innerHTML = '<p class="empty-state">No hay grupos.</p>';
    return;
  }

  for (let i = 0; i < groups.length; i++) {
    const g = groups[i];

    let members = '';
    for (let j = 0; j < g.members.length; j++) {
      const m = g.members[j];
      members += '<li>' + (m.full_name || '—') + '</li>';
    }

    const div = document.createElement('div');
    div.className = 'group-card';
    div.innerHTML =
      '<div class="group-title">' + g.title + '</div>' +
      '<ul class="group-list">' + members + '</ul>';

    groupsContainer.appendChild(div);
  }
}

function randomGroups() {
  const shuffled = coders.slice().sort(function () {
    return Math.random() - 0.5;
  });

  const groups = [];
  let groupNumber = 1;

  for (let i = 0; i < shuffled.length; i += GROUP_SIZE) {
    groups.push({
      title: 'Grupo ' + groupNumber,
      members: shuffled.slice(i, i + GROUP_SIZE),
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

  for (let i = 0; i < coders.length; i++) {
    const week = Number(coders[i].current_week);

    if (!week) noData.push(coders[i]);
    else if (week <= 4) level1.push(coders[i]);
    else if (week <= 8) level2.push(coders[i]);
    else level3.push(coders[i]);
  }

  return [
    { title: 'Nivel 1 (Semanas 1–4)', members: level1 },
    { title: 'Nivel 2 (Semanas 5–8)', members: level2 },
    { title: 'Nivel 3 (Semanas 9+)', members: level3 },
    { title: 'Sin datos', members: noData },
  ];
}

function manualGroups() {
  const groupA = [];
  const groupB = [];
  const groupC = [];
  const groupD = [];
  const noGroup = [];

  for (let i = 0; i < coders.length; i++) {
    const g = manualAssignments[coders[i].id];

    if (g === 'A') groupA.push(coders[i]);
    else if (g === 'B') groupB.push(coders[i]);
    else if (g === 'C') groupC.push(coders[i]);
    else if (g === 'D') groupD.push(coders[i]);
    else noGroup.push(coders[i]);
  }

  return [
    { title: 'Grupo A', members: groupA },
    { title: 'Grupo B', members: groupB },
    { title: 'Grupo C', members: groupC },
    { title: 'Grupo D', members: groupD },
    { title: 'Sin grupo', members: noGroup },
  ];
}

function wireButtons() {
  btnRandom.addEventListener('click', function () {
    manualMode = false;
    renderCoderList();
    renderGroups(randomGroups());
    groupsHint.textContent = 'Grupos generados al azar.';
  });

  btnLevel.addEventListener('click', function () {
    manualMode = false;
    renderCoderList();
    renderGroups(levelGroups());
    groupsHint.textContent = 'Grupos generados por nivel de estudio.';
  });

  btnManual.addEventListener('click', function () {
    if (!manualMode) {
      manualMode = true;
      renderCoderList();
      groupsHint.textContent =
        'Selecciona un grupo y vuelve a presionar el botón.';
      return;
    }

    renderGroups(manualGroups());
    groupsHint.textContent = 'Grupos manuales generados.';
  });
}
