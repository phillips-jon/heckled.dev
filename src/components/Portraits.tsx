import type { RoasterId } from "@/lib/roasters";

// The four roasters as flat character portraits: filled shapes with one bold
// outline, like stickers, so they hold up on the dark sheet and the light one.
// Drawn on a 200 grid, bust framed from the shoulders up. One shared palette
// keeps them a set; each gets one prop in the accent colour.

const O = "#0b0b0c"; // outline
const SKIN = "#f2d3bb";
const SKIN_SHADE = "#dfb291";
const CHEEK = "#eaa58a";
const WHITE = "#f7f7f8";
const ACCENT = "#ff6a3d";

const o = { stroke: O, strokeWidth: 3.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
const thin = { ...o, strokeWidth: 2.5 };
const none = { fill: "none" };

function Vc() {
  const hair = "#26262b";
  return (
    <>
      {/* the back of a sleek, expensive bob */}
      <path d="M58 96c-3-36 15-58 42-58s45 22 42 58c-1 14 2 26 7 36-12 5-26 3-33-4l-2-28H86l-2 28c-7 7-21 9-33 4 5-10 8-22 7-36z" fill={hair} {...o} />
      {/* blazer over a silk top */}
      <path d="M26 202c4-34 30-52 74-52s70 18 74 52z" fill="#45454d" {...o} />
      <path d="M80 152l20 30 20-30c-6-3-13-4-20-4s-14 1-20 4z" fill="#efe6d8" {...o} />
      <path d="M64 156l16-4 20 30-14 20zM136 156l-16-4-20 30 14 20z" fill="#35353c" {...o} />
      {/* neck */}
      <path d="M88 122h24v30c-8 5-16 5-24 0z" fill={SKIN_SHADE} {...o} />
      {/* face */}
      <path d="M68 88c0-28 14-46 32-46s32 18 32 46c0 28-14 48-32 48S68 116 68 88z" fill={SKIN} {...o} />
      {/* side-parted fringe, one grey streak she has earned */}
      <path d="M66 92c0-30 16-50 38-50 18 0 30 12 32 30-10-12-26-16-40-12-14 4-24 16-30 32z" fill={hair} {...o} />
      <path d="M104 44c-10 4-18 12-24 24" stroke="#a1a1aa" strokeWidth={4} strokeLinecap="round" fill="none" />
      {/* pearls */}
      <circle cx="69" cy="114" r="3.5" fill={WHITE} {...thin} />
      <circle cx="131" cy="114" r="3.5" fill={WHITE} {...thin} />
      {/* bored eyes behind serious glasses */}
      <path d="M80 98h14M106 98h14" {...o} {...none} />
      <circle cx="87" cy="101" r="2.6" fill={O} />
      <circle cx="113" cy="101" r="2.6" fill={O} />
      <rect x="74" y="88" width="24" height="18" rx="3" fill={WHITE} fillOpacity={0.18} stroke={O} strokeWidth={4.5} strokeLinejoin="round" />
      <rect x="102" y="88" width="24" height="18" rx="3" fill={WHITE} fillOpacity={0.18} stroke={O} strokeWidth={4.5} strokeLinejoin="round" />
      <path d="M98 95h4" {...o} {...none} />
      {/* one brow up: "and the moat is…?" */}
      <path d="M78 82c5-2 11-2 16 0" {...o} {...none} />
      <path d="M106 79c5-5 13-5 18-1" {...o} {...none} />
      {/* nose, and an unimpressed mouth */}
      <path d="M100 104c-2 5-3 9 0 11h4" {...thin} {...none} />
      <path d="M90 124c6-1 14-1 20 1-2 3-6 4-10 4s-8-2-10-5z" fill="#b65a50" {...thin} />
      <path d="M88 125l-2 1M112 126l2 1" {...thin} {...none} />
      {/* the coffee she's been holding since the first pitch */}
      <path d="M140 158h28l-3 36c0 4-3 6-6 6h-10c-3 0-6-2-6-6z" fill={ACCENT} {...o} />
      <path d="M137 152h34v8h-34z" fill={WHITE} {...o} />
      <path d="M143 172h22" {...thin} {...none} />
      <path d="M131 178c-4 0-7 4-7 9s4 9 9 9h9v-18z" fill={SKIN} {...o} />
      <path d="M128 182h6M128 188h6" {...thin} {...none} stroke="#b65a50" />
      <path d="M150 140c-2 4 2 6 0 10M158 138c-2 4 2 6 0 10" {...thin} {...none} stroke="#9ca0a8" />
    </>
  );
}

function Director() {
  const skin = "#7a4a2c";
  const shade = "#5f3820";
  const hair = "#1b1512";
  const gold = "#e6b54a";
  return (
    <>
      {/* a full, rounded afro */}
      <path
        d="M100 22c16 0 26 6 32 14 12 2 20 12 20 24 8 6 10 18 4 28 4 12-2 24-14 26H58c-12-2-18-14-14-26-6-10-4-22 4-28 0-12 8-22 20-24 6-8 16-14 32-14z"
        fill={hair}
        {...o}
      />
      <path d="M62 52c3-2 6-2 8 0M128 48c3-2 6-1 8 1M78 34c3-2 6-2 8 0M114 32c3-1 6 0 7 2M146 74c2 2 2 5 1 7M54 78c-2 2-2 5-1 7" {...thin} {...none} stroke="#3a2e28" />
      {/* black turtleneck */}
      <path d="M26 202c4-34 30-52 74-52s70 18 74 52z" fill="#2c2c32" {...o} />
      <path d="M84 132h32v24c-10 5-22 5-32 0z" fill="#2c2c32" {...o} />
      <path d="M85 140c10 4 20 4 30 0M85 147c10 4 20 4 30 0" stroke="#45454d" strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* face */}
      <path d="M70 90c0-26 13-42 30-42s30 16 30 42-12 44-30 44-30-18-30-44z" fill={skin} {...o} />
      {/* gold hoops */}
      <circle cx="70" cy="114" r="7" fill="none" stroke={O} strokeWidth={6} />
      <circle cx="70" cy="114" r="7" fill="none" stroke={gold} strokeWidth={3} />
      <circle cx="130" cy="114" r="7" fill="none" stroke={O} strokeWidth={6} />
      <circle cx="130" cy="114" r="7" fill="none" stroke={gold} strokeWidth={3} />
      {/* hairline */}
      <path d="M72 70c6-12 16-20 28-20s22 8 28 20c-8-4-18-6-28-6s-20 2-28 6z" fill={hair} />
      {/* level, unimpressed eyes; one brow up */}
      <path d="M80 96h14M106 96h14" stroke={O} strokeWidth={3.5} strokeLinecap="round" fill="none" />
      <path d="M82 96c1 4 9 4 10 0M108 96c1 4 9 4 10 0" fill={O} />
      <path d="M78 87c5-3 12-3 17 0" {...o} {...none} />
      <path d="M105 83c5-5 13-5 18-1" {...o} {...none} />
      {/* nose, lips pressed in judgement */}
      <path d="M100 100c-2 6-3 9 0 11h5" stroke={shade} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <path d="M89 120c4-2 8-2 11-1 3-1 7-1 11 1-3 4-7 5-11 5s-8-1-11-5z" fill="#8f3b30" {...thin} />
      <path d="M90 120.5c7 1 13 1 20 0" stroke="#5c211b" strokeWidth={1.5} fill="none" strokeLinecap="round" />
      {/* the red marker, uncapped, ready to mark up your page */}
      <path d="M146 196l14-52 10 3-14 52z" fill={ACCENT} {...o} />
      <path d="M160 144l2-10 6 2-2 10z" fill={WHITE} {...thin} />
      <path d="M156 152l10 3" {...thin} {...none} />
      <path d="M138 186c-4-2-5-10 1-12l12-2 2 14z" fill={skin} {...o} />
    </>
  );
}

