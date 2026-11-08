# Wattwise

**A local-first electricity and solar bill analysis app.**

Wattwise helps you review electricity bill PDFs, maintain monthly history, understand solar grid exchange and generate AI-assisted energy analysis.

> **Migration status:** The Next.js application foundation is being introduced on `feature/migrate-to-nextjs`. Sprint 0 establishes the framework, styling system and application shell. Existing Express APIs, PDF processing, local bill storage and AI analysis remain in the repository and are migrated in later sprints.

## Technology

- Next.js App Router (JavaScript)
- React 19
- PrimeReact v9 (`primereact@9.6.5`)
- Tailwind CSS 3.4
- Manrope and DM Sans typography
- Existing Node.js services for PDF parsing, local JSON storage and AI analysis

## Sprint 0 foundation

- Next.js App Router with dashboard (`/`) and solar (`/solar`) routes.
- PrimeReact v9 provider, Lara Light Green theme and PrimeIcons.
- Tailwind CSS configuration with Wattwise design tokens.
- Shared application header, footer and initial page shell.
- Preserved legacy Express server command for transition and comparison.

The Sprint 0 pages are foundation placeholders. Bill upload, bill history, solar analytics and AI workflows are not yet wired into the Next.js UI.

## Design system

The migration preserves the existing Wattwise visual identity:

| Token | Value |
|---|---|
| Canvas | `#f4f7f3` |
| Primary text | `#1c2923` |
| Deep green | `#24352c` |
| Sage | `#e9efe6` |
| Lime accent | `#d7f36b` |
| Green accent | `#73914b` |
| Muted text | `#69776e` |
| Border | `#e2e9e1` |

- Headings: Manrope
- Body and interface: DM Sans
- Main content width: 1060px
- Main panel radius: 18px
- Responsive layout breakpoint: 650px

Use Tailwind utilities for layout and responsive behaviour. Use PrimeReact v9 for suitable interactive controls, customized to match the Wattwise palette.

## Requirements

- Node.js 20.9 or later
- npm

## Getting started

```bash
git clone https://github.com/pratheeshps/wattwise-agent.git
cd wattwise-agent
git checkout feature/migrate-to-nextjs
npm install
```

Create a local environment file when configuring AI analysis:

```bash
cp .env.example .env
```

Set the following values in `.env`:

```dotenv
ANTHROPIC_AUTH_TOKEN=your_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=your_supported_model_id
PORT=3000
```

Never commit API credentials or local bill data.

## Run the Next.js application

Development:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Production build:

```bash
npm run build
npm start
```

## Legacy application during migration

The existing Express application is retained temporarily:

```bash
npm run legacy:start
```

Do not run the legacy Express server and Next.js dev server on the same port simultaneously. The legacy server uses port 3000 by default; set a different `PORT` value when running both.

## Existing service commands

```bash
npm run agent
npm test
```

The current parser and bill-store services remain the source baseline until their Next.js API route integration is completed.

## Existing functionality to preserve

1. PDF preview with 10 MB size limit, PDF signature validation and SHA-256 duplicate detection.
2. Editable review of extracted bill values before saving.
3. Local storage in `data/bills.json` and `data/uploads/`.
4. Standard and KSEB-style solar net-metered bill parsing.
5. Latest-month-first bill history and individual bill deletion.
6. Solar generation, grid import/export and bank balance analytics.
7. Anthropic-compatible tool-calling agent and deterministic month-on-month calculations.

Energy fields must remain distinct: imported units, exported units, billed consumption, bill amount, net payable and bank balances are not interchangeable. Do not infer household consumption or solar generation when source records do not provide them.

## Local storage and privacy

The legacy local workflow stores:
- Bill metadata: `data/bills.json`
- Uploaded PDFs: `data/uploads/`

These files can contain personal and account information. Keep `data/` out of version control and back it up before making storage changes.

Local filesystem storage is intended for a single-user local workflow. It is not persistent storage for typical serverless hosting and is not suitable for concurrent multi-user production workloads.

## Documentation

- [Product, Architecture & UI Design System](docs/DESIGN-ARCHITECTURE-AND-DESIGN-SYSTEM.md)
- [Next.js Migration Plan](docs/NEXTJS-MIGRATION-PLAN.md)

## License

ISC
