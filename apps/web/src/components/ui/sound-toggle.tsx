'use client';

import { mn } from '@/i18n/mn';
import { setSoundOn, useSoundOn } from '@/lib/sound';
import { IconButton } from './icon-button';
import { speaker, speakerOff } from './icon-data';

/** Mute toggle for the sound effects (§5). `defaultOn` holds until the first tap on this device. */
export function SoundToggle({ defaultOn }: { defaultOn: boolean }) {
  const on = useSoundOn(defaultOn);
  return (
    <IconButton
      icon={on ? speaker : speakerOff}
      label={mn.common.sound}
      aria-pressed={on}
      onClick={() => setSoundOn(!on)}
    />
  );
}
