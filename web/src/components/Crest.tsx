import type { Team } from "../api";

/** Club crest: real badge when the data provider supplies one, otherwise a generated shield. */
export function Crest({ team, size = 48 }: { team: Team; size?: number }) {
  if (team.crest) {
    return <img className="crest-img" src={team.crest} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  const [c1, c2] = team.colors;
  const gid = `g-${team.id}`;
  return (
    <svg className="crest" width={size} height={size * 1.15} viewBox="0 0 100 115" aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={c1} />
          <stop offset="1" stopColor={shade(c1, -0.35)} />
        </linearGradient>
        <clipPath id={`${gid}-clip`}>
          <path d="M50 3 L94 16 V54 C94 82 74 101 50 112 C26 101 6 82 6 54 V16 Z" />
        </clipPath>
      </defs>
      <path d="M50 3 L94 16 V54 C94 82 74 101 50 112 C26 101 6 82 6 54 V16 Z" fill={`url(#${gid})`} />
      <g clipPath={`url(#${gid}-clip)`} opacity="0.9">
        <path d="M64 0 L100 0 L100 115 L28 115 Z" fill={c2} opacity="0.16" />
        <rect x="0" y="74" width="100" height="5" fill={c2} opacity="0.55" />
      </g>
      <path d="M50 3 L94 16 V54 C94 82 74 101 50 112 C26 101 6 82 6 54 V16 Z" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2" />
      <path d="M50 10 L87 21 V54 C87 78 70 94 50 104 C30 94 13 78 13 54 V21 Z" fill="none" stroke={c2} strokeOpacity="0.45" strokeWidth="1.2" />
      <text x="50" y="62" textAnchor="middle" fontFamily="Instrument Serif, serif" fontSize="34" fill={c2} letterSpacing="1">
        {team.short}
      </text>
    </svg>
  );
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
  const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
