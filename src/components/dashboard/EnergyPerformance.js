import { ENERGY_PERFORMANCE_SERIES } from "../../lib/energyPerformance.js";

const CHART = { width: 760, height: 270, left: 48, right: 18, top: 18, bottom: 48 };

function formatValue(value) {
  return value == null
    ? "—"
    : new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function chartSegments(points) {
  const segments = [];
  let current = [];
  points.forEach(point => {
    if (point.value == null) {
      if (current.length) segments.push(current);
      current = [];
    } else {
      current.push(point);
    }
  });
  if (current.length) segments.push(current);
  return segments;
}

function EnergyLineChart({ months, series, selectedMonth }) {
  const values = months.flatMap(month => series
    .map(item => month.metrics[item.key])
    .filter(value => value != null && Number.isFinite(Number(value))));
  if (!values.length) {
    return <div className="energy-chart-empty">No comparable energy readings are available in the saved bills yet.</div>;
  }

  const maxValue = Math.max(...values);
  const axisMax = maxValue === 0 ? 1 : Math.ceil(maxValue / 4) * 4;
  const plotWidth = CHART.width - CHART.left - CHART.right;
  const plotHeight = CHART.height - CHART.top - CHART.bottom;
  const x = index => months.length === 1
    ? CHART.left + plotWidth / 2
    : CHART.left + (index / (months.length - 1)) * plotWidth;
  const y = value => CHART.top + plotHeight - (Number(value) / axisMax) * plotHeight;
  const ticks = [0, 1, 2, 3, 4].map(index => axisMax * index / 4);

  return (
    <div className="energy-chart-scroll">
      <svg className="energy-performance-svg" viewBox={`0 0 ${CHART.width} ${CHART.height}`} role="img" aria-label="Historical monthly energy readings in kilowatt-hours">
        {ticks.map((tick, index) => {
          const tickY = y(tick);
          return (
            <g key={index}>
              <line x1={CHART.left} x2={CHART.width - CHART.right} y1={tickY} y2={tickY} className="energy-chart-gridline" />
              <text x={CHART.left - 9} y={tickY + 4} textAnchor="end" className="energy-chart-axis-label">{formatValue(tick)}</text>
            </g>
          );
        })}
        {series.map(item => {
          const points = months.map((month, index) => ({
            x: x(index),
            y: month.metrics[item.key] == null ? null : y(month.metrics[item.key]),
            value: month.metrics[item.key],
            label: month.label,
            monthKey: month.monthKey
          }));
          return (
            <g key={item.key}>
              {chartSegments(points).map((segment, segmentIndex) => segment.length > 1 && (
                <polyline
                  key={segmentIndex}
                  points={segment.map(point => `${point.x},${point.y}`).join(" ")}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {points.filter(point => point.value != null).map((point, pointIndex) => (
                <g key={`${item.key}-${pointIndex}`}>
                  {point.monthKey === selectedMonth && <circle cx={point.x} cy={point.y} r="8" fill="none" stroke="#24352c" strokeWidth="1.5" />}
                  <circle cx={point.x} cy={point.y} r="4.5" fill={item.color} stroke="#fff" strokeWidth="2">
                  <title>{`${point.label}: ${item.label} ${formatValue(point.value)} kWh`}</title>
                  </circle>
                </g>
              ))}
            </g>
          );
        })}
        {months.map((month, index) => (
          <text key={month.monthKey} x={x(index)} y={CHART.height - 17} textAnchor="middle" className={month.monthKey === selectedMonth ? "energy-chart-axis-label energy-chart-axis-label-selected" : "energy-chart-axis-label"}>{month.shortLabel}</text>
        ))}
      </svg>
    </div>
  );
}

export default function EnergyPerformance({ months = [], selectedMonth = null }) {
  const availableSeries = ENERGY_PERFORMANCE_SERIES.filter(series =>
    months.some(month => month.metrics[series.key] != null)
  );

  return (
    <section className="energy-performance-section" aria-labelledby="energy-performance-heading">
      <div className="energy-performance-heading">
        <div>
          <p className="eyebrow">02 / TRACK</p>
          <h2 id="energy-performance-heading">Energy performance</h2>
          <p>Historical readings from the latest saved bill for each available billing month.</p>
        </div>
        <span className="energy-period-count">{months.length} {months.length === 1 ? "month" : "months"}</span>
      </div>

      {!months.length ? (
        <div className="energy-chart-empty">Upload and save a bill to start building your energy history.</div>
      ) : (
        <>
          <div className="energy-chart-card">
            <div className="energy-chart-card-heading">
              <div>
                <h3>Monthly energy readings</h3>
                <p>kWh · Only saved billing months are plotted</p>
              </div>
              <div className="energy-chart-legend" aria-label="Chart series">
                {availableSeries.map(series => (
                  <span key={series.key}><i style={{ background: series.color }} />{series.label}</span>
                ))}
              </div>
            </div>
            <EnergyLineChart months={months} series={availableSeries} selectedMonth={selectedMonth} />
            {!availableSeries.length && <p className="energy-chart-footnote">No energy readings are recorded in these bills. The chart will appear when supported values are available.</p>}
          </div>

          <div className="energy-data-table-wrap">
            <table className="energy-data-table">
              <thead>
                <tr>
                  <th scope="col">Billing month</th>
                  <th scope="col">Grid import</th>
                  <th scope="col">Grid export</th>
                  <th scope="col">Solar generation</th>
                  <th scope="col">Billed consumption</th>
                </tr>
              </thead>
              <tbody>
                {months.map(month => (
                  <tr key={month.monthKey}>
                    <th scope="row">{month.label}</th>
                    {ENERGY_PERFORMANCE_SERIES.map(series => (
                      <td key={series.key}>{formatValue(month.metrics[series.key])}{month.metrics[series.key] != null ? " kWh" : ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="energy-chart-footnote">Each series represents a distinct bill field or matched source-generation reading. A dash means that month has no recorded value; it is not treated as zero. Months without saved bills are not added to the chart.</p>
        </>
      )}
    </section>
  );
}
