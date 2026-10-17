import { COLORS } from '@/design/tokens';
import { INK, PAPER } from '../game/animals';
import { Bubble, Face } from '../game/mode-card';

/** Panel colour behind each step's drawing: ink lines always sit on a light, flat field. */
export const RULE_PANELS = ['bg-tsenher', 'bg-alt', 'bg-nogoon', 'bg-paper'] as const;

/**
 * The four /rules steps (§5.11), drawn like the avatars and mode cards: flat fills, 3-unit ink
 * lines, a 120×80 grid. Original, simple, and readable at 96px tall.
 */
export function RuleArt({ step, className }: { step: number; className?: string }) {
  return (
    <svg viewBox="0 0 120 80" aria-hidden className={className}>
      <g stroke={INK} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round">
        {step === 0 && <OpenRoom />}
        {step === 1 && <SecretCard />}
        {step === 2 && <OneWord />}
        {step === 3 && <VoteStamp />}
      </g>
    </svg>
  );
}

/** A phone showing a QR code, two friends about to scan it. */
function OpenRoom() {
  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width={10} height={10} fill={PAPER} strokeWidth={2.5} />
      <rect x={x + 3.5} y={y + 3.5} width={3} height={3} fill={INK} stroke="none" />
    </g>
  );
  return (
    <>
      <rect x={42} y={5} width={36} height={70} rx={6} fill={PAPER} />
      <rect x={47} y={14} width={26} height={26} fill={PAPER} strokeWidth={2} />
      {finder(48.5, 15.5)}
      {finder(60.5, 15.5)}
      {finder(48.5, 27.5)}
      <rect x={62} y={29} width={4} height={4} fill={INK} stroke="none" />
      <rect x={67} y={34} width={4} height={4} fill={INK} stroke="none" />
      <rect x={62} y={35} width={3} height={3} fill={INK} stroke="none" />
      <path d="M52 50H68M52 58H63" />
      <Face cx={19} cy={56} r={12} />
      <Face cx={101} cy={56} r={12} />
      <path d="M30 34Q34 30 38 32M90 32Q86 30 82 34" fill="none" />
    </>
  );
}

/** A face-down card and a thumb holding it: press to look, release to hide. */
function SecretCard() {
  return (
    <>
      <rect x={34} y={5} width={46} height={64} rx={6} fill={COLORS.tenger} />
      <text
        x={57}
        y={47}
        textAnchor="middle"
        fill={PAPER}
        stroke="none"
        className="font-display"
        style={{ fontSize: 34, fontWeight: 900 }}
      >
        ?
      </text>
      <ellipse cx={80} cy={64} rx={11} ry={14} fill={PAPER} />
      <path d="M73 57Q80 52 87 57" fill="none" strokeWidth={2.5} />
      <path d="M96 48L103 43M98 58H106M94 38L99 31" fill="none" />
    </>
  );
}

/** One face, one short word in the bubble. */
function OneWord() {
  return (
    <>
      <Face cx={34} cy={52} r={18} />
      <Bubble x={58} y={8} w={52} h={32} tail="left" />
      <rect x={68} y={21} width={32} height={6} rx={3} fill={INK} stroke="none" />
    </>
  );
}

/** Ballot slips on a pile and the rubber stamp coming down. */
function VoteStamp() {
  return (
    <>
      <rect x={12} y={58} width={40} height={12} rx={2} fill={PAPER} transform="rotate(-4 32 64)" />
      <rect x={14} y={47} width={40} height={12} rx={2} fill={PAPER} transform="rotate(5 34 53)" />
      <rect x={11} y={36} width={40} height={12} rx={2} fill={PAPER} transform="rotate(-3 31 42)" />
      <g transform="rotate(-9 86 40)">
        <rect
          x={62}
          y={24}
          width={48}
          height={32}
          rx={4}
          fill="none"
          stroke={COLORS.al}
          strokeWidth={4}
        />
        <rect
          x={67}
          y={29}
          width={38}
          height={22}
          rx={2}
          fill="none"
          stroke={COLORS.al}
          strokeWidth={2}
        />
        <text
          x={86}
          y={48}
          textAnchor="middle"
          fill={COLORS.al}
          stroke="none"
          className="font-display"
          style={{ fontSize: 22, fontWeight: 900 }}
        >
          !
        </text>
      </g>
    </>
  );
}
