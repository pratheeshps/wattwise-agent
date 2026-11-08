"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function normalizeReport(markdown) {
  return String(markdown || "")
    .replace(/\\\\?\$\\\\?rightarrow\\\\?\$/g, "→")
    .replace(/\\\\?rightarrow\\\\?/g, "→")
    .trim();
}

export default function AnalysisReport({ report }) {
  return (
    <article className="analysis-report-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h2 className="report-title">{children}</h2>,
          h2: ({ children }) => <h3 className="report-section-title">{children}</h3>,
          h3: ({ children }) => <h4 className="report-subsection-title">{children}</h4>,
          p: ({ children }) => <p className="report-paragraph">{children}</p>,
          table: ({ children }) => <div className="report-table-wrap"><table className="report-table">{children}</table></div>,
          thead: ({ children }) => <thead>{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          th: ({ children }) => <th>{children}</th>,
          td: ({ children }) => <td>{children}</td>,
          ul: ({ children }) => <ul className="report-list">{children}</ul>,
          ol: ({ children }) => <ol className="report-list report-ordered-list">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          blockquote: ({ children }) => <blockquote className="report-callout">{children}</blockquote>,
          hr: () => <hr className="report-divider" />,
          strong: ({ children }) => <strong>{children}</strong>,
          code: ({ children }) => <code className="report-inline-code">{children}</code>
        }}
      >
        {normalizeReport(report)}
      </ReactMarkdown>
    </article>
  );
}
