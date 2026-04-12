import { useNavigate } from "react-router-dom";

interface BudProps {
  cx: number;
  cy: number;
  r: number;
  filled?: boolean;
  hatched?: boolean;
  id: string;
  onClick?: () => void;
}

const Bud = ({ cx, cy, r, filled, hatched, id, onClick }: BudProps) => {
  const hatchId = `hatch-${id}`;
  return (
    <g
      className="garden-bud"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Элемент ${id}`}
      style={{ cursor: "pointer" }}
    >
      {hatched && (
        <defs>
          <pattern
            id={hatchId}
            patternUnits="userSpaceOnUse"
            width="4"
            height="4"
            patternTransform="rotate(45)"
          >
            <line
              x1="0" y1="0" x2="0" y2="4"
              stroke="hsl(168 40% 72%)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={filled ? "hsl(168 40% 72%)" : hatched ? `url(#${hatchId})` : "none"}
        stroke="hsl(168 40% 52%)"
        strokeWidth="1.2"
        className="transition-all duration-300"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r + 6}
        fill="transparent"
        stroke="transparent"
        className="garden-hit"
      />
    </g>
  );
};

/*
  Layout map (left→right):
  Stem A: 01 (top) + 01.1 (branch bud)
  Stem B: 02 (top) + 02.1 (branch bud)
  Stem C: 03 (top, hatched) + 03.1 (branch bud)
  Stem D: 04 (top) + 04.1 (branch bud)
  Stem E: 05 (top) + 05.1 (branch bud)
  Stem F: 06 (short, far right)
*/

const Garden = () => {
  const navigate = useNavigate();

  const handleClick = (id: string) => {
    console.log(`Clicked: ${id}`);
    // links will be added later
  };

  return (
    <div className="min-h-screen bg-background flex items-end justify-center pb-0 overflow-hidden">
      <svg
        viewBox="0 0 900 600"
        className="w-full max-w-[900px] h-auto"
        preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground line */}
        <path
          d="M 0 560 Q 80 555, 160 558 Q 300 562, 450 560 Q 600 557, 750 560 Q 850 562, 900 558"
          fill="none"
          stroke="hsl(168 40% 52%)"
          strokeWidth="1.2"
        />

        {/* Stem A — tall left */}
        <path
          d="M 220 558 Q 218 480, 222 400 Q 225 340, 228 280 Q 230 240, 235 200"
          fill="none" stroke="hsl(168 40% 52%)" strokeWidth="1.2"
        />
        {/* Branch 01.1 */}
        <path
          d="M 224 380 Q 210 360, 195 345"
          fill="none" stroke="hsl(168 40% 52%)" strokeWidth="1.2"
        />
        <Bud cx={190} cy={338} r={10} id="01.1" onClick={() => handleClick("01.1")} />
        {/* Top 01 */}
        <Bud cx={237} cy={188} r={14} id="01" onClick={() => handleClick("01")} />

        {/* Stem B */}
        <path
          d="M 310 558 Q 308 490, 312 420 Q 314 360, 318 300 Q 320 250, 315 190 Q 312 160, 318 130"
          fill="none" stroke="hsl(168 40% 52%)" strokeWidth="1.2"
        />
        {/* Branch 02.1 */}
        <path
          d="M 314 350 Q 295 330, 280 310"
          fill="none" stroke="hsl(168 40% 52%)" strokeWidth="1.2"
        />
        <Bud cx={274} cy={302} r={9} hatched id="02.1" onClick={() => handleClick("02.1")} />
        {/* Top 02 */}
        <Bud cx={320} cy={118} r={16} id="02" onClick={() => handleClick("02")} />

        {/* Stem C — medium, center-left */}
        <path
          d="M 420 558 Q 418 500, 422 440 Q 425 390, 428 340 Q 430 310, 425 280"
          fill="none" stroke="hsl(168 40% 52%)" strokeWidth="1.2"
        />
        {/* Branch 03.1 */}
        <path
          d="M 424 420 Q 440 400, 455 385"
          fill="none" stroke="hsl(168 40% 52%)" strokeWidth="1.2"
        />
        <Bud cx={462} cy={378} r={8} filled id="03.1" onClick={() => handleClick("03.1")} />
        {/* Top 03 — hatched */}
        <Bud cx={423} cy={268} r={13} hatched id="03" onClick={() => handleClick("03")} />

        {/* Stem D — short center */}
        <path
          d="M 490 558 Q 492 510, 495 460 Q 497 420, 500 380"
          fill="none" stroke="hsl(168 40% 52%)" strokeWidth="1.2"
        />
        <Bud cx={501} cy={370} r={10} filled id="04" onClick={() => handleClick("04")} />
        {/* Branch 04.1 */}
        <path
          d="M 496 450 Q 510 435, 525 425"
          fill="none" stroke="hsl(168 40% 52%)" strokeWidth="1.2"
        />
        <Bud cx={532} cy={418} r={7} id="04.1" onClick={() => handleClick("04.1")} />

        {/* Stem E — tall right */}
        <path
          d="M 620 558 Q 618 490, 622 420 Q 625 350, 630 280 Q 633 230, 628 180 Q 625 150, 630 120"
          fill="none" stroke="hsl(168 40% 52%)" strokeWidth="1.2"
        />
        {/* Branch 05.1 */}
        <path
          d="M 625 360 Q 645 340, 660 325"
          fill="none" stroke="hsl(168 40% 52%)" strokeWidth="1.2"
        />
        <Bud cx={666} cy={318} r={9} id="05.1" onClick={() => handleClick("05.1")} />
        {/* Top 05 */}
        <Bud cx={632} cy={108} r={14} id="05" onClick={() => handleClick("05")} />

        {/* Stem F — short far right */}
        <path
          d="M 770 558 Q 772 530, 774 500 Q 775 480, 776 460"
          fill="none" stroke="hsl(168 40% 52%)" strokeWidth="1.2"
        />
        <Bud cx={777} cy={450} r={10} id="06" onClick={() => handleClick("06")} />
      </svg>

      <style>{`
        .garden-bud:hover circle:first-of-type {
          stroke-width: 2.2;
          filter: drop-shadow(0 0 6px hsl(168 40% 72% / 0.5));
        }
        .garden-bud:focus-visible circle:first-of-type {
          stroke-width: 2.2;
          outline: none;
          filter: drop-shadow(0 0 6px hsl(168 40% 72% / 0.5));
        }
      `}</style>
    </div>
  );
};

export default Garden;
