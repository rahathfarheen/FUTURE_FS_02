const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'leads.json');

const VALID_STATUSES = ['new', 'contacted', 'converted', 'lost'];

// Seed data used ONLY if data/leads.json is missing entirely (fresh clone
// with no data folder, or the file was deleted). This guarantees the app
// never silently starts with zero leads and no explanation.
const SEED_LEADS = [
  {
    id: 'f0a1e9b0-1111-4a11-8888-000000000001',
    name: 'Ananya Rao',
    email: 'ananya.rao@example.com',
    phone: '+91 98450 12345',
    source: 'Website Form',
    status: 'new',
    notes: [],
    createdAt: '2026-08-20T09:15:00.000Z',
    updatedAt: '2026-08-20T09:15:00.000Z',
  },
  {
    id: 'f0a1e9b0-2222-4a11-8888-000000000002',
    name: 'Rahul Menon',
    email: 'rahul.menon@example.com',
    phone: '+91 90000 54321',
    source: 'Referral',
    status: 'contacted',
    notes: [
      {
        id: 'n-0001',
        text: 'Called on Aug 22, interested in the premium plan. Sent pricing PDF.',
        followUpDate: '2026-08-29',
        createdAt: '2026-08-22T11:00:00.000Z',
      },
    ],
    createdAt: '2026-08-18T14:30:00.000Z',
    updatedAt: '2026-08-22T11:00:00.000Z',
  },
  {
    id: 'f0a1e9b0-3333-4a11-8888-000000000003',
    name: 'Priya Shetty',
    email: 'priya.shetty@example.com',
    phone: '+91 88888 11223',
    source: 'Instagram Ad',
    status: 'converted',
    notes: [
      {
        id: 'n-0002',
        text: 'Signed up for the annual plan after the demo call.',
        followUpDate: null,
        createdAt: '2026-08-15T10:00:00.000Z',
      },
    ],
    createdAt: '2026-08-10T08:00:00.000Z',
    updatedAt: '2026-08-15T10:00:00.000Z',
  },
  {
    id: 'f0a1e9b0-4444-4a11-8888-000000000004',
    name: 'Karan Desai',
    email: 'karan.desai@example.com',
    phone: '+91 77777 99887',
    source: 'Google Ads',
    status: 'lost',
    notes: [
      {
        id: 'n-0003',
        text: 'Went with a competitor after comparing pricing.',
        followUpDate: null,
        createdAt: '2026-08-12T09:30:00.000Z',
      },
    ],
    createdAt: '2026-08-05T09:00:00.000Z',
    updatedAt: '2026-08-12T09:30:00.000Z',
  },
];

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(SEED_LEADS, null, 2));
    console.log('[db] No data/leads.json found — created it with sample leads.');
  }
}

function load() {
  ensureDataFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf-8');
  if (!raw || !raw.trim()) return [];
  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('[db] leads.json was not valid JSON — starting from an empty list.', err.message);
    return [];
  }
}

function save(leads) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));
}

function getLeads(filters = {}) {
  let leads = load();
  if (filters.status) {
    leads = leads.filter((l) => l.status === filters.status);
  }
  if (filters.source) {
    leads = leads.filter((l) => l.source.toLowerCase() === String(filters.source).toLowerCase());
  }
  if (filters.q) {
    const q = String(filters.q).toLowerCase();
    leads = leads.filter(
      (l) => l.name.toLowerCase().includes(q) || l.email.toLowerCase().includes(q)
    );
  }
  return leads.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function createLead(payload) {
  const leads = load();
  const now = new Date().toISOString();
  const lead = {
    id: crypto.randomUUID(),
    name: payload.name,
    email: payload.email,
    phone: payload.phone || '',
    source: payload.source || 'Website Form',
    status: VALID_STATUSES.includes(payload.status) ? payload.status : 'new',
    notes: [],
    createdAt: now,
    updatedAt: now,
  };
  leads.push(lead);
  save(leads);
  return lead;
}

function updateLead(id, payload) {
  const leads = load();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;

  const lead = leads[idx];
  if (payload.name !== undefined) lead.name = payload.name;
  if (payload.email !== undefined) lead.email = payload.email;
  if (payload.phone !== undefined) lead.phone = payload.phone;
  if (payload.source !== undefined) lead.source = payload.source;
  if (payload.status !== undefined && VALID_STATUSES.includes(payload.status)) {
    lead.status = payload.status;
  }
  lead.updatedAt = new Date().toISOString();

  leads[idx] = lead;
  save(leads);
  return lead;
}

function addNote(id, text, followUpDate) {
  const leads = load();
  const idx = leads.findIndex((l) => l.id === id);
  if (idx === -1) return null;

  leads[idx].notes.push({
    id: crypto.randomUUID(),
    text,
    followUpDate: followUpDate || null,
    createdAt: new Date().toISOString(),
  });
  leads[idx].updatedAt = new Date().toISOString();

  save(leads);
  return leads[idx];
}

function deleteLead(id) {
  const leads = load();
  const next = leads.filter((l) => l.id !== id);
  if (next.length === leads.length) return false;
  save(next);
  return true;
}

module.exports = { getLeads, createLead, updateLead, addNote, deleteLead, VALID_STATUSES };
