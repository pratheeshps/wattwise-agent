# Analytics-First Dashboard — Product & Implementation Plan

**Status:** Sprint 0 through Sprint 5 implemented and CI-validated; Sprint 6 infrastructure foundation committed, application cutover pending  
**Branch:** `feature/analytics-first-dashboard`  
**Base:** `main`  
**Product principle:** Understand energy first; upload bills to maintain the evidence behind the insights.

## 1. Product objective

Make the Wattwise dashboard an analytics-first experience. On opening the dashboard, users should be able to understand the selected billing month's electricity usage, solar performance, grid exchange and bill position, then ask Intelligent Analysis to explain supported trends. Uploading a bill remains visible but is a secondary data-entry action.

The dashboard must never turn missing data into zero, label estimates as actual readings, or imply that AI-generated explanations are verified meter measurements.

## 2. Proposed information hierarchy

1. **Page heading and controls**
   - Page title and concise description.
   - Selected billing-month control.
   - Compact `Upload bill` action in the header.
2. **Monthly overview**
   - Selected month and comparison context.
   - Metric cards for available imported energy, exported energy, solar generation (only where source-supported), bill amount and net payable.
   - Each metric has a unit, source/context label and clear unavailable state.
3. **Energy performance**
   - Monthly trend visualization for available import/export/generation readings.
   - Separate series and labels; never combine distinct domain measurements into a misleading total.
   - Explicitly state when a series has no data.
4. **Intelligent Analysis**
   - Prominent, first-class dashboard section.
   - Analyze the selected month and compare it with the previous available billing month where possible.
   - Explain changes, identify data-supported patterns and surface limitations.
   - Display evidence period, source coverage and unavailable inputs.
5. **Monthly history**
   - Month-by-month history and navigation to prior months.
   - Preserve the existing detailed bill history and delete workflow.
6. **Bill upload**
   - Open from the compact header action or a contextual empty-state action.
   - Keep the existing PDF preview, correction and explicit save workflow.

## 3. Month selection and data behavior

- Build the month options from saved bill records; do not invent months or fill gaps in history.
- Normalize billing-month keys consistently and sort chronologically using the existing bill-date utility where possible.
- Default to the latest available billing month. If no bills exist, show an explicit no-data state and no misleading selected-month metrics.
- Selecting a month updates the overview, performance charts, history context and Intelligent Analysis scope together.
- If a month has multiple records, define and test the aggregation/selection rule before presenting a single monthly metric. Do not silently double-count.
- Previous-month comparisons must use the previous available billing month and identify that month by name; do not assume calendar-adjacent months have records.
- Preserve separate fields: imported energy, exported energy, billed consumption, solar generation, bank opening/closing balance, bill amount and net payable.

## 4. Metric and provenance rules

Every displayed metric must be one of:

- **Source-recorded:** present in the uploaded bill or explicitly transcribed source record.
- **Deterministically calculated:** calculated from identified source-recorded values using a documented formula.
- **AI interpretation:** natural-language explanation grounded in deterministic tool results; never a substitute for a source measurement.

Rules:

- Missing values render as `—` or a descriptive unavailable state, not `0`.
- A true numeric zero remains a zero.
- Do not use JavaScript fallbacks such as `value || 0` for domain metrics.
- Do not label bill amount as amount paid or net payable unless the source field supports that meaning.
- Do not infer household total consumption from grid import/export or solar generation.
- Do not calculate savings unless a defensible baseline and required inputs exist; otherwise say savings cannot be determined from the available records.
- Show units (kWh, INR, or source-defined bank units) and billing period.
- Clearly distinguish generation records from net-metered bill fields.

## 5. Intelligent Analysis — first-class capability

Intelligent Analysis is a core product outcome and must be visually prominent, not buried below the bill table.

### User experience

- Provide a clear selected-month analysis action and a useful default analysis goal.
- Show the analysis period and comparison period in the report.
- Include sections for key findings, month-over-month changes, bill/energy observations, data limitations and practical next steps.
- Retain custom user questions, loading state, error state, copy report and rerun actions.
- If data is insufficient, explain what is missing rather than producing generic or speculative conclusions.

### Data and API

