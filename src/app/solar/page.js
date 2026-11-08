import Link from "next/link";

export const metadata = {
  title: "Solar analytics"
};

export default function SolarPage() {
  return (
    <main className="page-content flex-1 pb-11">
      <section className="intro compact-intro">
        <p className="eyebrow">WATTWISE / SOLAR</p>
        <h1>Solar <em>analytics.</em></h1>
        <p className="subhead">
          The dedicated solar analytics route is established. Existing
          installation details, generation readings, grid exchange and bank
          balance views will be migrated in Sprint 3.
        </p>
      </section>
      <section className="foundation-panel solar-placeholder">
        <div className="solar-placeholder-icon"><i className="pi pi-sun" /></div>
        <h2>Solar analytics migration is next</h2>
        <p>
          This page intentionally contains no sample energy figures. It will
          display only values sourced from your saved bills and source documents.
        </p>
        <Link className="text-link" href="/">Return to dashboard <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}
