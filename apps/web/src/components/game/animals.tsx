import type { ReactNode } from 'react';
import { COLORS } from '@/design/tokens';

/**
 * Twelve original animal heads on one construction grid (§6.6):
 * 64×64 viewBox, face centred on x=32, eye line y≈29–31, every outline 3 units of ink,
 * flat fills in paper and ink (plus yellow beaks) — the seat colour behind them does the rest.
 * Each head is drawn back-to-front: body, ears/horns, head, markings, eyes.
 */
export const ANIMAL_IDS = [
  'temee',
  'mori',
  'khoni',
  'yamaa',
  'ukher',
  'sarlag',
  'uneg',
  'chono',
  'tarvaga',
  'irves',
  'shonkhor',
  'burged',
] as const;

export type AnimalId = (typeof ANIMAL_IDS)[number];

export const INK = COLORS.ink;
export const PAPER = COLORS.paper;
/** Birds of prey get the one extra fill: --alt for beak and eye-ring. */
const BEAK = COLORS.alt;

type ArtProps = { dead: boolean };

/** An eye that turns into an X when the player is eliminated. `children` = custom eye shape. */
function Eye({
  x,
  y,
  r = 2.6,
  color = INK,
  dead,
  children,
}: {
  x: number;
  y: number;
  r?: number;
  color?: string;
  dead: boolean;
  children?: ReactNode;
}) {
  if (dead) {
    const d = 2.4;
    return (
      <path
        d={`M${x - d} ${y - d}L${x + d} ${y + d}M${x + d} ${y - d}L${x - d} ${y + d}`}
        stroke={color}
        strokeWidth={2.4}
        fill="none"
      />
    );
  }
  return (
    <g className="k-eye">{children ?? <circle cx={x} cy={y} r={r} fill={color} stroke="none" />}</g>
  );
}

const shoulders = (fill: string, top = 50) => (
  <path d={`M4 70C4 ${top + 6} 15 ${top} 32 ${top}C49 ${top} 60 ${top + 6} 60 70Z`} fill={fill} />
);

/**
 * The camel is the one profile in the set: from the front a camel reads as a horse or a llama,
 * while the two-humped silhouette is unmistakably a Bactrian camel. Same stroke, same fills.
 */
function Temee({ dead }: ArtProps) {
  return (
    <>
      {/* body with two humps */}
      <path
        d="M17 70C17 58 20 51 26 48C27 40 30.5 34.5 35 34.5C39.5 34.5 41 39 42 42.5C43 39 45.5 34.5 50 34.5C55 34.5 58 40 58.5 48C59 56 57 63 55 70Z"
        fill={PAPER}
      />
      {/* neck */}
      <path
        d="M28.5 50C26.5 42.5 24.5 36.5 23 30L15.5 31.5C16.5 38.5 18.5 45.5 19.5 52Z"
        fill={PAPER}
      />
      <path d="M22 17.2L23.5 12.4L26.4 17Z" fill={PAPER} />
      {/* head in profile, muzzle to the left */}
      <path
        d="M26 22C26 18 23 15.8 19 16.4L10.5 18.6C7 19.5 5.2 22 5.2 25C5.2 28 7 30.2 10 30.8L18.5 32.4C22.5 33 26 29.6 26 25.6Z"
        fill={PAPER}
      />
      <path d="M8.5 22.6L10.8 21.8M6 27.2L10.8 27.8" fill="none" strokeWidth={2.2} />
      <Eye x={18.6} y={22.6} r={2.4} dead={dead} />
    </>
  );
}