- Extend the analysis request contract to accept a validated billing-month identifier (and, if needed, explicit comparison-month identifier).
- Keep deterministic tools as the source of truth for numeric calculations; the model explains tool outputs.
- Return or retain structured context identifying the selected month, comparison month and available fields.
- Ensure consumer identifiers, PDF paths, hashes and other private file metadata are not sent to the model.
- Handle provider/API failure without hiding the rest of the dashboard.
- Do not silently fall back to an all-history analysis when the user requested one month.

### Analysis guardrails

- Distinguish source facts, calculations and model interpretation.
- Do not invent causes such as appliance behavior, weather or tariff changes.
- Do not claim savings or efficiency improvements without adequate evidence.
- Explain unavailable comparisons, missing source fields and incomplete month coverage.
- Keep the original Markdown report copy behavior and safe structured rendering.

## 6. Empty, loading and error states

- **No bills:** show an analytics-first welcome state explaining that insights appear after a bill is saved, with a clear `Upload first bill` action.
- **No solar bill for selected month:** show solar metrics as unavailable for that month; do not borrow a different month's value.
- **No generation record:** show `Generation data unavailable`, not zero generation.
- **No previous available month:** show that comparison is unavailable.
- **AI not configured/provider unavailable:** retain all non-AI analytics and show a recoverable Intelligent Analysis error state.
- **Loading:** use stable skeletons or concise loading indicators without flashing placeholder zeroes.
- **Partial data:** render available metrics while clearly marking missing fields.

## 7. Implementation stages

### Stage 0 — Baseline and data contract

- Inspect current bill, solar and analysis data contracts.
- Add reusable month-key/period helpers and tests.
- Define duplicate-month behavior and metric provenance.
- Preserve existing upload, save, delete and parser behavior.

### Stage 1 — Analytics-first dashboard shell

- [x] Move upload out of the primary page flow.
- [x] Add compact header upload action and contextual upload entry points.
- [x] Introduce selected-month state and month selector.
- [x] Add a monthly overview that defaults to the latest available month.
- [x] Implement truthful empty, loading and partial-data states.

**Implementation note:** the upload workflow is preserved and shown in a collapsible section. Monthly metrics use the selected month and the latest-upload-wins active bill. Solar generation is included only for an active net-metered bill with an exact source month match. Bill history and delete actions remain available. Intelligent Analysis is visible, but its request is still all-history until Stage 3 changes the API/tool contract.

### Stage 2 — Energy performance

- [x] Add historical visualizations for fields that are actually available.
- [x] Keep import, export, generation and billed consumption separate.
- [x] Label source and period; handle missing months without fabricated points.
- [x] Reuse existing chart conventions where practical.

### Stage 3 — Intelligent Analysis integration

- [x] Make analysis a prominent section directly after the overview/performance content.
- [x] Scope analysis to the selected month and previous available month.
- [x] Update request validation and deterministic tool context.
- [x] Render evidence period, findings, limitations and next steps.
- [x] Preserve custom prompts, report rendering, copy and rerun actions.

### Stage 4 — Monthly history and interaction polish

- [x] Add previous/next navigation across saved billing months only.
- [x] Add a View month action to each valid saved bill-history record.
- [x] Keep the overview, chart highlight and Intelligent Analysis scope synchronized through the shared selected-month state.
- [x] Preserve bill history and delete confirmation/actions.
- [x] Refine responsive action layout, selected-row context, focus visibility, semantic labels and reduced-motion behavior.

**Implementation record:** Added `getAdjacentAvailableMonth` and unit coverage to navigate only between existing saved periods. The overview now provides Older/Newer controls with correct boundary states. Bill History provides a View month action for each valid record, marks the currently viewed month and scrolls back to the overview after selection. Duplicate bills remain individually visible and deletable; selecting any duplicate opens the shared month view, which continues to use the latest-upload-wins active bill. Existing month state continues to drive the historical chart and month-scoped analysis. Added keyboard focus treatment, responsive row actions, reduced-motion handling and corrected nested history landmark labeling.

Implementation files: `src/lib/monthlyAnalytics.js`, `src/lib/monthlyAnalytics.test.js`, `src/app/page.js`, `src/components/dashboard/BillHistory.js`, `src/app/globals.css`.

### Stage 5 — Regression and acceptance

