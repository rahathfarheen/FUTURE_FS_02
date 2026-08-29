const STAGES = ['new', 'contacted', 'converted']; // 'lost' is a side-branch, not on the main rail

const state = {
  leads: [],
  statusFilter: '',
  search: '',
  activeLeadId: null,
};

// Session token lives in memory only for this tab (no browser storage used).
let memoryToken = null;
function setToken(t) { memoryToken = t; }

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function showToast(msg) {
  const toast = $('#toast');
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toast.hidden = true), 2600);
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' · ' +
    d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------------- Overlay management ----------------
// Only one of {lead-modal, detail-drawer} may be visible at a time.
function closeAllOverlays() {
  $('#lead-modal').hidden = true;
  $('#detail-drawer').hidden = true;
}

// ---------------- API ----------------
async function api(path, options = {}) {
  let res;
  try {
    res = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(memoryToken ? { Authorization: `Bearer ${memoryToken}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (networkErr) {
    throw new Error('Could not reach the server. Is "node server.js" still running?');
  }
  if (res.status === 401) {
    setToken(null);
    showApp(false);
    throw new Error('Session expired. Please sign in again.');
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

// ---------------- Auth ----------------
function showApp(isIn) {
  $('#login-screen').hidden = isIn;
  $('#app').hidden = !isIn;
}

$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = $('#login-username').value.trim();
  const password = $('#login-password').value;
  $('#login-error').hidden = true;
  try {
    const { token } = await api('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setToken(token);
    showApp(true);
    loadLeads();
  } catch (err) {
    $('#login-error').textContent = err.message;
    $('#login-error').hidden = false;
  }
});

$('#logout-btn').addEventListener('click', () => {
  setToken(null);
  closeAllOverlays();
  showApp(false);
});

// ---------------- Rendering ----------------
function stageRailHTML(lead, { mini = false } = {}) {
  const isLost = lead.status === 'lost';
  const currentIndex = isLost ? STAGES.indexOf('contacted') : STAGES.indexOf(lead.status);
  let html = `<div class="stage-rail ${mini ? 'stage-rail-mini' : ''} ${isLost ? 'is-lost' : ''}">`;
  STAGES.forEach((stage, i) => {
    const filled = i <= currentIndex;
    const isCurrent = i === currentIndex && !isLost;
    html += `<div class="stage-rail__step ${filled ? 'is-filled' : ''} ${isCurrent ? 'is-current' : ''}">`;
    html += `<div class="stage-rail__node" title="${stage}"></div>`;
    if (i < STAGES.length - 1) html += `<div class="stage-rail__bar"></div>`;
    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

function statusPillHTML(status) {
  const labels = { new: 'New', contacted: 'Contacted', converted: 'Converted', lost: 'Lost' };
  return `<span class="status-pill status-pill--${status}">${labels[status]}</span>`;
}

function renderCounts() {
  const counts = { new: 0, contacted: 0, converted: 0, lost: 0 };
  state.leads.forEach((l) => counts[l.status] !== undefined && counts[l.status]++);

  $('#count-all').textContent = state.leads.length;
  $('#count-new').textContent = counts.new;
  $('#count-contacted').textContent = counts.contacted;
  $('#count-converted').textContent = counts.converted;
  $('#count-lost').textContent = counts.lost;

  const total = state.leads.length;
  const conversionRate = total ? Math.round((counts.converted / total) * 100) : 0;
  $('#stat-total').textContent = total;
  $('#stat-new').textContent = counts.new;
  $('#stat-contacted').textContent = counts.contacted;
  $('#stat-converted').textContent = counts.converted;
  $('#stat-conversion-rate').textContent = `${conversionRate}%`;
}

function visibleLeads() {
  let leads = state.leads;
  if (state.statusFilter) leads = leads.filter((l) => l.status === state.statusFilter);
  if (state.search) {
    const q = state.search.toLowerCase();
    leads = leads.filter((l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q));
  }
  return leads;
}

function renderTable() {
  const leads = visibleLeads();
  const tbody = $('#lead-table-body');
  const hasAnyLeads = state.leads.length > 0;

  $('#empty-state').hidden = hasAnyLeads;
  $('#table-wrap').hidden = !hasAnyLeads;

  tbody.innerHTML = leads
    .map(
      (lead) => `
    <tr data-id="${lead.id}">
      <td>
        <div class="lead-name">${escapeHTML(lead.name)}</div>
        <div class="lead-email">${escapeHTML(lead.email)}</div>
      </td>
      <td><span class="lead-source-tag">${escapeHTML(lead.source)}</span></td>
      <td>
        <div style="display:flex; align-items:center;">
          ${stageRailHTML(lead)}
          ${lead.status === 'lost' ? statusPillHTML('lost') : ''}
        </div>
      </td>
      <td><span class="last-activity">${fmtDateTime(lead.updatedAt)}</span></td>
      <td><span class="row-arrow">→</span></td>
    </tr>`
    )
    .join('');

  tbody.querySelectorAll('tr').forEach((tr) => {
    tr.addEventListener('click', () => openDrawer(tr.dataset.id));
  });

  renderCounts();
}

async function loadLeads() {
  $('#load-error').hidden = true;
  try {
    state.leads = await api('/api/leads');
    renderTable();
  } catch (err) {
    $('#load-error-msg').textContent = err.message;
    $('#load-error').hidden = false;
    $('#table-wrap').hidden = true;
    $('#empty-state').hidden = true;
    showToast(err.message);
  }
}

// ---------------- Sidebar filters ----------------
$$('.side-nav__item').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.side-nav__item').forEach((b) => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    state.statusFilter = btn.dataset.filterStatus;
    const labels = { '': 'All leads', new: 'New leads', contacted: 'Contacted leads', converted: 'Converted leads', lost: 'Lost leads' };
    $('#view-title').textContent = labels[state.statusFilter];
    renderTable();
  });
});

$('#search-input').addEventListener('input', (e) => {
  state.search = e.target.value.trim();
  renderTable();
});

// ---------------- New / Edit lead modal ----------------
function openLeadModal(lead = null) {
  closeAllOverlays();
  $('#lead-form-error').hidden = true;
  $('#lead-modal-title').textContent = lead ? 'Edit lead' : 'New lead';
  $('#lead-id').value = lead ? lead.id : '';
  $('#lead-name').value = lead ? lead.name : '';
  $('#lead-email').value = lead ? lead.email : '';
  $('#lead-phone').value = lead ? lead.phone : '';
  $('#lead-source').value = lead ? lead.source : 'Website Form';
  $('#delete-lead-btn').hidden = !lead;
  $('#lead-modal').hidden = false;
  $('#lead-name').focus();
}

$('#new-lead-btn').addEventListener('click', () => openLeadModal());
$('#close-lead-modal').addEventListener('click', () => ($('#lead-modal').hidden = true));

$('#lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('#lead-id').value;
  const payload = {
    name: $('#lead-name').value.trim(),
    email: $('#lead-email').value.trim(),
    phone: $('#lead-phone').value.trim(),
    source: $('#lead-source').value,
  };
  $('#lead-form-error').hidden = true;
  try {
    if (id) {
      await api(`/api/leads/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
      showToast('Lead updated');
    } else {
      await api('/api/leads', { method: 'POST', body: JSON.stringify(payload) });
      showToast('Lead added');
    }
    $('#lead-modal').hidden = true;
    await loadLeads();
  } catch (err) {
    $('#lead-form-error').textContent = err.message;
    $('#lead-form-error').hidden = false;
  }
});

