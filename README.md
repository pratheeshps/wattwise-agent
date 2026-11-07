# Wattwise

**A local-first electricity and solar bill analysis app.**

Wattwise lets you upload electricity bill PDFs, review extracted values, build a month-by-month bill history, and generate AI-assisted analysis of energy and cost changes. It supports standard electricity bills and solar net-metered bills as distinct record types.

## Highlights

### Bill upload and extraction
- Upload a PDF through the browser using file selection or drag and drop.
- Enforces a 10 MB upload limit, checks the PDF signature and detects duplicate files using SHA-256.
- Extracts selectable PDF text with `pdf-parse` and applies bill-specific parsing rules.
- Recognises standard and KSEB-style solar net-metered bill layouts.
- Extracts separate values for imported units, exported solar units, billed consumption, solar bank opening/closing balances, bill amount and net payable when present.
- Presents extracted values in an editable review form. Verify every field against the source PDF before saving.
- Scanned/image-only PDFs are not OCR-processed; values can be entered manually in the review form.

### Monthly history
- Stores original PDFs and bill metadata locally.
- Shows uploaded bill count, total imported energy and total bill amount.
- Lists each bill's type, import/export values, bill amount/net payable and upload date.
- Uses saved uploaded records only; there are no hardcoded demonstration bills.

### Solar analytics dashboard
- Provides a dedicated Solar analytics page at `/solar.html`, linked from the main dashboard navigation.
- Displays the latest bill's imported energy, exported energy, recorded bank closing balance and net payable.
- Includes a monthly import/export comparison chart, a recorded bank-balance trend and a detailed solar bill table on the separate solar page.
- Keeps missing values distinct from zero and labels energy exchange and bank balances separately.
- Does not infer solar generation or total household consumption when those measurements are absent from the source bills.

### AI analysis
- Uses an Anthropic-compatible tool-calling agent to analyse saved bill records.
- Calculates month-on-month differences and percentage changes deterministically in the local analysis tool before generating narrative insights.
- Distinguishes imported energy, exported energy, billed consumption, bill amount and net payable.
- Renders the Markdown response as a readable report with headings, comparison tables, observation lists and paragraphs.

## Screenshots and design documentation

The web interface uses a calm, nature-inspired visual system with Manrope headings, DM Sans interface typography, soft sage surfaces and a lime primary-action accent.

See **[Design, Architecture & UI Design System](docs/DESIGN-ARCHITECTURE-AND-DESIGN-SYSTEM.md)** for:
- Product scope and user journey
- Architecture diagrams and request/data flows
- API endpoint reference
- Local data model and analysis calculation rules
- Typography, color palette, layout, spacing and component guidance
- Responsive and accessibility notes
- Security limitations and recommended next steps

## Requirements

- Node.js 20 or later
- npm
- An Anthropic API key or compatible model endpoint for AI analysis

PDF upload, extraction, manual review and local history work without AI credentials. AI analysis requires the model configuration below.

## Getting started

```bash
git clone https://github.com/pratheeshps/wattwise-agent.git
cd wattwise-agent
npm install
```

Create a `.env` file in the project root:

```dotenv
ANTHROPIC_AUTH_TOKEN=your_api_key
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=your_supported_model_id
PORT=3000
```

- `ANTHROPIC_AUTH_TOKEN`: credential for the configured model API.
- `ANTHROPIC_BASE_URL`: optional; defaults to `https://api.anthropic.com`. Use a compatible endpoint if required.
- `ANTHROPIC_MODEL`: model identifier accepted by that endpoint.
- `PORT`: optional local web server port; defaults to `3000`.

Do not commit `.env` or share API credentials.

## Run the application

Start the web application:

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

1. Choose or drop an electricity bill PDF.
2. Select **Read bill details**.
3. Review and correct the extracted fields against the original PDF.
4. Select **Save bill to history**.
5. Upload additional billing months.
6. Select **Analyse my bills** to generate the AI report (requires model credentials).

Run the command-line agent separately:

```bash
npm run agent
```

Run service tests:

```bash
npm test
```

## API

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/bills` | Returns saved bill records for the monthly history. |
| `POST` | `/api/bills/preview` | Accepts a PDF and returns extracted fields for review without saving. |
| `POST` | `/api/bills` | Saves the PDF and reviewed bill fields to local storage. |
| `POST` | `/api/analyze` | Runs the AI agent against saved bills and returns a Markdown report. |

## Project structure

```text
wattwise-agent/
├── docs/
│   └── DESIGN-ARCHITECTURE-AND-DESIGN-SYSTEM.md
├── public/
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── src/
│   ├── agent.js
│   ├── index.js
│   ├── server.js
│   ├── tools.js
│   └── services/
│       ├── billStore.js
│       └── pdfBillParser.js
├── data/                 # created locally; excluded from Git
│   ├── bills.json
│   └── uploads/
├── package.json
└── README.md
```

## Local storage and privacy

The application stores data on the machine running the server:

- Original PDFs: `data/uploads/`
- Bill metadata: `data/bills.json`

The `data/` directory contains sensitive bill information and should remain excluded from version control. Back up both the JSON file and the uploads directory if you want to retain your history.

## Current limitations

- PDF parsing depends on selectable text. OCR for scanned/image-only PDFs is not currently included.
- Parser rules are currently oriented toward the supported KSEB bill layouts. Other utilities may require new parsing patterns and test PDFs.
- Data is stored in a local JSON file; this is intended for a single-user local workflow, not concurrent multi-user production use.
- Authentication, tenant isolation, cloud storage and hosted deployment hardening are not yet implemented.
- Automatically extracted values can be incomplete or incorrect. Always verify the review form against the original bill.

## Security before deployment

This project is designed for local use. Do not expose the server publicly without implementing authentication and authorization, HTTPS, CSRF protection, rate limiting, secure upload handling, production storage controls and appropriate data retention policies. Keep API keys in environment variables and do not log full bill contents or consumer identifiers.

## License

ISC
