import PrimaryButton from "../components/common/PrimaryButton";

const setupItems = [
  {
    number: "01",
    title: "Bill upload and review",
    description: "PDF preview, field extraction and editable review form."
  },
  {
    number: "02",
    title: "Monthly bill history",
    description: "Latest-month-first history, summary metrics and bill deletion."
  },
  {
    number: "03",
    title: "AI-powered analysis",
    description: "Deterministic monthly comparisons with an AI-generated report."
  }
];

export default function DashboardPage() {
  return (
    <main className="page-content flex-1 pb-11">
      <section className="intro flex flex-col">
        <p className="eyebrow">ENERGY, MADE CLEAR</p>
        <h1>
          Understand your electricity,
          <br />
          <em>one bill at a time.</em>
        </h1>
        <p className="subhead">
          Your Wattwise Next.js foundation is ready. The existing bill workflows
          will be migrated in focused, testable steps.
        </p>
        <div className="intro-actions flex flex-wrap items-center gap-4">
          <PrimaryButton label="Sprint 0 foundation ready" icon="pi pi-check" disabled />
          <span className="status-note">
            <span className="status-dot" /> Next.js App Router
          </span>
        </div>
      </section>

      <section className="foundation-panel">
        <div className="section-heading">
          <div>
            <p className="eyebrow">MIGRATION / SPRINT 0</p>
            <h2>Application foundation</h2>
          </div>
          <span className="step-pill">In progress</span>
        </div>
        <p className="foundation-copy">
          The new application shell, design tokens, Tailwind CSS and PrimeReact
          v9 are configured. Existing Express services and local bill data have
          been retained while their Next.js equivalents are built.
        </p>
        <div className="setup-grid grid grid-cols-1 gap-3 md:grid-cols-3">
          {setupItems.map((item) => (
            <article className="setup-card" key={item.number}>
              <span className="setup-number">{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="migration-note" aria-labelledby="migration-note-title">
        <div className="migration-icon" aria-hidden="true">
          <i className="pi pi-sparkles" />
        </div>
        <div>
          <p className="eyebrow">PRESERVING YOUR EXISTING WORK</p>
          <h2 id="migration-note-title">No bill data migration in Sprint 0</h2>
          <p>
            The local JSON store, uploaded PDFs, PDF parser and AI agent remain
            in the repository. Their behaviour will be connected to Next.js
            Route Handlers in the following sprints.
          </p>
        </div>
      </section>
    </main>
  );
}