function Bro() {
  return (
    <>
      <defs>
        <linearGradient id="bro-lens" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffb347" />
          <stop offset="0.55" stopColor={ACCENT} />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
      </defs>
      {/* hoodie */}
      <path d="M24 202c4-36 32-54 76-54s72 18 76 54z" fill="#62626b" {...o} />
      <path d="M66 152c4 18 18 26 34 26s30-8 34-26" fill="#4d4d55" {...o} />
      <path d="M90 176v16M110 176v16" {...thin} {...none} stroke={WHITE} />
      <circle cx="90" cy="194" r="2.5" fill={WHITE} />
      <circle cx="110" cy="194" r="2.5" fill={WHITE} />
      {/* neck, ears, head */}
      <path d="M87 122h26v30H87z" fill={SKIN_SHADE} {...o} />
      <ellipse cx="65" cy="96" rx="8" ry="12" fill={SKIN} {...o} />
      <ellipse cx="135" cy="96" rx="8" ry="12" fill={SKIN} {...o} />
      <path d="M67 90c0-28 15-44 33-44s33 16 33 44-13 46-33 46-33-18-33-46z" fill={SKIN} {...o} />
      {/* cap on backwards, a tuft escaping at the front */}
      <path d="M64 78c0-26 16-42 36-42s36 16 36 42c-22-5-50-5-72 0z" fill={ACCENT} {...o} />
      <path d="M132 70c10-2 22 0 28 6-6 5-18 6-28 4z" fill="#c94a26" {...o} />
      <circle cx="100" cy="37" r="4" fill={ACCENT} {...thin} />
      <path d="M82 78c4-6 10-8 16-6M100 76c4-5 10-6 15-3" {...o} fill="#5a3b28" />
      {/* aviators, mirrored */}
      <path d="M72 90h24c0 10-4 16-12 16s-12-6-12-16zM104 90h24c0 10-4 16-12 16s-12-6-12-16z" fill="url(#bro-lens)" {...o} />
      <path d="M96 92h8M72 92l-6-2M128 92l6-2" {...thin} {...none} />
      <path d="M77 94l6 6M109 94l6 6" stroke={WHITE} strokeWidth={2.5} strokeLinecap="round" opacity={0.8} />
      {/* the grin */}
      <path d="M80 114c4 14 36 14 40 0z" fill={WHITE} {...o} />
      <path d="M86 116v5M93 117v6M100 117v6M107 117v6M114 116v5" {...thin} {...none} strokeWidth={1.8} />
      <path d="M100 104c-2 3-2 5 0 6" {...thin} {...none} />
      {/* headset mic */}
      <path d="M66 100c-4 12 2 22 16 24h6" {...thin} {...none} />
      <rect x="86" y="120" width="7" height="6" rx="3" fill={O} />
      {/* thumbs up */}
      <path d="M150 162c0-6 4-10 8-10 3 0 4 3 3 7l-2 8h10c4 0 6 3 5 7l-3 16c-1 4-4 6-8 6h-13c-3 0-5-2-5-5v-21c0-3 2-6 5-8z" fill={SKIN} {...o} />
      <path d="M140 170h10v30h-10z" fill="#62626b" {...o} />
    </>
  );
}