function Mori({ dead }: ArtProps) {
  return (
    <>
      <path d="M23 50L20 70H44L41 50Z" fill={PAPER} />
      {/* mane falling down the neck */}
      <path d="M38.5 48L44 70H48.5L43 47Z" fill={INK} />
      <path d="M21.5 22L19.5 6.5L30 15.5Z" fill={PAPER} />
      <path d="M42.5 22L44.5 6.5L34 15.5Z" fill={PAPER} />
      <path
        d="M32 14C40.5 14 44 18.5 44 25.5C44 33 41.5 37 41.5 42C44.5 44.5 45.5 48 45.5 51.5C45.5 57.5 39.5 60.5 32 60.5C24.5 60.5 18.5 57.5 18.5 51.5C18.5 48 19.5 44.5 22.5 42C22.5 37 20 33 20 25.5C20 18.5 23.5 14 32 14Z"
        fill={PAPER}
      />
      {/* forelock */}
      <path
        d="M25.5 16.5L28.5 25L32 19.5L35.5 25L38.5 16.5C35 13.5 29 13.5 25.5 16.5Z"
        fill={INK}
      />
      <path d="M22.5 46C27 43.5 37 43.5 41.5 46" fill="none" />
      <ellipse cx="27.5" cy="52.5" rx="1.9" ry="2.7" fill={INK} stroke="none" />
      <ellipse cx="36.5" cy="52.5" rx="1.9" ry="2.7" fill={INK} stroke="none" />
      <Eye x={25.5} y={31} dead={dead} />
      <Eye x={38.5} y={31} dead={dead} />
    </>
  );
}

function Khoni({ dead }: ArtProps) {
  return (
    <>
      {/* woolly body */}
      <path
        d="M6 70C3 60 9 53 15 55C16 49 23 47 27 51C29 47.5 35 47.5 37 51C41 47 48 49 49 55C55 53 61 60 58 70Z"
        fill={PAPER}
      />
      <ellipse cx="16.5" cy="31" rx="6.5" ry="3.2" transform="rotate(18 16.5 31)" fill={INK} />
      <ellipse cx="47.5" cy="31" rx="6.5" ry="3.2" transform="rotate(-18 47.5 31)" fill={INK} />
      {/* the black face of a Mongolian sheep */}
      <path
        d="M32 19C39.5 19 43 24.5 43 31.5C43 41 38.5 50.5 32 50.5C25.5 50.5 21 41 21 31.5C21 24.5 24.5 19 32 19Z"
        fill={INK}
      />
      <circle cx="24.5" cy="21" r="5.5" fill={PAPER} />
      <circle cx="39.5" cy="21" r="5.5" fill={PAPER} />
      <circle cx="32" cy="17.5" r="6.5" fill={PAPER} />
      <Eye x={27} y={32} r={2.4} color={PAPER} dead={dead} />
      <Eye x={37} y={32} r={2.4} color={PAPER} dead={dead} />
      <path d="M29 43.5C30.8 45.2 33.2 45.2 35 43.5" stroke={PAPER} strokeWidth={2} fill="none" />
    </>
  );
}

function Yamaa({ dead }: ArtProps) {
  return (
    <>
      {/* shoulders sit low so the beard hangs against the background */}
      {shoulders(PAPER, 57)}
      <path d="M27 18C25.5 11 21.5 6.5 15.5 5.5C19 9 21 13 22 19.5Z" fill={INK} />
      <path d="M37 18C38.5 11 42.5 6.5 48.5 5.5C45 9 43 13 42 19.5Z" fill={INK} />
      <ellipse cx="16.5" cy="29.5" rx="6.5" ry="3" transform="rotate(24 16.5 29.5)" fill={PAPER} />
      <ellipse cx="47.5" cy="29.5" rx="6.5" ry="3" transform="rotate(-24 47.5 29.5)" fill={PAPER} />
      <path
        d="M32 15.5C38.5 15.5 42 20 42 26.5C42 35 39 43 36 48.5C34.5 51.5 29.5 51.5 28 48.5C25 43 22 35 22 26.5C22 20 25.5 15.5 32 15.5Z"
        fill={PAPER}
      />
      {/* beard */}
      <path d="M28.5 48.5L32 61L35.5 48.5Z" fill={INK} />
      <Eye x={27} y={29} dead={dead}>
        <ellipse cx="27" cy="29" rx="3" ry="2" fill={INK} stroke="none" />
      </Eye>
      <Eye x={37} y={29} dead={dead}>
        <ellipse cx="37" cy="29" rx="3" ry="2" fill={INK} stroke="none" />
      </Eye>
      <circle cx="29.5" cy="44" r="1.3" fill={INK} stroke="none" />
      <circle cx="34.5" cy="44" r="1.3" fill={INK} stroke="none" />
    </>
  );
}