$('#delete-lead-btn').addEventListener('click', async () => {
  const id = $('#lead-id').value;
  if (!id || !confirm('Delete this lead? This cannot be undone.')) return;
  try {
    await api(`/api/leads/${id}`, { method: 'DELETE' });
    closeAllOverlays();
    showToast('Lead deleted');
    await loadLeads();
  } catch (err) {
    showToast(err.message);
  }
});

// ---------------- Detail drawer ----------------
function findLead(id) {
  return state.leads.find((l) => l.id === id);
}

function renderDrawerStageRail(lead) {
  const wrap = $('#drawer-stage-rail');
  wrap.innerHTML = stageRailHTML(lead) + `<span class="stage-rail-label">${lead.status.toUpperCase()}</span>`;
  wrap.querySelector('.stage-rail').classList.add('clickable');
  wrap.querySelectorAll('.stage-rail__node').forEach((node, i) => {
    node.addEventListener('click', async () => {
      const newStatus = STAGES[i];
      try {
        await api(`/api/leads/${lead.id}`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
        showToast(`Marked as ${newStatus}`);
        await loadLeads();
        openDrawer(lead.id);
      } catch (err) {
        showToast(err.message);
      }
    });
  });
}

function renderNotes(lead) {
  const list = $('#notes-list');
  if (!lead.notes.length) {
    list.innerHTML = `<li class="no-notes">No notes yet — log your first call or follow-up below.</li>`;
    return;
  }
  list.innerHTML = lead.notes
    .slice()
    .reverse()
    .map(
      (n) => `
    <li class="note-item">
      <div>${escapeHTML(n.text)}</div>
      <div class="note-item-meta">
        <span>${fmtDateTime(n.createdAt)}</span>
        ${n.followUpDate ? `<span class="note-followup-flag">Follow up ${fmtDate(n.followUpDate)}</span>` : ''}
      </div>
    </li>`
    )
    .join('');
}

function openDrawer(id) {
  const lead = findLead(id);
  if (!lead) return;
  closeAllOverlays();
  state.activeLeadId = id;
  $('#drawer-name').textContent = lead.name;
  $('#drawer-email').textContent = lead.email;
  $('#drawer-phone').textContent = lead.phone || '—';
  $('#drawer-source').textContent = lead.source;
  $('#drawer-created').textContent = fmtDate(lead.createdAt);
  renderDrawerStageRail(lead);
  renderNotes(lead);
  $('#note-text').value = '';
  $('#note-followup').value = '';
  $('#detail-drawer').hidden = false;
}

$('#close-drawer').addEventListener('click', () => ($('#detail-drawer').hidden = true));

$('#edit-lead-btn').addEventListener('click', () => {
  const lead = findLead(state.activeLeadId);
  openLeadModal(lead);
});

$('#note-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = $('#note-text').value.trim();
  const followUpDate = $('#note-followup').value || null;
  if (!text) return;
  try {
    await api(`/api/leads/${state.activeLeadId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ text, followUpDate }),
    });
    await loadLeads();
    openDrawer(state.activeLeadId);
    showToast('Note added');
  } catch (err) {
    showToast(err.message);
  }
});

// Close overlays on backdrop click
[$('#lead-modal'), $('#detail-drawer')].forEach((el) => {
  el.addEventListener('click', (e) => {
    if (e.target === el) el.hidden = true;
  });
});

// Close overlays on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllOverlays();
});

// ---------------- Boot ----------------
showApp(false);
