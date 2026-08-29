# Ledger — Client Lead Management System (Mini CRM)

**Future Interns · Full Stack Web Development Track · Task 2**
**GitHub repo name:** `FUTURE_FS_02`

A CRM for managing leads collected from a business's website contact form —
list them, move them through a pipeline, log follow-ups, and see the
numbers behind it at a glance.

## Quick start

**Requirement:** [Node.js](https://nodejs.org) installed (LTS version). Nothing else — no `npm install` needed.

**Windows:** double-click `start.bat`.
**Mac/Linux:** double-click `start.sh`, or run `./start.sh` in a terminal.

Either way, a window opens and once it prints:

```
Running at:  http://localhost:3000
```

open that address in your browser and sign in with:

- **Username:** `admin`
- **Password:** `admin123`

Leave that window/terminal open the whole time you're using the app — closing it stops the server.

If you'd rather use the command line directly:
```bash
node server.js
```

## Task brief coverage

| Requirement (from brief) | Where it's implemented |
|---|---|
| Build a simple CRM to manage client leads from website contact forms | Whole app |
| Frontend: HTML / CSS / JavaScript | `public/index.html`, `style.css`, `script.js` — vanilla JS, no build step |
| Backend: Node.js / Express for APIs and business logic | `server.js`, `db.js` — plain Node `http` module (see note below) |
| Database: MongoDB / MySQL to store leads, status, notes | `data/leads.json` via `db.js`, isolated so it's a drop-in swap for a real DB |
| Lead listing (name, email, source, status) | Main table |
| Lead status updates (new / contacted / converted) | Pipeline "stage rail" — click a stage dot in the lead drawer |
| Notes and follow-ups for each lead | Notes panel in the lead drawer |
| Secure admin access | Login screen, bearer-token session guarding every `/api/leads*` route |
| Deliverable: working CRM app, source hosted on GitHub | This repo |
| Bonus: search & filter leads | Search box + sidebar status filters |
| Bonus: timestamp tracking | `createdAt`/`updatedAt` on every lead and note |
| Bonus: simple analytics (total leads, conversions) | Stats bar + three Chart.js charts (pipeline breakdown, source mix, leads over time) |

> **Why plain `http` instead of Express?** Functionally identical for this
> project's scope, but it means the app runs with nothing but Node itself —
> no `npm install`, no dependency version issues. If you want Express on
> record for this task, see **Optional: switching to Express** below.

## Features

- **Interactive charts** — a pipeline breakdown (bar), leads-by-source (doughnut), and a cumulative leads-over-time (line) chart, all built with Chart.js and updating live as you add/edit leads.
- **Analytics bar** — total leads, per-stage counts, and a live conversion rate.
- **Pipeline view** — every lead shows a 3-step stage rail (New → Contacted → Converted); a "Mark as lost" button in the lead drawer handles the side-branch, and can be reversed with "Reopen this lead."
- **Sidebar filters** — jump to New / Contacted / Converted / Lost with live counts.
- **Search** — filter by name or email as you type.
- **Lead drawer** — click any row for full details, stage updates, and note history.
- **Notes & follow-ups** — timestamped notes per lead, optionally tagged with a follow-up date.
- **Admin login** — nothing under `/api/leads` is reachable without a valid session token.
- **Clear error messages** — if the server isn't running, the app tells you that directly instead of silently showing zeros.

## Project structure

```
mini-crm/
├── server.js        # HTTP server, routing, auth, request handling
├── db.js            # Data-access layer (JSON file "database"); auto-creates
│                     # sample data if data/leads.json is ever missing
├── static.js        # Static file server for the frontend
├── start.bat         # Windows: double-click to run, no command line needed
├── start.sh          # Mac/Linux equivalent
├── data/leads.json   # Seeded sample leads
├── public/
│   ├── index.html    # App shell (login, table, modal, drawer)
│   ├── style.css      # Visual design
│   └── script.js       # Frontend logic
└── package.json
```

## API reference

All `/api/leads*` routes require `Authorization: Bearer <token>`.

| Method | Route | Description |
|---|---|---|
| POST | `/api/login` | `{ username, password }` → `{ token }` |
| GET | `/api/leads` | List leads. Optional query params: `status`, `source`, `q` |
| POST | `/api/leads` | Create a lead: `{ name, email, phone?, source?, status? }` |
| PUT | `/api/leads/:id` | Update lead fields / status |
| POST | `/api/leads/:id/notes` | Add a note: `{ text, followUpDate? }` |
| DELETE | `/api/leads/:id` | Remove a lead |

## Changing the admin password

Don't ship the default in a real deployment. Set environment variables before starting:

```bash
ADMIN_USER=yourname ADMIN_PASS=a-strong-password node server.js
```

## Swapping in a real database

`db.js` exposes five functions — `getLeads`, `createLead`, `updateLead`,
`addNote`, `deleteLead` — and nothing else in the app talks to storage
directly. To move to MongoDB or MySQL, rewrite those five functions against
your driver of choice; `server.js` and the frontend don't need to change.

## Optional: switching to Express

```bash
npm init -y
npm install express
```

Then replace the routing block in `server.js` with `app.get/post/put/delete`
handlers calling the same `db.js` functions — the logic doesn't change,
only the routing boilerplate.

## Troubleshooting

**"node is not recognized" / "command not found"**
Node.js isn't installed, or your terminal hasn't picked up the PATH change yet.
Install it from [nodejs.org](https://nodejs.org) (LTS), then fully close and
reopen your terminal before trying again. Or just use `start.bat` / `start.sh`,
which check for this automatically.

**Dashboard shows all zeros**
This means the app couldn't reach a live server — most commonly because
`node server.js` isn't actually running, or you deployed only the `public`
folder to a static host (GitHub Pages, plain Vercel static hosting) that can't
run the Node backend. Use Render or Railway if you need this live on the
internet with a real backend; static hosts only work for the frontend files.

**Charts show a message instead of rendering**
The three charts on the dashboard load their charting library (Chart.js) from
a CDN, which needs an internet connection. If you see "Charts need an
internet connection to load," check that you're online — everything else in
the app (leads, notes, status updates) works fully offline regardless.

**"Cannot find module" error on startup**
You're running `server.js` from outside its own folder, or copied only that
one file. Make sure the whole `mini-crm` folder — `db.js`, `static.js`,
`public/`, `data/` and all — stays together.

## Notes on scope

- Sessions are stored in memory, so restarting the server logs everyone out. A production version would use a real session store or JWTs.
- The JSON-file "database" is fine for a single-user demo but isn't safe for concurrent writers — a real deployment should use MongoDB/MySQL as the brief suggests.