function Doc() {
  return (
    <>
      {/* field shirt with pockets and epaulettes */}
      <path d="M26 202c4-34 30-52 74-52s70 18 74 52z" fill="#b7a27a" {...o} />
      <path d="M44 166l22-6 2 8-22 6zM156 166l-22-6-2 8 22 6z" fill="#a08b63" {...thin} />
      <path d="M58 182h24v20H58zM118 182h24v20h-24z" fill="#a08b63" {...thin} />
      <path d="M86 150l14 18 14-18" fill="#a08b63" {...o} />
      {/* binoculars on a strap */}
      <path d="M74 152c-2 14 2 22 12 26M126 152c2 14-2 22-12 26" {...thin} {...none} stroke="#3a2a1a" />
      <rect x="78" y="172" width="18" height="24" rx="6" fill="#2a2a30" {...o} />
      <rect x="104" y="172" width="18" height="24" rx="6" fill="#2a2a30" {...o} />
      <path d="M96 182h8" {...o} {...none} />
      <circle cx="87" cy="192" r="4" fill="#5b6b7d" />
      <circle cx="113" cy="192" r="4" fill="#5b6b7d" />
      {/* head */}
      <ellipse cx="66" cy="98" rx="8" ry="12" fill={SKIN} {...o} />
      <ellipse cx="134" cy="98" rx="8" ry="12" fill={SKIN} {...o} />
      <path d="M68 92c0-26 14-40 32-40s32 14 32 40c0 12-2 22-6 30H74c-4-8-6-18-6-30z" fill={SKIN} {...o} />
      {/* the great white beard */}
      <path d="M68 100c-2 30 12 56 32 56s34-26 32-56c-6 6-12 8-18 6-8-3-20-3-28 0-6 2-12 0-18-6z" fill={WHITE} {...o} />
      <path d="M84 132c4 6 8 10 16 12M116 132c-4 6-8 10-16 12" {...thin} {...none} stroke="#c9c9cf" />
      <path d="M86 110c6-5 22-5 28 0-4 4-10 6-14 4-4 2-10 0-14-4z" fill={WHITE} {...o} />
      <path d="M96 120c2 2 6 2 8 0" {...thin} {...none} />
      {/* kind eyes, crinkled, under bushy white brows */}
      <path d="M82 94c2-3 6-3 8 0M110 94c2-3 6-3 8 0" {...o} {...none} />
      <path d="M76 98l-4 2M124 98l4 2" {...thin} {...none} />
      <path d="M76 84c6-4 14-4 18 0M106 84c4-4 12-4 18 0" stroke={WHITE} strokeWidth={6} strokeLinecap="round" fill="none" />
      <path d="M76 84c6-4 14-4 18 0M106 84c4-4 12-4 18 0" {...thin} {...none} />
      {/* half-moon spectacles on the end of the nose */}
      <path d="M80 100h16c0 6-3 8-8 8s-8-2-8-8zM104 100h16c0 6-3 8-8 8s-8-2-8-8z" fill={WHITE} fillOpacity={0.2} {...thin} />
      <path d="M96 101h8" {...thin} {...none} />
      <path d="M100 96c-3 6-3 10 0 11" {...thin} {...none} />
      {/* pith helmet */}
      <path d="M50 70c10-8 90-8 100 0-8 6-92 6-100 0z" fill="#d8c79f" {...o} />
      <path d="M66 66c0-22 16-36 34-36s34 14 34 36c-22 4-46 4-68 0z" fill="#e6d7b0" {...o} />
      <path d="M67 58c22 4 44 4 66 0v8c-22 4-44 4-66 0z" fill={ACCENT} {...thin} />
      <path d="M84 40c6-4 14-6 22-5" {...thin} {...none} stroke="#fff6dc" />
      <circle cx="100" cy="30" r="3.5" fill="#d8c79f" {...thin} />
    </>
  );
}

const ART: Record<RoasterId, () => React.ReactElement> = { vc: Vc, bro: Bro, director: Director, doc: Doc };

export function Portrait({ id, className = "size-24" }: { id: RoasterId; className?: string }) {
  const Art = ART[id];
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-hidden="true">
      <Art />
    </svg>
  );
}
