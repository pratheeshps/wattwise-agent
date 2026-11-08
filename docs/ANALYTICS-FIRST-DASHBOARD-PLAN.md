# Analytics-First Dashboard — Product & Implementation Plan

**Status:** Planned  
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
- Move upload out of the primary page flow.
- Add compact header upload action and contextual upload entry points.
- Introduce selected-month state and month selector.
- Add a monthly overview that defaults to the latest available month.
- Implement truthful empty, loading and partial-data states.

### Stage 2 — Energy performance
- Add historical visualizations for fields that are actually available.
- Keep import, export, generation and billed consumption separate.
- Label source and period; handle missing months without fabricated points.
- Reuse existing chart conventions where practical.

### Stage 3 — Intelligent Analysis integration
- Make analysis a prominent section directly after the overview/performance content.
- Scope analysis to the selected month and previous available month.
- Update request validation and deterministic tool context.
- Render evidence period, findings, limitations and next steps.
- Preserve custom prompts, report rendering, copy and rerun actions.

### Stage 4 — Monthly history and interaction polish
- Make historical month navigation easy from the overview/history section.
- Ensure month selection updates all sections consistently.
- Preserve bill detail and delete actions.
- Refine responsive behavior, accessibility, keyboard operation and visual hierarchy.

### Stage 5 — Regression and acceptance
- Add unit tests for month selection, month normalization, missing values, duplicate months and previous-available-month selection.
- Add API tests for month-scoped analysis and invalid/unavailable month requests.
- Add component/interaction tests for selector, empty states, upload action and AI states.
- Run `npm test`, `npm run build` and `npm run test:smoke`.
- Manually verify representative standard and net-metered PDFs, multiple billing months, missing solar fields, AI provider success/failure and mobile/desktop layouts.

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
