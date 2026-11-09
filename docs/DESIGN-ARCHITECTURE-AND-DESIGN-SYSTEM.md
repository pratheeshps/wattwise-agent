# Wattwise — Product, Architecture & UI Design System

This document describes the current Wattwise application. The application is built with the Next.js App Router and uses JavaScript ES modules.

## 1. Product overview

Wattwise helps a household or small energy user build a history of electricity bills and understand changes over time.

The application supports two bill categories:

- **Standard electricity bill** — imported/consumed units and bill amount.
- **Solar net-metered bill** — imported units, exported units, billed consumption, solar bank opening/closing balance, bill amount and net payable as separate values when those fields are present in the PDF.

The workflow is review-first: PDF extraction proposes values, the user checks and edits them, and only then are they saved. The AI agent analyses saved records; deterministic tools are the source of truth for numeric comparisons.

### Current capabilities

- Responsive dashboard for monthly bill overview, PDF upload/review and bill history.
- PDF file-size limit of 10 MB, PDF signature validation and SHA-256 duplicate detection.
- Text-based PDF extraction using `pdf-parse`.
- User correction of extracted fields before saving.
- Local persistence of original PDF files and bill metadata.
- Newest-billing-month-first bill history and individual bill deletion.
- Dedicated Solar analytics page for net-metered records.
- Solar generation readings shown only for matching saved bill months and when supported by source records.
- AI tool-calling analysis with deterministic month-on-month arithmetic.
- Structured AI report rendering with semantic headings, responsive tables, paragraphs, emphasis, lists, blockquotes and dividers.
- Report actions to copy the original Markdown or request a new analysis.

### Explicit limitations

- OCR for scanned/image-only PDFs is not implemented. Such bills require manual entry in the review form.
- The parser currently contains KSEB-oriented patterns; other utility formats may need additional parser rules and test fixtures.
- There is no user authentication, multi-user tenancy or cloud synchronization.
- Solar analytics show only values explicitly recorded in saved bills or source records. Household consumption and solar generation are not inferred from unrelated values.
- The local JSON store is intended for a single-user prototype, not concurrent multi-user production workloads.

## 2. Main user journeys

### Upload and review a bill

1. The user selects or drops a PDF into the dashboard upload area.
2. The browser posts the file to `POST /api/bills/preview`.
3. The server validates the PDF, checks the duplicate hash, extracts text and proposes bill fields.
4. The review form displays the detected bill type and editable values.
5. The user verifies and corrects the values against the original PDF.
6. The browser posts the reviewed values and PDF to `POST /api/bills`.
7. The server validates the required fields, stores the PDF and appends the bill metadata.
8. The dashboard reloads the saved records and recalculates its summary and history.

### Review solar analytics

1. The Solar page loads saved records from `GET /api/bills`.
2. It filters net-metered bills and presents the installation profile, supported generation records, grid import/export, bank balance and bill history.
3. Charts and summary metrics are derived only from available saved/source values.
4. Deleting a bill calls `DELETE /api/bills/[id]`; dependent metrics and charts refresh from the remaining records.

### Generate an AI report

1. The user enters an analysis goal in the dashboard.
2. The browser sends the goal to `POST /api/analyze`.
3. The server validates the request and invokes the existing agent.
4. The agent calls deterministic tools to retrieve saved bills and calculate chronological comparisons.
5. The model writes a Markdown explanation grounded in the returned tool data.
6. The dashboard renders the Markdown as a structured report. The user can copy the original Markdown or run the analysis again.

## 3. Application architecture

### Technology stack

| Layer                 | Technology                                      |
| --------------------- | ----------------------------------------------- |
| Application framework | Next.js App Router                              |
| Language              | JavaScript ES modules                           |
| UI                    | React 19, PrimeReact 9.6.5, PrimeIcons          |
| Styling               | Tailwind CSS 3.4 and application CSS            |
| PDF extraction        | `pdf-parse`                                     |
| AI integration        | Anthropic-compatible SDK and tool-calling agent |
| Persistence           | Local JSON metadata and uploaded PDF files      |
| Runtime               | Node.js                                         |

### Main project structure

```text
src/
├── agent.js
├── tools.js
├── app/
│   ├── api/
│   │   ├── analyze/route.js
│   │   └── bills/
│   │       ├── route.js
│   │       ├── preview/route.js
│   │       └── [id]/route.js
│   ├── solar/page.js
│   ├── globals.css
│   ├── layout.js
│   └── page.js
├── components/
│   ├── common/
│   ├── dashboard/
│   │   ├── AnalysisPanel.js
│   │   ├── AnalysisReport.js
│   │   ├── BillHistory.js
│   │   └── BillUpload.js
│   └── layout/
├── lib/
│   ├── analysisRequest.js
│   └── billDates.js
└── services/
    ├── billStore.js
    └── pdfBillParser.js
```

### Route responsibilities

| Route                     | Responsibility                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------- |
| `/`                       | Monthly overview, bill upload/review, bill history and AI analysis.                         |
| `/solar`                  | Solar installation details, generation, grid exchange, bank balance and solar bill history. |
| `GET /api/bills`          | Return saved bill metadata for dashboard and solar views.                                   |
| `POST /api/bills/preview` | Parse an uploaded PDF and return candidate fields without saving.                           |
| `POST /api/bills`         | Validate and save the PDF with user-reviewed bill fields.                                   |
| `DELETE /api/bills/[id]`  | Delete one bill record and its associated uploaded PDF.                                     |
| `POST /api/analyze`       | Validate an analysis request and return an AI-generated report.                             |

Filesystem operations, `pdf-parse` and the AI SDK require the Node.js runtime. Route handlers using these services must not use the Edge runtime.

## 4. Data model and domain rules

### Local storage

