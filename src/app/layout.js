import "primereact/resources/themes/lara-light-green/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";
import "./globals.css";

import Providers from "../components/Providers";
import Header from "../components/layout/Header";

export const metadata = {
  title: {
    default: "Wattwise — Electricity insights",
    template: "%s | Wattwise"
  },
  description: "Understand your electricity and solar energy, one bill at a time.",
  applicationName: "Wattwise",
  themeColor: "#f4f7f3"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <div className="app-shell">
            <Header />
            {children}
            <footer className="app-footer">
              Wattwise <span aria-hidden="true">·</span> Your energy data stays in your local project storage.
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
