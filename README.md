# Wattwise Agent

Wattwise is a local-first electricity bill analysis app. Upload a PDF electricity bill, review the extracted values, save it to your monthly history, and ask the AI agent to analyse the saved records.

## Features

- PDF upload through a responsive web interface (10 MB maximum).
- PDF signature validation and duplicate detection using SHA-256.
- Extracts selectable PDF text and suggests billing month, bill date, units and amount.
- Manual review/edit before saving. Scanned PDFs without selectable text can be entered manually.
- Stores uploaded PDFs and bill history locally in `data/`.
- Monthly history with consumption and amount totals.
- Claude-compatible tool-calling agent reads saved uploaded bills only; no hardcoded sample bills.

## Requirements

- Node.js 20+
- An Anthropic API key or compatible API endpoint for AI analysis.

## Setup

```bash
git clone https://github.com/pratheeshps/wattwise-agent.git
cd wattwise-agent
npm install
```

Create a `.env` file:

```bash
ANTHROPIC_AUTH_TOKEN=your-api-key
ANTHROPIC_BASE_URL=https://api.anthropic.com
ANTHROPIC_MODEL=your-model-id
PORT=3000
```

AI analysis requires the three `ANTHROPIC_*` values. The upload, extraction, review and local history features do not require an AI API key.

## Run the web app

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

1. Select a PDF electricity bill.
2. Click **Read bill details**.
3. Verify or correct the extracted fields.
4. Click **Save bill to history**.
5. Upload other months and use **Analyse my bills** when the AI credentials are configured.

## Run the CLI agent

```bash
npm run agent
```

The agent tools read from the same local bill store. The old October/November hardcoded sample records have been removed.

## Local data and privacy

- Original PDF files are stored under `data/uploads/`.
- Bill metadata is stored in `data/bills.json`.
- The `data/` directory is excluded from Git because electricity bills can contain personal information.
- Keep backups of `data/` if you need to preserve your bill history.
- Do not expose this development server publicly without adding authentication, HTTPS, CSRF protection and appropriate access controls.

## PDF extraction limitations

The initial parser uses text embedded in PDFs. Image-only/scanned PDFs need OCR, which is not included in this first implementation. For those files, enter the required values manually in the review form. Automatically detected values must always be checked against the original bill.

## Project structure

```text
src/
  agent.js
  index.js
  server.js
  tools.js
  services/
    billStore.js
    pdfBillParser.js
public/
  index.html
  app.js
  styles.css
data/                 # created locally; ignored by Git
  bills.json
  uploads/
```