- [x] Retain unit coverage for month selection, month normalization, missing values, duplicate months, solar matching and previous-available-month comparisons.
- [x] Extend production smoke coverage for canonical month validation, reviewed bill persistence, genuine zero values, duplicate PDF rejection and bill-history privacy.
- [x] Exercise selected-month analysis through the production API and assert that provider failures are returned as recoverable errors rather than breaking the dashboard.
- [x] Ensure the smoke fixture is deleted in a `finally` block, including when an acceptance assertion fails.
- [x] Confirm `npm test`, `npm run build` and `npm run test:smoke` on the Sprint 5 implementation commit.
- [ ] Manually verify representative real standard/net-metered PDFs and responsive desktop/mobile behavior in the user's local environment.

**Sprint 5 implementation record:** Extended `scripts/production-smoke.mjs` to submit a disposable reviewed bill through the real API, verify that source-recorded zero values survive persistence, reject the same PDF as a duplicate, verify private storage/hash/consumer fields are not exposed by the bill-list API, and invoke selected-month analysis. The analysis smoke check accepts either a valid report with selected-period context or a structured recoverable provider error (502/503), so CI does not require a live AI credential. The fixture is always deleted through the API in `finally`. Added a canonical billing-month rejection check. The acceptance run also caught and fixed a privacy leak: bill-list and bill-save responses now omit consumer numbers and original PDF filenames as well as hashes and stored paths. Existing unit suites continue to cover latest-upload-wins, gaps in available months, true zero vs unavailable, exact-month solar generation and private metadata exclusion.

Implementation file: `scripts/production-smoke.mjs`.

