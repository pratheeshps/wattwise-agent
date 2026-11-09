'use client';

import { Button } from 'primereact/button';

export default function PrimaryButton({ label, icon = 'pi pi-arrow-up-right', ...props }) {
  return (
    <Button
      label={label}
      icon={icon}
      iconPos="right"
      className="wattwise-primary-button"
      {...props}
    />
  );
}
