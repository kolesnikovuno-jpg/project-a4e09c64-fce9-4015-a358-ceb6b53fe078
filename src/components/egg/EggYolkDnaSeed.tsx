/** A quiet reception signal — not an object sketch, 3D model, approval control,
 * or new idea. The server-backed seed is checked by the parent component.
 */
export default function EggYolkDnaSeed(){
 return <div className="relative flex h-full w-full flex-col items-center justify-center gap-1"
   data-testid="yolk-dna-received"
   role="status" aria-label="Желток получил утверждённую ДНК Идеи">
    <div aria-hidden="true" className="egg-dna-aura pointer-events-none absolute top-1/2 left-1/2 h-[185px] w-[185px] -translate-x-1/2 -translate-y-[60%] rounded-full"/>
    <svg viewBox="0 0 160 198" width="112" height="139"
      className="egg-dna-heart relative z-10 h-[clamp(104px,20vh,150px)] w-auto"
      role="img" aria-label="Зерно ДНК — маленькое яйцо">
      <defs>
        <radialGradient id="egg-dna-body" cx="37%" cy="25%" r="85%">
          <stop offset="0%" stopColor="#e3f2ea"/>
          <stop offset="44%" stopColor="#b3dbd3"/>
          <stop offset="100%" stopColor="#709990"/>
        </radialGradient>
        <linearGradient id="egg-dna-sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffaf3" stopOpacity=".82"/>
          <stop offset="65%" stopColor="#fffaf3" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d="M80 7 C49 7 19 69 19 113 C19 159 46 188 80 188 C114 188 141 159 141 113 C141 69 111 7 80 7Z"
        fill="url(#egg-dna-body)" stroke="#7ea9a0" strokeWidth="1.1"/>
      <path d="M80 13 C57 14 35 68 35 110 C35 135 42 147 47 153"
        fill="none" stroke="url(#egg-dna-sheen)" strokeWidth="9" strokeLinecap="round" opacity=".72"/>
      <ellipse cx="64" cy="72" rx="15" ry="28" fill="#fffaf3" opacity=".12"
        transform="rotate(18 64 72)"/>
    </svg>
    <p className="relative z-10 mt-5 text-[12px] font-normal tracking-[0.12em] text-foreground/70">
      ДНК получена
    </p>
    <p className="relative z-10 text-[10px] font-light tracking-[0.05em] text-foreground/45">
      Зерно Идеи · форма ещё не определена
    </p>
  </div>;
}