**Validation:** GitHub Actions run [42593223015](https://github.com/pratheeshps/wattwise-agent/actions/runs/42593223015) passed regression tests (55 tests), production build and production API smoke checks.\n\n**Validation boundary:** CI uses a disposable synthetic PDF fixture; it does not prove extraction quality against the user's real electricity bills or validate live AI response quality. Real PDF and responsive visual acceptance remains a local manual check.

## 8. Acceptance criteria

- The first prominent dashboard content after the page heading is the selected month's energy/bill overview, not the upload form.
- Upload Bill remains visible in the dashboard header and in the no-data state.
- Month selector options are derived only from saved bill data and default to the latest available month.
- Selecting a month updates all month-dependent sections and the AI analysis scope.
- Historical months can be reviewed without uploading another bill.
- No unavailable metric is shown as zero or represented as actual data.
- Source-recorded, calculated and AI-interpreted information are distinguishable.
- Intelligent Analysis is prominent, useful, month-scoped and grounded in deterministic data.
- AI/provider errors do not block access to saved bill analytics.
- Existing bill upload review, correction, save, duplicate protection, history and delete behavior continue to work.
- No TypeScript is introduced; implementation remains JavaScript.

## 9. Out of scope for this branch

- Replacing local JSON/PDF persistence with a database or object storage.
- Authentication, multi-user support or tenant isolation.
- OCR for scanned PDFs.
- Automatic tariff lookup, weather correlation, appliance inference or unsupported savings estimates.
- Changes to the Solar page unless required to share month-selection/data helpers safely.

## 10. Risks and decisions to resolve during implementation

- **Multiple bills in one billing month:** decide whether they are duplicates, revisions or separate records before aggregation.
- **Generation source coverage:** source generation readings may not exist for every saved bill month; keep them unavailable where absent.
- **Historical comparisons:** compare against the previous available month, not a fabricated calendar month.
- **Analysis contract:** the current analysis panel sends a free-form goal only; month-scoped analysis requires a validated API/tool contract change.
- **Current summary semantics:** the existing dashboard totals all bills and uses fallback values. Replace this with selected-month, null-safe metrics rather than relabeling the all-time totals.

---

**Implementation order:** establish trustworthy month-scoped data first, then build the overview and charts, then connect Intelligent Analysis to the same selected-month context. This prevents the UI from presenting attractive but unsupported numbers.

## Sprint 0 implementation decisions

### Task 0.2 — Monthly analytics contract and utilities

- **Duplicate-month policy:** latest uploaded bill is the active record; older same-month records remain in history and are not aggregated.
- **Canonical month key:** `YYYY-MM`. Supported source formats are `Month YYYY`, `Mon YYYY`, `MM/YYYY` and `YYYY-MM`.
- **Month options:** derive only from valid saved bill records; sort newest first.
- **Previous month:** previous available saved billing month, even when calendar months are missing.
- **Metric contract:** each metric carries `value`, `unit`, `provenance` and `sourceField`. Missing values remain `null` and are marked `unavailable`; zero remains a valid source-recorded value.
- **Generation:** do not infer solar generation from bill import/export fields. It remains unavailable in the bill-only monthly view model.
- **Privacy:** monthly view models omit consumer identifiers and PDF/hash storage metadata.

Implementation files:

- `src/lib/monthlyAnalytics.js`
- `src/lib/monthlyAnalytics.test.js`
- `docs/MONTHLY-ANALYTICS-DATA-CONTRACT.md`

The helpers are pure and do not change bill persistence, upload, parser or deletion behavior.

### Task 0.3 — Solar generation month matching

- Extracted source-transcribed KSEB Solar Generation readings into src/lib/solarGeneration.js.
- Added canonical month matching through normalizeBillingMonth; source readings are exposed only for saved net-metered billing months.
- Added optional matched generation input to buildMonthlyAnalytics. The selected month's generation is source-recorded only when its month key matches exactly; unmatched months remain unavailable.
- Updated the Solar page to use the shared source module rather than a page-local array.
- Added tests for source values/provenance, supported month formats, missing months, net-metered bill filtering, duplicate months and chronological ordering.
- July 2026 remains without a generation record because the commissioning/conversion period has no comparable generator statement.

Implementation files: src/lib/solarGeneration.js, src/lib/solarGeneration.test.js, src/lib/monthlyAnalytics.js, src/lib/monthlyAnalytics.test.js, src/app/solar/page.js, docs/MONTHLY-ANALYTICS-DATA-CONTRACT.md.

Validation boundary: source values are tested as transcribed constants and matching behavior is unit-tested. No tracked local bill archive exists in the repository, so actual local archive reconciliation remains a user-environment validation step.

## Sprint 1 implementation record

**Status:** Implemented on `feature/analytics-first-dashboard`.

- Replaced all-time aggregate KPI cards with a selected-month overview.
- Added a billing-month selector derived only from valid saved bill records; defaults to the latest available month.
- Added monthly metrics for grid import, grid export, source-recorded solar generation, billed consumption, bill amount and net payable.
- Added loading, no-bills, unavailable-month and partial-data states. Missing values display as unavailable; true zero values remain visible.
- Moved PDF upload into a compact, collapsible action while retaining the existing preview, correction and save flow.
- Preserved bill history, pagination and delete behavior.
- Kept Intelligent Analysis visible as a first-class section. It continues to analyze all saved history until Stage 3 introduces validated month-scoped analysis.
- Solar generation is displayed only when the active bill for the selected month is net-metered and an explicit source generation record matches that month.

Files:

- `src/app/page.js`
- `src/app/globals.css`
- `src/lib/monthlyAnalytics.js`
- `src/lib/monthlyAnalytics.test.js`

## Sprint 2 implementation record

**Status:** Implemented on `feature/analytics-first-dashboard`.

- Added `buildEnergyPerformance` to construct chronological history from the latest-upload-wins active bill for each saved billing month.
- Kept grid import, grid export, solar generation and billed consumption as independent kWh series.
- Matched solar-generation readings only to the exact month of an active net-metered bill using the shared source-transcribed generation records.
- Added an SVG trend chart and a tabular data view; the chart omits unavailable readings and does not bridge a line across a missing value.
- Months without saved bills are not generated or interpolated. Duplicate same-month records are not summed.
- Added empty states for no bills and no recorded energy readings.
- Added unit tests for chronology, duplicate-month selection, true zero vs missing, exact solar matching and absent calendar months.

Implementation files:

- `src/lib/energyPerformance.js`
- `src/lib/energyPerformance.test.js`
- `src/components/dashboard/EnergyPerformance.js`
- `src/app/page.js`
- `src/app/globals.css`

Validation boundary: chart data is derived from saved bill fields and the existing explicit solar-generation source records. No tariff, weather, appliance, household-total-consumption or savings inference is introduced.

## Sprint 3 implementation record

**Status:** Implemented on `feature/analytics-first-dashboard`.

- Added `buildMonthScopedAnalysis`, a deterministic evidence packet for the selected month and previous available month. It selects the latest uploaded bill per month and never aggregates duplicates.
- The evidence packet includes source-recorded imported energy, exported energy, billed consumption, exact-month solar generation where a net-metered bill exists, bill amount and net payable.
- Absolute and percentage changes are calculated deterministically. Missing inputs remain unavailable; percentage change is unavailable when the comparison value is zero or a required value is missing.
- Added the `get_selected_month_analysis` agent tool. The agent is instructed to use this selected-month evidence rather than all-history analysis.
- The API validates canonical `YYYY-MM` input and verifies that the selected month exists in saved bills. It never silently falls back to all-history analysis.
- The analysis UI sends the selected month, displays the evidence period and comparison period, and clears stale reports when the user changes months.
- Moved Intelligent Analysis directly after Monthly Overview and Energy Performance; bill history follows it.
- Preserved custom prompts, report rendering, copy and rerun actions.

Implementation files:

- `src/lib/monthScopedAnalysis.js`
- `src/lib/monthScopedAnalysis.test.js`
- `src/lib/analysisRequest.js`
- `src/lib/analysisRequest.test.js`
- `src/tools.js`
- `src/agent.js`
- `src/app/api/analyze/route.js`
- `src/components/dashboard/AnalysisPanel.js`
- `src/app/page.js`
- `src/app/globals.css`

Validation boundary: numeric evidence comes from saved bill fields and explicit solar-generation source records. AI produces explanations only; it does not establish causes, household total consumption, tariff/weather effects or savings.

## Sprint 6 — Production readiness foundation

**Status:** Infrastructure foundation committed; API cutover and deployment verification remain pending.

- [x] Add PostgreSQL schema for Better Auth identities/sessions and user-owned bill records.
- [x] Add Prisma 7 PostgreSQL driver-adapter client and CLI configuration.
- [x] Add Better Auth email/password configuration with email verification and 12-character minimum passwords.
- [x] Add Better Auth App Router endpoint and server-side session guard helper.
- [x] Add user-scoped PostgreSQL bill persistence primitives with database-enforced per-user PDF deduplication.
- [x] Add private S3-compatible object storage helpers for upload, deletion and short-lived signed downloads.
- [x] Document required environment variables, migration rollout and production security acceptance criteria.
- [ ] Wire all bill, preview, delete, solar and analysis routes to authenticated user-scoped PostgreSQL storage.
- [ ] Add sign-in/sign-up UI and transactional email delivery.
- [ ] Add object upload rollback, authenticated download and user-isolation integration tests.
- [ ] Migrate legacy local JSON/PDF records to PostgreSQL and object storage with checksum/count verification.
- [ ] Run database migration, full CI, deployment smoke tests and restore verification against provisioned services.

**Completion boundary:** the current dashboard APIs still use the legacy local JSON/PDF store. The new PostgreSQL and S3 services are infrastructure primitives, not yet the active persistence path. Do not expose the current application publicly until the unchecked items are complete. See [Sprint 6 production readiness](SPRINT-6-PRODUCTION-READINESS.md).

## Sprint 6 implementation update

**Status:** Authenticated API cutover and account entry UI implemented; external-service deployment validation and legacy archive migration remain pending.

- [x] PostgreSQL / Prisma schema, migration and user-scoped bill persistence.
- [x] Better Auth session endpoints, email/password configuration and sign-in/sign-up page.
- [x] SMTP verification email delivery configuration; registration requires SMTP credentials.
- [x] Bill list, preview, upload, delete and AI analysis APIs require a valid session.
- [x] Bill records are scoped to the authenticated user; duplicate PDF detection is scoped per user.
- [x] PDF objects use private per-user object keys and upload rollback on database failure.
- [x] CI provisions PostgreSQL, applies migrations and checks unauthenticated API rejection.
- [ ] Configure production PostgreSQL, SMTP and private S3/R2 credentials.
- [ ] Execute an authenticated end-to-end upload, analysis and delete test against provisioned services.
- [ ] Migrate any existing local JSON/PDF records after the destination account is verified. No local archive is present in the repository, so this cannot be safely automated from repository content.
- [ ] Verify backups, restore, monitoring, rate limits and production deployment.