```text
data/
├── bills.json
└── uploads/
    └── <uuid>.pdf
```

A saved bill record may contain:

| Field                        | Meaning                                            |
| ---------------------------- | -------------------------------------------------- |
| `id`                         | Generated record identifier.                       |
| `billType`                   | `standard` or `net-metered`.                       |
| `month`, `billDate`          | Billing period and bill date.                      |
| `units`, `importedUnits`     | Imported/consumption energy in kWh.                |
| `exportedUnits`              | Exported solar energy in kWh, when available.      |
| `billedConsumption`          | Utility billed-consumption figure, when available. |
| `bankOpening`, `bankClosing` | Solar bank balances, when available.               |
| `amount`                     | Bill amount.                                       |
| `netPayable`                 | Net payable after adjustments, when available.     |
| `consumerNumber`             | Optional consumer identifier.                      |
| `originalName`, `storedFile` | Original filename and local stored filename.       |
| `sha256`                     | PDF content hash used for duplicate detection.     |
| `uploadedAt`                 | Upload timestamp.                                  |

The bill-list API omits internal hash and stored-file path values. Analysis tools exclude consumer identifiers and file metadata from records supplied to the model.

### Domain invariants

- Imported energy, exported energy, billed consumption, bill amount, net payable and bank balances are separate measurements.
- Missing values remain unavailable; they must not be coerced to zero.
- Do not infer household consumption or solar generation from unrelated bill fields.
- Bill history is ordered newest billing month first.
- Deleting a bill removes only the selected record and its associated PDF, then dependent dashboard and solar views are refreshed.
- Solar generation data is displayed only when the source record supports it and the corresponding bill month remains represented in saved solar history.
- Bill amount must not be described as the final amount paid unless the source data establishes that relationship.

### Source-recorded installation and generation information

The current installation profile recorded from the source generator statement is:

- System capacity: 5 kW.
- Grid connection date: 22 July 2026.
- Generator SPIN: 451901662.
- Meter type: net meter.

Source generation readings currently recorded:

| Month          | Normal (kWh) | Off-peak (kWh) | Peak (kWh) | Total (kWh) |
| -------------- | -----------: | -------------: | ---------: | ----------: |
| September 2026 |          624 |              0 |          1 |         625 |
| October 2026   |          906 |              0 |          2 |         908 |
| November 2026  |          451 |              0 |          0 |         451 |

These are source-recorded values, not extrapolations. Missing months must remain unavailable.

## 5. AI analysis and report rendering

### Analysis flow

- `src/agent.js` configures the Anthropic-compatible client and orchestrates tool calls.
- `src/tools.js` exposes deterministic analysis tools over saved bill records.
- `src/app/api/analyze/route.js` validates the request and invokes the agent.
- `src/components/dashboard/AnalysisPanel.js` manages the prompt, loading/error state, report lifecycle, copy and rerun actions.
- `src/components/dashboard/AnalysisReport.js` renders the returned Markdown.

### Report presentation

The report renderer uses `react-markdown` and `remark-gfm`. It supports:

- Heading levels mapped to the Wattwise report hierarchy.
- GitHub-flavoured Markdown tables inside horizontally scrollable wrappers.
- Paragraphs and semantic emphasis.
- Ordered and unordered lists.
- Blockquotes and horizontal rules.
- Normalization of the model's LaTeX-style right-arrow notation.

Raw HTML rendering is not enabled. Copy report copies the original Markdown source, not rendered HTML.

### Analysis safety and accuracy rules

- Deterministic tools calculate numeric differences and percentages; the model explains those results.
- Missing source values remain unavailable.
- The report must not infer causes such as appliance usage, weather or tariff changes unless source data explicitly supports them.
- The report must distinguish bill amount from net payable.
- Consumer identifiers and stored file metadata must not be exposed to the model.
- Report rendering is presentation-only and must not modify bill records or recalculate metrics.

## 6. UI design system

### Visual tokens

| Token                 | Value     |
| --------------------- | --------- |
| Canvas                | `#f4f7f3` |
| Primary text          | `#1c2923` |
| Deep green            | `#24352c` |
| Sage                  | `#e9efe6` |
| Lime accent           | `#d7f36b` |
| Green accent          | `#73914b` |
| Muted text            | `#69776e` |
| Border                | `#e2e9e1` |
| Heading font          | Manrope   |
| Body/interface font   | DM Sans   |
| Content width         | 1060px    |
| Panel radius          | 18px      |
| Responsive breakpoint | 650px     |

### Design implementation rules

- Preserve the Wattwise palette and typography.
- Use Tailwind CSS for layout, spacing and responsive behaviour.
- Use PrimeReact components for suitable interactive controls and override their defaults to match the product identity.
- Keep report tables readable on narrow screens with horizontal overflow rather than compressing values.
- Provide clear loading, empty and error states.
- Keep missing values visually distinct from numeric zero.

## 7. Runtime, security and deployment constraints

- Store environment credentials in local environment variables; never hardcode or commit secrets.
- Keep `data/` out of version control because it may contain personal and account information.
- The current JSON/PDF filesystem store is designed for local single-user use.
- Typical serverless deployments do not provide durable local filesystem storage.
- Before hosted multi-user deployment, migrate bill metadata to a persistent database and PDFs to durable object storage; add authentication, authorization and tenant isolation.
- Do not deploy the current filesystem persistence layer as if it were durable serverless storage.

## 8. Verification

Automated checks:

```bash
npm test
npm run build
npm run test:smoke
```

The GitHub Actions workflow installs dependencies, runs regression tests, builds the production app and exercises production routes and API validation.

Manual checks should include representative standard and net-metered PDFs, field review and correction, duplicate rejection, save/delete, solar empty states, desktop/mobile layouts, and provider-backed AI analysis with valid credentials.
