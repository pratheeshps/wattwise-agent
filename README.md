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
- User-scoped PostgreSQL bill metadata and private PDF storage.
- Configurable local filesystem or S3-compatible PDF storage.

## Technology

- Next.js App Router and React 19
- JavaScript ES modules (no TypeScript)
- PrimeReact 9.6.5 and PrimeIcons
- Tailwind CSS 3.4
- PostgreSQL, Prisma ORM 7 and the PostgreSQL driver adapter
- Better Auth email/password authentication
- `pdf-parse` for PDF text extraction
- Anthropic-compatible SDK for AI analysis
- Local filesystem or S3-compatible object storage (AWS S3, Cloudflare R2, MinIO)

## Requirements

- Node.js 22.12 or later
- npm
- PostgreSQL

## Setup

```bash
git clone https://github.com/pratheeshps/wattwise-agent.git
cd wattwise-agent
npm install
cp .env.example .env
```

Configure `DATABASE_URL`, a high-entropy `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `BETTER_AUTH_TRUSTED_ORIGINS`, SMTP settings and AI provider settings as needed.

Generate a secret with:

```bash
openssl rand -base64 32
```

## PDF storage configuration

### Local filesystem (recommended for local development)

Local storage is the default. Set:

```dotenv
STORAGE_PROVIDER=local
LOCAL_STORAGE_DIR=./storage/bills
```

PDFs are stored under the configured directory using server-generated user-scoped object keys. The directory is ignored by Git. Back it up separately; deleting it deletes locally stored PDFs.

### S3-compatible storage (Cloudflare R2, AWS S3, MinIO)

Set `STORAGE_PROVIDER=s3` and configure:

```dotenv
STORAGE_PROVIDER=s3
S3_BUCKET=your-private-bucket
S3_REGION=auto
S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=your-access-key
S3_SECRET_ACCESS_KEY=your-secret-key
```

For AWS S3, use the bucket's region and omit `S3_ENDPOINT`. For MinIO, use its S3 endpoint and credentials. Keep buckets private and never expose credentials through `NEXT_PUBLIC_*` variables.

The application exposes an authenticated bill download endpoint at `/api/bills/:id/download`. Local storage streams the file through the application; S3 mode redirects to a short-lived signed URL.

## Database setup

```bash
npm run db:generate
npm run db:migrate:deploy
```

For creating and applying a new development migration after schema changes, use:

```bash
npm run db:migrate:dev -- --name describe_change
```

## Run

Development:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Visit `/sign-in` to create an account. Email verification requires a working SMTP configuration.

Production:

```bash
npm run build
npm start
```

## Verification

```bash
npm test
npm run build
npm run test:smoke
```

The storage adapter tests cover local upload, read, delete and path traversal rejection. The authenticated download endpoint checks the session and looks up the bill under the current user's ID before accessing the object.

### Manual verification checklist

1. Open the dashboard at desktop and mobile widths.
2. Register and verify an account after configuring SMTP.
3. Upload a standard electricity bill PDF; verify extracted values, edit them and save.
4. Upload a net-metered bill; verify import, export, billed consumption, bank balances and financial fields remain distinct.
5. Confirm invalid PDFs, files over 10 MB and duplicate PDFs are rejected.
6. Confirm dashboard totals and newest-first bill history update after save and delete.
7. Open `/solar`; verify installation details, source-recorded generation, grid exchange, bank balance and solar bill history.
8. Download a bill using the authenticated download endpoint.
9. Generate an AI report with valid provider credentials; verify loading, errors, formatted tables and report actions.
10. Confirm deletion refreshes dashboard and solar analytics.

## Data and privacy

Bill metadata is stored in PostgreSQL and PDF files are stored using the configured storage provider. Local filesystem storage is intended for local development and a single persistent host. It is not durable across typical serverless deployments and is not shared across multiple application instances.

For hosted multi-user production, use PostgreSQL and private object storage such as Cloudflare R2 or AWS S3. Configure backups, restore testing, rate limits, email delivery and monitoring. Do not commit `.env`, local bill data or stored PDFs.

Analysis tools exclude consumer identifiers and stored file metadata from the records supplied to the AI model. Analysis must not infer household consumption, generation, causes, appliance usage, weather or tariff changes without source data.

## Documentation

- [Product, Architecture & UI Design System](docs/DESIGN-ARCHITECTURE-AND-DESIGN-SYSTEM.md)
- [Sprint 6 production readiness](docs/SPRINT-6-PRODUCTION-READINESS.md)

## License

ISC