function Ukher({ dead }: ArtProps) {
  return (
    <>
      {shoulders(PAPER, 50)}
      <path d="M20.5 21.5C14.5 21.5 10 18.5 9 12.5C13 15 17 15.5 21.5 15Z" fill={PAPER} />
      <path d="M43.5 21.5C49.5 21.5 54 18.5 55 12.5C51 15 47 15.5 42.5 15Z" fill={PAPER} />
      <ellipse cx="14" cy="27" rx="6" ry="3.2" transform="rotate(12 14 27)" fill={PAPER} />
      <ellipse cx="50" cy="27" rx="6" ry="3.2" transform="rotate(-12 50 27)" fill={PAPER} />
      <path
        d="M32 13.5C42 13.5 46 18.5 46 25.5C46 32 44 36.5 44 41H20C20 36.5 18 32 18 25.5C18 18.5 22 13.5 32 13.5Z"
        fill={PAPER}
      />
      {/* patch */}
      <path
        d="M20.5 22C22.5 17 30 16.5 31 21.5C32 26.5 28.5 31 23.5 30.5C20 30 19.5 25.5 20.5 22Z"
        fill={INK}
      />
      <rect x="19" y="37" width="26" height="19" rx="9.5" fill={PAPER} />
      <Eye x={25.5} y={26} r={2.4} color={PAPER} dead={dead} />
      <Eye x={38.5} y={26} dead={dead} />
      <ellipse cx="27" cy="45.5" rx="2" ry="2.7" fill={INK} stroke="none" />
      <ellipse cx="37" cy="45.5" rx="2" ry="2.7" fill={INK} stroke="none" />
      <path d="M28 51.5C30.5 53 33.5 53 36 51.5" fill="none" />
    </>
  );
}

function Sarlag({ dead }: ArtProps) {
  return (
    <>
      {shoulders(INK, 46)}
      {/* wide horns sweeping up */}
      <path d="M19.5 25C11 24 6.5 18 7.5 8.5C10.5 14 15 17 21 18Z" fill={PAPER} />
      <path d="M44.5 25C53 24 57.5 18 56.5 8.5C53.5 14 49 17 43 18Z" fill={PAPER} />
      <path
        d="M32 15C41 15 46 21 46 29C46 37 43.5 43.5 40.5 48H23.5C20.5 43.5 18 37 18 29C18 21 23 15 32 15Z"
        fill={INK}
      />
      {/* shaggy fringe */}
      <path
        d="M19.5 40L16.5 49.5L21.5 47L23 54.5L27.5 49.5L32 56.5L36.5 49.5L41 54.5L42.5 47L47.5 49.5L44.5 40Z"
        fill={INK}
      />
      <path
        d="M27.5 19.5L26.5 24.5M32 18.5V24M36.5 19.5L37.5 24.5"
        stroke={PAPER}
        strokeWidth={2}
        fill="none"
      />
      <rect x="24" y="37" width="16" height="10.5" rx="5.25" fill={PAPER} />
      <ellipse cx="28.5" cy="42.25" rx="1.7" ry="2.2" fill={INK} stroke="none" />
      <ellipse cx="35.5" cy="42.25" rx="1.7" ry="2.2" fill={INK} stroke="none" />
      <Eye x={26} y={30.5} r={2.4} color={PAPER} dead={dead} />
      <Eye x={38} y={30.5} r={2.4} color={PAPER} dead={dead} />
    </>
  );
}

