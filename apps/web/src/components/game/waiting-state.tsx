import type { AnimalId } from './animals';
import { Avatar } from './avatar';

/** Every waiting state says what is happening and who we are waiting for (§5). */
export function WaitingState({
  animal,
  color,
  title,
  detail,
}: {
  animal: AnimalId;
  color: string;
  title: string;
  detail: string;
}) {
  return (
    <div role="status" className="flex flex-col items-center gap-4 text-center">
      <Avatar animal={animal} color={color} size={112} idle />
      <p className="font-display text-[1.375rem] leading-tight font-extrabold">{title}</p>
      <p className="max-w-[18rem] text-base font-medium text-fg-muted">{detail}</p>
    </div>
  );
}
