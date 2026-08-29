/**
 * Ledger — Client Lead Management System (Mini CRM)
 * Future Interns | FUTURE_FS_02
 *
 * Zero-dependency Node.js backend. Run it with:
 *   node server.js
 * No `npm install` is required — everything here uses only Node's
 * built-in modules, so the app runs the same on any machine with
 * Node installed.
 */

const http = require('http');
const path = require('path');
const url = require('url');
const crypto = require('crypto');

const db = require('./db');
const { serveStatic } = require('./static');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- Startup self-check --------------------------------------------------
const fs = require('fs');
if (!fs.existsSync(PUBLIC_DIR)) {
  console.error('\n[FATAL] Could not find the "public" folder next to server.js.');
  console.error('        Expected it at:', PUBLIC_DIR);
  console.error('        Make sure you extracted the WHOLE mini-crm folder, not just server.js.\n');
  process.exit(1);
}

// --- Simple admin session layer ------------------------------------------
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const sessions = new Map();
const SESSION_TTL_MS = 1000 * 60 * 60 * 4; // 4 hours

function createSession() {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  return token;
}

function isAuthed(req) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token || !sessions.has(token)) return false;
  const expiry = sessions.get(token);
  if (Date.now() > expiry) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function sendJSON(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let chunks = '';
    req.on('data', (chunk) => {
      chunks += chunk;
      if (chunks.length > 1e6) req.destroy();
    });
    req.on('end', () => {
      if (!chunks) return resolve({});
      try {
        resolve(JSON.parse(chunks));
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  try {
    // ---------- Auth ----------
    if (pathname === '/api/login' && req.method === 'POST') {
      const { username, password } = await readBody(req);
      if (username === ADMIN_USER && password === ADMIN_PASS) {
        return sendJSON(res, 200, { token: createSession() });
      }
      return sendJSON(res, 401, { error: 'Invalid username or password' });
    }

    // ---------- API routes (all require auth) ----------
    if (pathname.startsWith('/api/leads')) {
      if (!isAuthed(req)) {
        return sendJSON(res, 401, { error: 'Not authenticated. Please log in.' });
      }

      const idMatch = pathname.match(/^\/api\/leads\/([^/]+)$/);
      const noteMatch = pathname.match(/^\/api\/leads\/([^/]+)\/notes$/);

      if (pathname === '/api/leads' && req.method === 'GET') {
        return sendJSON(res, 200, db.getLeads(parsed.query));
      }

      if (pathname === '/api/leads' && req.method === 'POST') {
        const payload = await readBody(req);
        if (!payload.name || !payload.email) {
          return sendJSON(res, 400, { error: 'Name and email are required' });
        }
        return sendJSON(res, 201, db.createLead(payload));
      }

      if (idMatch && req.method === 'PUT') {
        const payload = await readBody(req);
        const updated = db.updateLead(idMatch[1], payload);
        if (!updated) return sendJSON(res, 404, { error: 'Lead not found' });
        return sendJSON(res, 200, updated);
      }

      if (noteMatch && req.method === 'POST') {
        const { text, followUpDate } = await readBody(req);
        if (!text) return sendJSON(res, 400, { error: 'Note text is required' });
        const updated = db.addNote(noteMatch[1], text, followUpDate);
        if (!updated) return sendJSON(res, 404, { error: 'Lead not found' });
        return sendJSON(res, 200, updated);
      }

      if (idMatch && req.method === 'DELETE') {
        const ok = db.deleteLead(idMatch[1]);
        if (!ok) return sendJSON(res, 404, { error: 'Lead not found' });
        return sendJSON(res, 204, {});
      }

      return sendJSON(res, 404, { error: 'Not found' });
    }

    // ---------- Static frontend ----------
    return serveStatic(req, res, PUBLIC_DIR);
  } catch (err) {
    console.error('[server] Unexpected error:', err);
    return sendJSON(res, 400, { error: 'Malformed request' });
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  Ledger — Mini CRM');
  console.log('  ------------------');
  console.log(`  Running at:  http://localhost:${PORT}`);
  console.log(`  Login user:  ${ADMIN_USER}`);
  console.log(`  Login pass:  ${ADMIN_PASS}  (default — override with the ADMIN_PASS env var)`);
  console.log('');
});