function Uneg({ dead }: ArtProps) {
  return (
    <>
      {shoulders(PAPER, 50)}
      <path d="M15.5 28L16 5.5L30 17.5Z" fill={PAPER} />
      <path d="M48.5 28L48 5.5L34 17.5Z" fill={PAPER} />
      <path d="M19 21L19.3 12L25.5 17.3Z" fill={INK} stroke="none" />
      <path d="M45 21L44.7 12L38.5 17.3Z" fill={INK} stroke="none" />
      {/* pointed face with cheek tufts */}
      <path
        d="M32 14C41.5 14 47.5 19.5 48.5 27.5L54.5 35.5L46.5 37.5C43.5 44.5 37.5 50.5 32 53.5C26.5 50.5 20.5 44.5 17.5 37.5L9.5 35.5L15.5 27.5C16.5 19.5 22.5 14 32 14Z"
        fill={PAPER}
      />
      <Eye x={26} y={30} dead={dead}>
        <path
          d="M22 30C23.8 27.3 27.8 27.2 30 30.3C27.4 31.8 24.4 31.8 22 30Z"
          fill={INK}
          stroke="none"
        />
      </Eye>
      <Eye x={38} y={30} dead={dead}>
        <path
          d="M42 30C40.2 27.3 36.2 27.2 34 30.3C36.6 31.8 39.6 31.8 42 30Z"
          fill={INK}
          stroke="none"
        />
      </Eye>
      <ellipse cx="32" cy="49" rx="3.2" ry="2.3" fill={INK} stroke="none" />
    </>
  );
}

function Chono({ dead }: ArtProps) {
  return (
    <>
      {shoulders(INK, 48)}
      <path d="M24 49L32 62L40 49Z" fill={PAPER} />
      <path d="M16.5 25L16.5 6.5L29 15Z" fill={INK} />
      <path d="M47.5 25L47.5 6.5L35 15Z" fill={INK} />
      <path d="M19.5 19L19.5 11.5L24.8 15.2Z" fill={PAPER} stroke="none" />
      <path d="M44.5 19L44.5 11.5L39.2 15.2Z" fill={PAPER} stroke="none" />
      <path
        d="M32 12.5C43 12.5 49 19.5 49 28.5C49 34 47 38 44 41L39.5 52H24.5L20 41C17 38 15 34 15 28.5C15 19.5 21 12.5 32 12.5Z"
        fill={INK}
      />
      {/* pale mask */}
      <path
        d="M22.5 33.5C26 31.5 29.5 33 32 37C34.5 33 38 31.5 41.5 33.5C42.5 40 39.5 47.5 36.5 52H27.5C24.5 47.5 21.5 40 22.5 33.5Z"
        fill={PAPER}
      />
      <Eye x={25} y={29} color={PAPER} dead={dead}>
        <path
          d="M21 27L29 28.5C28.3 30.6 26.8 31.6 25 31.4C23 31.2 21.6 29.6 21 27Z"
          fill={PAPER}
          stroke="none"
        />
        <circle cx="25.6" cy="29.4" r="1.2" fill={INK} stroke="none" />
      </Eye>
      <Eye x={39} y={29} color={PAPER} dead={dead}>
        <path
          d="M43 27L35 28.5C35.7 30.6 37.2 31.6 39 31.4C41 31.2 42.4 29.6 43 27Z"
          fill={PAPER}
          stroke="none"
        />
        <circle cx="38.4" cy="29.4" r="1.2" fill={INK} stroke="none" />
      </Eye>
      <ellipse cx="32" cy="43" rx="3.5" ry="2.6" fill={INK} stroke="none" />
      <path
        d="M32 45.5V48.5M28.5 49.5C30.2 50.8 33.8 50.8 35.5 49.5"
        fill="none"
        strokeWidth={2.4}
      />
    </>
  );
}

