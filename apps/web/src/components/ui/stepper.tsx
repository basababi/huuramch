'use client';

import { mn } from '@/i18n/mn';
import { IconButton } from './icon-button';
import { minus, plus } from './icon-data';

type StepperProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

export function Stepper({ label, value, min, max, onChange }: StepperProps) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-3">
      <IconButton
        icon={minus}
        label={`${label}: ${mn.settings.decrease}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      />
      <output
        aria-live="polite"
        className="min-w-12 text-center font-display tabular text-[2rem] leading-none font-extrabold"
      >
        {value}
      </output>
      <IconButton
        icon={plus}
        label={`${label}: ${mn.settings.increase}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      />
    </div>
  );
}
