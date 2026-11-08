"use client";

import { PrimeReactProvider } from "primereact/api";

export default function Providers({ children }) {
  return (
    <PrimeReactProvider value={{ ripple: true }}>
      {children}
    </PrimeReactProvider>
  );
}
