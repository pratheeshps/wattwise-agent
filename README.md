# Wattwise

**A local-first electricity and solar bill analysis app.**

Wattwise helps you review electricity bill PDFs, maintain monthly history, understand solar grid exchange and generate AI-assisted energy analysis.

> **Migration status:** The Next.js migration is implemented through Sprint 4 on `feature/migrate-to-nextjs`. Automated CI now runs regression tests and a production build; provider-backed AI and browser-level regression checks still require local verification.

## Technology

- Next.js App Router (JavaScript, no TypeScript)
- React 19
- PrimeReact v9 (`primereact@9.6.5`) and PrimeIcons
- Tailwind CSS 3.4
- Manrope and DM Sans typography
- Existing Node.js PDF parser, local JSON/PDF bill store and Anthropic-compatible AI agent

## Features

- PDF bill preview, extraction, editable review and save.
- Duplicate PDF detection, 10 MB upload limit and PDF signature validation.
- Monthly bill history, overview metrics and individual bill deletion.
- Solar installation profile, source-derived generation readings, grid import/export and bank-balance analytics.
- AI bill analysis using deterministic month-on-month calculations and an Anthropic-compatible provider.
- Local-first storage in `data/bills.json` and `data/uploads/`.

## Requirements and setup

- Node.js 20.9 or later (CI uses Node.js 22)
- npm

```bash
git clone https://github.com/pratheeshps/wattwise-agent.git
cd wattwise-agent
git checkout feature/migrate-to-nextjs
npm install
```

Create the local environment file when using AI analysis:

```bash
cp .env.example .env
```

Configure:

```dotenv
ANTHROPIC_AUTH_TOKEN=your_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=your_supported_model_id
PORT=3000
```

Never commit API credentials or local bill data.

## Run the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production:

```bash
npm run build
npm start
```

Legacy Express app during migration:

```bash
npm run legacy:start
```

## Verification

Run the complete Node.js regression suite:

```bash
npm test
```

Build the production application:

```bash
npm run build
```

GitHub Actions runs dependency installation, `npm test` and `npm run build` for pushes to `main` and feature branches, pull requests to `main`, and manual workflow dispatch.

Local browser regression checklist:

1. Open the dashboard at desktop and mobile widths.
2. Upload a valid PDF, verify extracted fields, edit a field and save.
3. Confirm invalid PDFs, files over 10 MB and duplicate PDFs are rejected.
4. Confirm dashboard totals and newest-first history update after save and delete.
5. Open `/solar`; verify import/export, bank balance, generation and bill history use saved bill data.
6. Generate an AI report with valid provider credentials; verify loading, errors and report rendering.
7. Confirm bill deletion refreshes both dashboard and solar analytics.

## Data and privacy

Local bill metadata is stored in `data/bills.json`; uploaded PDFs are stored in `data/uploads/`. These files may contain personal and account information. Keep `data/` out of version control and back it up before storage changes.

The filesystem-backed JSON/PDF store is intended for a local single-user workflow. Typical serverless deployments do not provide durable local filesystem storage. Before hosted multi-user deployment, migrate to a persistent database and object/file storage.

Analysis tools exclude consumer identifiers and stored file metadata from the records supplied to the AI model. The analysis should not infer household consumption, generation, causes, appliance usage, weather or tariff changes without source data.

## Documentation

- [Product, Architecture & UI Design System](docs/DESIGN-ARCHITECTURE-AND-DESIGN-SYSTEM.md)
- [Next.js Migration Plan](docs/NEXTJS-MIGRATION-PLAN.md)

## License

ISC
