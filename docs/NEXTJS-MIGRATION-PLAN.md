# Wattwise Next.js Migration Plan

## Goal

Move the local-first Wattwise application from an Express-served static frontend to Next.js App Router while preserving the existing PDF parsing, bill history, solar analytics, local JSON/PDF storage and AI analysis behaviour.

## Technology decisions

| Area | Decision |
|---|---|
| Framework | Next.js App Router |
| Language | JavaScript (ES Modules), no TypeScript |
| React | React 19 |
| UI components | PrimeReact v9, pinned to 9.6.5 |
| Component icons | PrimeIcons |
| Styling | Tailwind CSS 3.4 |
| Fonts | Manrope headings, DM Sans interface/body |
| API | Next.js Route Handlers using Node.js runtime |
| PDF extraction | Existing `pdf-parse` service |
| Persistence | Existing local JSON store and uploaded PDF files |
| AI | Existing Anthropic-compatible agent and deterministic analysis tools |

Next.js and Tailwind configuration follows the current official App Router installation guidance. PrimeReact v9 is intentionally pinned to the v9 stable release requested for this project.

## Design system constraints

The migration must preserve the existing Wattwise visual language and not apply a generic component-library theme:

- Canvas: `#f4f7f3`
- Primary text: `#1c2923`
- Deep green: `#24352c`
- Sage: `#e9efe6`
- Lime accent: `#d7f36b`
- Green accent: `#73914b`
- Muted text: `#69776e`
- Border: `#e2e9e1`
- Headings: Manrope
- Body/interface: DM Sans
- Content width: 1060px
- Panel radius: 18px
- Responsive breakpoint: 650px

Tailwind is responsible for page layout, spacing, responsive behaviour and application styles. PrimeReact v9 is used for appropriate interactive controls, with component overrides to align with the established design tokens.

## Sprint 0 — Foundation

### Delivered

- Next.js App Router setup and root layout.
- JavaScript-only project configuration and `@/*` path alias.
- React 19 and Next.js 16 dependencies.
- PrimeReact v9.6.5, Lara Light Teal theme (with Wattwise green design-token overrides) and PrimeIcons.
- Tailwind CSS 3.4 and PostCSS configuration.
- Wattwise CSS variables and Tailwind design tokens.
- Shared PrimeReact provider, header, footer and initial dashboard shell.
- Dedicated `/solar` route, subsequently populated with migrated solar analytics.
- Existing Express app retained with `npm run legacy:start`.
- Existing parser, bill store, agent and tests remain untouched.

### Sprint 0 follow-up

Sprint 1 now provides the dashboard and bill workflow. AI report integration and automated verification remain future milestones.

## Sprint sequence

1. **Sprint 0 — Foundation:** framework, styling, provider and shell.
2. **Sprint 1 — Dashboard and bill workflow:** responsive dashboard, PDF upload/review, monthly overview, newest-first bill history, delete confirmation, and Next.js Route Handlers for preview/list/save/delete using the existing local JSON/PDF store.
3. **Sprint 2 — Solar analytics:** installation profile, source-derived generation, import/export, bank balance and solar bill history.
4. **Sprint 3 — AI analysis:** agent integration, deterministic comparisons and report UI.
5. **Sprint 4 — Verification:** parser/API regression tests, UI checks, responsive verification and documentation.

## Sprint 2 — Solar analytics

### Delivered

- Replaced the `/solar` placeholder with a responsive Next.js solar analytics page.
- Reused `GET /api/bills` and `DELETE /api/bills/[id]`; no second storage path or duplicate API was introduced.
- Filtered the saved bill history to `billType: "net-metered"` and displayed latest-bill metrics for grid imports, exports, closing bank balance and net payable.
- Added imported/exported grid-energy chart and recorded bank-balance chart using only values present in saved bill records.
- Migrated the installation profile from the source KSEB generator statement: 5 kW, grid-connected 22 Jul 2026, SPIN 451901662, net meter.
- Migrated source generation readings: September 625 kWh (624 normal, 0 off-peak, 1 peak), October 908 kWh (906 normal, 0 off-peak, 2 peak), November 451 kWh (451 normal, 0 off-peak, 0 peak). A source generation record is displayed only when its corresponding bill month remains in saved history.
- Added a paginated solar bill table with a PrimeReact delete confirmation dialog.
- Added an explicit bill category selector to the review form so the user can correct standard versus solar net-metered classification before saving.
- Kept generation readings, grid imports/exports, billed consumption, bank balances and financial values distinct. Missing values remain unavailable rather than being rendered as zero.

