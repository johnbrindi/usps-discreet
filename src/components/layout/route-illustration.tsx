/** Original decorative illustration: a stylised route map with parcel waypoints. */
export function RouteIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 520" preserveAspectRatio="xMidYMid slice" className={className} aria-hidden="true">
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0v40" fill="none" stroke="#ffffff" strokeOpacity="0.06" />
        </pattern>
        <linearGradient id="fade" x1="0" x2="1">
          <stop offset="0" stopColor="#0c2340" />
          <stop offset="0.35" stopColor="#0c2340" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="600" height="520" fill="url(#grid)" />
      <path
        d="M60 430 C 160 400, 170 300, 260 290 S 380 330, 420 230 S 470 110, 560 90"
        fill="none"
        stroke="#f2b134"
        strokeWidth="3"
        strokeDasharray="2 10"
        strokeLinecap="round"
      />
      {[
        [60, 430],
        [260, 290],
        [420, 230],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r="14" fill="#12345c" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="2" />
          <circle cx={x} cy={y} r="5" fill="#ffffff" />
        </g>
      ))}
      <g transform="translate(528 58)">
        <rect width="64" height="64" rx="12" fill="#f2b134" />
        <path d="M32 14 49 22.5v19L32 50l-17-8.5v-19z" fill="none" stroke="#071526" strokeWidth="3" strokeLinejoin="round" />
        <path d="m15 22.5 17 8.5 17-8.5M32 31v19" fill="none" stroke="#071526" strokeWidth="3" strokeLinejoin="round" />
      </g>
      <rect width="600" height="520" fill="url(#fade)" />
    </svg>
  );
}
