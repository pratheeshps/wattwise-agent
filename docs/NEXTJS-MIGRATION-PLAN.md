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
- PrimeReact v9.6.5, Lara Light Green theme and PrimeIcons.
- Tailwind CSS 3.4 and PostCSS configuration.
- Wattwise CSS variables and Tailwind design tokens.
- Shared PrimeReact provider, header, footer and initial dashboard shell.
- Dedicated `/solar` route placeholder.
- Existing Express app retained with `npm run legacy:start`.
- Existing parser, bill store, agent and tests remain untouched.

### Not delivered in Sprint 0

- PDF upload or preview in Next.js.
- Next.js bill API endpoints.
- Bill create/list/delete flows.
- Solar analytics charts or source-generation tables.
- AI analysis API and report rendering.
- Automated browser/build verification.

## Sprint sequence

1. **Sprint 0 — Foundation:** framework, styling, provider and shell.
2. **Sprint 1 — Dashboard UI:** upload/review, overview metrics and bill history components.
3. **Sprint 2 — Backend integration:** Next.js Route Handlers, PDF preview, save/list/delete and local storage.
4. **Sprint 3 — Solar analytics:** installation profile, source-derived generation, import/export, bank balance and solar bill history.
5. **Sprint 4 — AI analysis:** agent integration, deterministic comparisons and report UI.
6. **Sprint 5 — Verification:** parser/API regression tests, UI checks, responsive verification and documentation.

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