### Verification status

The implementation has been committed to the migration branch. Local production build, automated tests and browser regression checks still need to be run before treating this sprint as verified.
## Data and domain invariants

- Preserve the existing `data/bills.json` and `data/uploads/` paths.
- Never delete or overwrite local user data as part of framework setup.
- Continue validating PDF signature, maximum upload size and SHA-256 duplicate hash.
- Preserve the review-before-save workflow.
- Keep imported energy, exported energy, billed consumption, bill amount, net payable and solar bank balance as distinct measurements.
- Missing values must remain missing; do not coerce them to zero.
- Do not infer total household consumption or solar generation from unrelated bill values.
- Preserve latest-billing-month-first ordering in both bill tables.
- Bill deletion must remove only the selected bill metadata and its associated uploaded PDF, then refresh dependent summaries/charts.

## Runtime and deployment constraints

Filesystem operations, `pdf-parse` and the Anthropic SDK require the Node.js runtime. Route handlers using these services must not use the Edge runtime.

The current JSON/PDF storage is for a single-user local workflow. Typical serverless deployments do not provide durable local filesystem storage. Before any hosted deployment, choose persistent database and object/file storage; do not silently substitute ephemeral serverless disk.

## Local commands

```bash
npm install
npm run dev
npm run build
npm start
npm run legacy:start
npm test
```

- `npm run dev`: Next.js development server.
- `npm run build`: production build.
- `npm start`: production Next.js server (run after build).
- `npm run legacy:start`: existing Express application during migration.
- `npm test`: existing Node.js service tests.

Run the legacy Express server and Next.js dev server on different ports if both need to run at the same time.


## Sprint 3 — AI analysis

### Delivered

- Added the Node.js Route Handler `POST /api/analyze`, which validates the request, checks that at least one saved bill exists, and calls the existing `runAgent` implementation.
- Connected the existing agent to the Next.js server runtime without duplicating its Anthropic-compatible provider setup or deterministic tools.
- Kept the existing environment variable contract: `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL` and `ANTHROPIC_MODEL`. The agent loads local environment configuration for direct Node.js usage; no credentials are embedded in source.
- Added dashboard analysis controls with an editable prompt, loading/error states, generated report display and rerun action.
- Kept analysis grounded in saved bill records and preserved the agent's month-on-month comparison instructions and missing-data/causality limitations.
- Excluded consumer numbers from the records returned to the AI tools.

### Verification status

The API and UI integration have been committed to the migration branch. Provider-backed analysis, local production build and browser checks have not been run in this environment. Configure provider credentials locally before testing a live report.

## Sprint 4 — Verification and regression coverage

### Delivered

- Expanded the Node.js test command to discover the full `*.test.js` suite across the repository.
- Added deterministic analysis-tool tests for chronological ordering, month-on-month deltas, percentage calculations, missing values, zero baselines, unsupported tools and consumer-identifier redaction.
- Made the deterministic analysis function directly testable and allowed tests to pass in-memory bill fixtures without touching the user's local JSON store.
- Hardened bill comparison arithmetic so missing source values remain unavailable rather than becoming `NaN`.
- Added date sorting tests for ISO dates, day-first dates, month fallback and unparseable values.
- Added shared analysis-request validation and tests for malformed payloads, default prompts, non-text goals and the 1,000-character limit.
- Added further PDF parser regression coverage for standard bills and documents with missing bill fields.
- Added a GitHub Actions workflow that installs dependencies, runs the regression suite, builds the Next.js production app and smoke-tests the dashboard, solar page, bills API and malformed analysis requests on pushes to `main`/feature branches, pull requests to `main`, and manual dispatch.
- Updated the verification instructions and project README to reflect the delivered migration milestones.

### Verification scope and remaining manual checks

The automated workflow is committed and its first run exposed a parser-fixture mismatch; that fixture was corrected. The latest workflow run must complete successfully before marking CI verification green. The workflow's first run is the authoritative check for dependency installation, tests and production build. Provider-backed AI requests require valid local credentials and saved bills. Browser interaction, mobile/responsive layout, PDF upload with real files, bill deletion and solar chart rendering still require a local browser regression pass.

Before hosted deployment, move the current local JSON/PDF storage to durable database and object storage. The existing filesystem-backed workflow is for local single-user use and must not be treated as persistent serverless storage.
