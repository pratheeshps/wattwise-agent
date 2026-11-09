# Wattwise

**A local-first electricity and solar bill analytics application.**

Wattwise helps households review electricity bill PDFs, maintain monthly history, understand solar grid exchange and generate AI-assisted energy analysis.

## Features

- PDF bill preview, field extraction, editable review and save.
- Duplicate PDF detection, 10 MB upload limit and PDF signature validation.
- Monthly overview, bill history and individual bill deletion.
- Solar analytics for net-metered bills, including installation details, recorded generation, grid import/export and bank-balance history.
- AI-assisted bill analysis with deterministic month-on-month calculations.
- Formatted AI reports with headings, responsive comparison tables, lists, emphasis, callouts, copy and rerun actions.
- Local-first storage in `data/bills.json` and `data/uploads/`.

## Technology

- Next.js App Router and React 19
- JavaScript ES modules (no TypeScript)
- PrimeReact 9.6.5 and PrimeIcons
- Tailwind CSS 3.4
- `pdf-parse` for PDF text extraction
- Anthropic-compatible SDK for AI analysis
- Node.js filesystem-backed JSON/PDF storage

## Requirements

- Node.js 20.9 or later
- npm

## Setup

```bash
git clone https://github.com/pratheeshps/wattwise-agent.git
cd wattwise-agent
npm install
```

Create an environment file when using AI analysis:

```bash
cp .env.example .env
```

Configure the provider values:

```dotenv
ANTHROPIC_AUTH_TOKEN=your_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=your_supported_model_id
PORT=3000
```

Never commit API credentials or local bill data.

## Run

Development:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production:

```bash
npm run build
npm start
```

## Verification

Run the regression suite:

```bash
npm test
```

Build and smoke-test the production application:

```bash
npm run build
npm run test:smoke
```

GitHub Actions runs dependency installation, regression tests, the production build and production route/API smoke checks.

### Manual verification checklist

1. Open the dashboard at desktop and mobile widths.
2. Upload a standard electricity bill PDF; verify extracted values, edit them and save.
3. Upload a net-metered bill; verify import, export, billed consumption, bank balances and financial fields remain distinct.
4. Confirm invalid PDFs, files over 10 MB and duplicate PDFs are rejected.
5. Confirm dashboard totals and newest-first bill history update after save and delete.
6. Open `/solar`; verify installation details, source-recorded generation, grid exchange, bank balance and solar bill history.
7. Delete the final saved solar bill and confirm the solar installation and analytics empty states appear.
8. Generate an AI report with valid provider credentials; verify loading, errors, formatted tables and report actions.
9. Confirm deletion refreshes dashboard and solar analytics.

## AI analysis report

The dashboard renders model-generated Markdown as a structured report using `react-markdown` and `remark-gfm`. Supported content includes headings, GitHub-flavoured tables, paragraphs, emphasis, ordered and unordered lists, blockquotes and dividers.

The copy action copies the original Markdown; Run again requests a new analysis. Rendering is presentation-only and does not recalculate bill metrics or change saved records. Deterministic analysis tools remain responsible for month-on-month arithmetic.

## Data and privacy

Bill metadata is stored in `data/bills.json`; uploaded PDFs are stored in `data/uploads/`. These files may contain personal and account information. Keep `data/` out of version control and back it up before storage changes.

The filesystem-backed JSON/PDF store is intended for a local single-user workflow. Typical serverless deployments do not provide durable local filesystem storage. Before hosted multi-user deployment, migrate to a persistent database and object/file storage, and implement authentication and tenant isolation.

Analysis tools exclude consumer identifiers and stored file metadata from the records supplied to the AI model. Analysis must not infer household consumption, generation, causes, appliance usage, weather or tariff changes without source data.

## Documentation

- [Product, Architecture & UI Design System](docs/DESIGN-ARCHITECTURE-AND-DESIGN-SYSTEM.md)

## License

ISC


## Production-readiness foundation (Sprint 6)

Sprint 6 adds a PostgreSQL/Prisma 7 schema, Better Auth email/password configuration, user-scoped bill persistence primitives and a private S3-compatible object-storage adapter. See [Sprint 6 production readiness](docs/SPRINT-6-PRODUCTION-READINESS.md) for setup and rollout gates.

Install dependencies, configure the database and storage environment, then generate the Prisma client and apply migrations:

```bash
npm install
cp .env.example .env
# Fill DATABASE_URL, BETTER_AUTH_SECRET, BETTER_AUTH_URL and S3 settings.
npm run db:generate
npm run db:migrate:dev -- --name production-foundation
```

**Important:** the dashboard bill APIs still use the legacy local JSON/PDF store. Do not deploy the current app publicly until Sprint 6 API session enforcement, PostgreSQL/object-store cutover, sign-in UI and tenant-isolation tests are complete.
