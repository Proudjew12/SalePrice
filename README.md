# SalePrice

SalePrice builds customer quotes for software licenses using your own USD prices. Its React + Vite
frontend runs independently on GitHub Pages, including PDF export. The separate FastAPI backend
provides the operational health API and remains available for future server features.

```text
SalePrice/
├── frontend/   # standalone browser application
├── backend/    # standalone HTTP API
├── scripts/    # setup, launch, cleanup, checks/, and tests/
├── README.md   # scope, commands, and architecture
├── AGENTS.md   # repository working rules
└── package.json
```

## Scope

For sellers quoting licenses from multiple companies:

1. In **Normal Mode**, choose a product from the compact left rail and search its license list.
   Switch to **Edit Mode** to add, rename, or remove products and licenses, including the initial
   entries. Product short labels can also be changed.
2. Choose monthly paid monthly, annual paid monthly, or annual paid upfront. Drag the license into
   the quote, or use its **+** button. On a tablet, briefly hold the drag handle before moving it.
3. Enter quantities, customer, quote reference, and optional notes. Each license can have a saved
   default USD price for each billing schedule; adding it fills in the matching price. Override
   that price in the order whenever needed.
4. Review monthly payments, annual upfront charges, the amount due at the start, and a 12-month
   estimate; download the customer PDF using the button at the bottom.

The initial catalog includes Microsoft 365, Google Workspace, Adobe Acrobat, and Zoom Workplace.
It also includes Acronis with one unpriced **Example license**, a demonstration entry rather than
an official plan. The example is added once to older saved catalogs; it can be edited or removed.
These are unpriced starting names, not a live price feed. Confirm each vendor's applicable plans
and billing terms before quoting. All catalog edits and default prices are saved locally. A blank
default price means manual entry; zero is a valid price. Editing or deleting a catalog entry leaves
existing order items intact. Deleting the last product or license is supported; Edit Mode can add
entries again. The catalog supports 50 products, 100 licenses per product, and 2,000 licenses total.

Monthly schedules use a price per license **per month**; annual upfront uses a price per license
**per year**. Changing a quote line's billing schedule clears its price so it must be re-entered.
Quantities are whole numbers from 1–9,999; prices allow zero through $1,000,000 with up to two decimal
places. Calculations use integer cents. Quotes support up to 100 lines and exclude taxes. The
12-month estimate assumes monthly subscriptions continue for all 12 months.

One active draft is saved in this browser on this device. There are no accounts, cross-device sync,
quote history, vendor imports, or tax calculations in this version. Download a PDF before starting
a new quote. Clearing site data removes local drafts and custom catalog entries; a new domain has
separate browser storage. Customer details and prices stay in the browser, and PDF generation uses
locally bundled code and fonts without sending quote data to a server.

Acceptance checks cover desktop mouse drag, tablet press-and-drag and tap, keyboard addition,
all three billing schedules, invalid input, local persistence, PDF download and retry, responsive
layout, saved text-size preferences, catalog editing/default prices/migration, and production hosting
from a repository subpath without an API.

## Start

Use Node 22.22.2 or newer, npm 10 or newer, and Python 3.13; respect the application version files.

```bash
npm run setup
npm run dev
```

Setup installs both applications and creates missing local environment files. The launcher starts
both servers and stops the other process when either exits or you interrupt it.
Setup also installs Chromium for the frontend browser tests.

- Frontend: `http://127.0.0.1:5173`
- Operational status screen: `http://127.0.0.1:5173/#/status`
- API: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`
- Live OpenAPI schema: `http://127.0.0.1:8000/openapi.json`

FastAPI generates the schema from the backend's routes and Pydantic models. There is no saved schema
to update. API documentation and the schema endpoint are disabled in production.

## Commands and verification

| Command | Purpose |
| --- | --- |
| `npm run setup` | Install both applications and create missing local env files. |
| `npm run dev` | Start both applications with coordinated shutdown. |
| `npm run check` | Run structure guards, lint/types/build, and all automated tests. |
| `npm run check:frontend` | Run frontend ESLint, TypeScript checks, and the production build. |
| `npm run check:backend` | Run backend dependency integrity, Ruff, mypy, and pytest. |
| `npm test` | Run repository, backend, and frontend behavior tests. |
| `npm run smoke` | Exercise combined startup, HTTP health integration, and clean shutdown. |
| `npm run lock:python` | Regenerate backend dependency locks with `uv`. |
| `npm run clean` | Remove generated caches and build output, keeping local env files. |
| `npm run clean -- --dry-run` | Preview the exact generated paths to remove. |

The full gate can also be run with `python3 scripts/check.py`. Repository guards include dependency
boundaries, SCSS conventions, and deployment configuration. The HTTP smoke path checks the frontend
proxy and request-ID propagation; exercise changed UI in a browser as well. CI runs checks, smoke
validation, and separate dependency vulnerability audits.