function Tarvaga({ dead }: ArtProps) {
  return (
    <>
      {shoulders(PAPER, 46)}
      <circle cx="20.5" cy="18.5" r="4.5" fill={PAPER} />
      <circle cx="43.5" cy="18.5" r="4.5" fill={PAPER} />
      <circle cx="20.5" cy="18.5" r="1.6" fill={INK} stroke="none" />
      <circle cx="43.5" cy="18.5" r="1.6" fill={INK} stroke="none" />
      <path
        d="M32 16.5C41.5 16.5 47.5 22.5 47.5 31C47.5 39.5 41 45.5 32 45.5C23 45.5 16.5 39.5 16.5 31C16.5 22.5 22.5 16.5 32 16.5Z"
        fill={PAPER}
      />
      {/* the dark crown of a Mongolian marmot */}
      <path
        d="M17.6 26C18.6 20.4 24.4 17 32 17C39.6 17 45.4 20.4 46.4 26C40.5 23.4 23.5 23.4 17.6 26Z"
        fill={INK}
        stroke="none"
      />
      <path
        d="M13.5 35L22 36M14 39.5L22 38.5M50.5 35L42 36M50 39.5L42 38.5"
        fill="none"
        strokeWidth={2}
      />
      <ellipse cx="32" cy="36" rx="7.5" ry="5.2" fill={PAPER} />
      <path d="M29.6 33.2H34.4L32 35.8Z" fill={INK} />
      {/* buck teeth */}
      <rect x="28.8" y="40.5" width="6.4" height="5.5" rx="1" fill={PAPER} strokeWidth={2.5} />
      <path d="M32 40.5V46" strokeWidth={2} />
      <Eye x={25.5} y={27.5} r={2.5} dead={dead} />
      <Eye x={38.5} y={27.5} r={2.5} dead={dead} />
    </>
  );
}

function Irves({ dead }: ArtProps) {
  return (
    <>
      {shoulders(PAPER, 49)}
      <circle cx="21" cy="58" r="1.8" fill="none" strokeWidth={2} />
      <circle cx="43" cy="58" r="1.8" fill="none" strokeWidth={2} />
      <circle cx="19" cy="17.5" r="6" fill={PAPER} />
      <circle cx="45" cy="17.5" r="6" fill={PAPER} />
      <circle cx="19" cy="17.5" r="2.4" fill={INK} stroke="none" />
      <circle cx="45" cy="17.5" r="2.4" fill={INK} stroke="none" />
      <path
        d="M32 13C43 13 50 20.5 50 30.5C50 41.5 42 49.5 32 49.5C22 49.5 14 41.5 14 30.5C14 20.5 21 13 32 13Z"
        fill={PAPER}
      />
      {/* spots */}
      <g fill={INK} stroke="none">
        <circle cx="28.5" cy="18.5" r="1.5" />
        <circle cx="35.5" cy="18.5" r="1.5" />
        <circle cx="32" cy="21.5" r="1.3" />
        <circle cx="19.5" cy="34.5" r="1.6" />
        <circle cx="22" cy="24" r="1.3" />
        <circle cx="44.5" cy="34.5" r="1.6" />
        <circle cx="42" cy="24" r="1.3" />
      </g>
      <Eye x={26} y={29} dead={dead}>
        <path
          d="M22.3 29C23.8 26.6 28.2 26.6 29.7 29C28.2 31.4 23.8 31.4 22.3 29Z"
          fill={INK}
          stroke="none"
        />
      </Eye>
      <Eye x={38} y={29} dead={dead}>
        <path
          d="M34.3 29C35.8 26.6 40.2 26.6 41.7 29C40.2 31.4 35.8 31.4 34.3 29Z"
          fill={INK}
          stroke="none"
        />
      </Eye>
      <path d="M28.8 35.5H35.2L32 39Z" fill={INK} />
      <path
        d="M32 39V41.5M27.8 42.8C29.6 44.3 31.2 43.8 32 41.5C32.8 43.8 34.4 44.3 36.2 42.8"
        fill="none"
        strokeWidth={2.2}
      />
      <path
        d="M12.5 37.5L22 38.5M13 43L22 41.5M51.5 37.5L42 38.5M51 43L42 41.5"
        fill="none"
        strokeWidth={2}
      />
    </>
  );
}