## File organization

Frontend tool configuration lives in `frontend/config/`, and browser tests live in
`frontend/tests/`. Backend dependency locks live in `backend/requirements/`, with behavior tests
in `backend/tests/`. Keep package manifests, entry HTML, environment files, and discovery files
such as `tsconfig.json` at their application roots so the tools and editor can find them.

The shared `.vscode/settings.json` hides installed dependencies and generated output from the
Explorer, and points ESLint and TypeScript at the frontend configuration. It also groups root
configuration and environment files beneath `package.json` or `pyproject.toml` in Explorer; expand
the manifest to access them. This is visual nesting: discovery files such as `.gitignore`,
`.gitattributes`, `.editorconfig`, and `.npmrc` keep their normal discovery locations. Dependencies in
`node_modules/` and `.venv/` remain installed because they run the applications and checks.
Cleanup removes known caches and builds, preserving environments, dependencies, and user files.
Production builds and checks regenerate their output when needed.

## Run one application

Both folders have their own commands and instructions. Run each example from the repository root:

```bash
cd frontend
cp .env.example .env
npm ci
npm run dev
npm run check
```

```bash
cd backend
python manage.py setup
python manage.py dev
python manage.py check
```

Set `VITE_API_BASE_URL` for an independently hosted API. See
[frontend/README.md](frontend/README.md) and [backend/README.md](backend/README.md) for application
configuration.

## Architecture

- Frontend: `app/pages -> features -> components/shared`. Pages compose domain features, feature
  API functions use shared HTTP transport, and reusable visual components remain feature-neutral.
- Backend: `router -> service -> repository/integration`. Routers own HTTP concerns, Pydantic
  schemas validate boundaries, and services own behavior. Add I/O layers only for actual I/O.
- Applications communicate through HTTP and never import each other's source. Root scripts are
  development conveniences, never application runtime dependencies.
- Use colocated `*.module.scss`; `src/main.tsx` imports the one global Sass entry. Sass helpers live
  under `styles/abstracts`, and `_tokens.scss` emits CSS custom properties for runtime themes.
- Validate external values, keep secrets out of browser variables, and enforce permissions on the
  server. See [.github/SECURITY.md](.github/SECURITY.md) and each application's `AGENTS.md` for working rules.

The first version deliberately keeps catalog selection, quote calculations, and versioned local
storage in browser-owned domain features. This supports static GitHub Pages hosting without a
database or deployed backend. `@dnd-kit/react` provides pointer and keyboard drag support; the
separate add buttons also work with touch and keyboard. `jsPDF` is loaded on export and uses a
bundled, licensed Unicode font for downloadable, paginated documents. React web meets the desktop
and tablet requirement without a native app or Expo. Revisit persistence and API contracts when
shared accounts or durable quote history become requirements.

The interface uses soft gray surfaces, navy text, blue accents, and a compact product rail and license
list. The header contains the SalePrice logo, a percentage-only text-size selector from 50% to 150%
in 10% steps, and a Normal/Edit Mode button. Source Sans 3 from Google Fonts is bundled locally under
the SIL Open Font License in `frontend/src/styles/fonts/`; unsupported scripts use the system font.
The selector scales content text while preserving touch targets and readable header controls; it
does not change browser zoom or the PDF's print size. Its setting is saved separately from quote
data on this device. If browser storage is unavailable, changes still apply for the current visit.

**New Order** retains the confirmation before clearing an edited draft. Catalog management controls
are shown only in Edit Mode, and each visit starts in Normal Mode. Catalog storage uses a version 2
snapshot so removed initial entries stay removed. Existing version 1 custom entries are migrated,
with the old storage entry retained for recovery. The PDF retains its bundled Unicode font and print
layout, with a blue SalePrice heading.

## GitHub Pages

The existing `.github/workflows/deploy-pages.yml` deploys `frontend/dist` on pushes to `main`.
Select **Settings → Pages → Source: GitHub Actions** in the repository. Relative Vite assets and hash
routing support repository subpaths and custom domains without server-side SPA fallback; routes
therefore contain `#`. Browser workflows, lint, types, and the production build must pass before
the Pages artifact is published.

Quoting and PDF export require no backend. To enable the optional `/#/status` connection check,
host FastAPI separately over HTTPS, set the Actions repository variable `VITE_API_BASE_URL` to its
API prefix, such as `https://api.example.com/api`, and set backend `APP_CORS_ORIGINS` to the frontend
origin, such as `https://OWNER.github.io` without the repository path. With no API variable, the
status screen reports that the API is not configured. Changing to history routing requires a host
that supports SPA fallback. Configure a custom domain and DNS when a domain is chosen.