/** Saker falcon (итгэлт шонхор): pale head, fierce brow, dark "moustache" stripes. */
function Shonkhor({ dead }: ArtProps) {
  return (
    <>
      {/* barred chest */}
      {shoulders(PAPER, 48)}
      <path
        d="M22 56L24.5 58.5L27 56M30 59L32 61.5L34 59M37 56L39.5 58.5L42 56"
        fill="none"
        strokeWidth={2.2}
      />
      <circle cx="32" cy="30" r="16" fill={PAPER} />
      {/* crown streaks */}
      <path d="M28 17.6L29 21M32 16.6V20.6M36 17.6L35 21" fill="none" strokeWidth={2} />
      {/* moustache stripes */}
      <path
        d="M21.4 31.5C19.8 35.2 20.2 39 22.4 41.6C24.6 39 25 35.2 24.2 31.5Z"
        fill={INK}
        stroke="none"
      />
      <path
        d="M42.6 31.5C44.2 35.2 43.8 39 41.6 41.6C39.4 39 39 35.2 39.8 31.5Z"
        fill={INK}
        stroke="none"
      />
      <Eye x={24.5} y={28.5} dead={dead}>
        <circle cx="24.5" cy="28.5" r="3.6" fill={BEAK} stroke="none" />
        <circle cx="24.5" cy="28.5" r="2.3" fill={INK} stroke="none" />
      </Eye>
      <Eye x={39.5} y={28.5} dead={dead}>
        <circle cx="39.5" cy="28.5" r="3.6" fill={BEAK} stroke="none" />
        <circle cx="39.5" cy="28.5" r="2.3" fill={INK} stroke="none" />
      </Eye>
      {/* brow ridges: the raptor scowl */}
      <path d="M19.2 23.6L28.6 25.8M44.8 23.6L35.4 25.8" fill="none" strokeWidth={3} />
      {/* hooked beak */}
      <path
        d="M28 30.5C28.9 28.2 35.1 28.2 36 30.5C36.5 35.4 34.8 39.8 31.2 42.4C31.7 40.2 30.8 38.4 29.3 37C28.1 35.6 27.7 32.8 28 30.5Z"
        fill={BEAK}
      />
    </>
  );
}

function Burged({ dead }: ArtProps) {
  return (
    <>
      {shoulders(INK, 48)}
      {/* dark head, feathers swept back */}
      <path
        d="M32 12C41.5 12 47.5 18 48 26L54.5 29.5L47.5 32.5C46 41 40 46.5 32 46.5C24 46.5 18 41 16.5 32.5L9.5 29.5L16 26C16.5 18 22.5 12 32 12Z"
        fill={INK}
      />
      {/* golden nape */}
      <path
        d="M24.5 15.5L26.8 20.5M32 13.8V19.5M39.5 15.5L37.2 20.5"
        stroke={BEAK}
        strokeWidth={2.2}
        fill="none"
      />
      {/* big hooked beak */}
      <path
        d="M25 31.5C26 28 38 28 39 31.5C40 38 37.5 45.5 31 50.5C31.5 46.5 30 43.5 27.5 41.5C25.3 39.6 24.6 35.5 25 31.5Z"
        fill={BEAK}
      />
      <path d="M27.5 38C30 39.2 33.5 39.4 36.6 38" fill="none" strokeWidth={2.2} />
      <Eye x={25} y={30} color={PAPER} dead={dead}>
        <path
          d="M20.5 27L29.5 29.2C29.5 32 27.5 33.6 25.2 33.6C22.6 33.6 20.8 31 20.5 27Z"
          fill={PAPER}
          stroke="none"
        />
        <circle cx="25.6" cy="30.6" r="1.6" fill={INK} stroke="none" />
      </Eye>
      <Eye x={39} y={30} color={PAPER} dead={dead}>
        <path
          d="M43.5 27L34.5 29.2C34.5 32 36.5 33.6 38.8 33.6C41.4 33.6 43.2 31 43.5 27Z"
          fill={PAPER}
          stroke="none"
        />
        <circle cx="38.4" cy="30.6" r="1.6" fill={INK} stroke="none" />
      </Eye>
    </>
  );
}

export const ANIMAL_ART: Record<AnimalId, (props: ArtProps) => ReactNode> = {
  temee: Temee,
  mori: Mori,
  khoni: Khoni,
  yamaa: Yamaa,
  ukher: Ukher,
  sarlag: Sarlag,
  uneg: Uneg,
  chono: Chono,
  tarvaga: Tarvaga,
  irves: Irves,
  shonkhor: Shonkhor,
  burged: Burged,
};
