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
        strokeWidth="0.8"
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

const Garden = () => {
  const navigate = useNavigate();

  const handleClick = (id: string) => {
    const routes: Record<string, string> = {
      "05": "/lyra",
    };
    if (routes[id]) {
      navigate(routes[id]);
    } else {
      console.log(`Clicked: ${id}`);
    }
  };

  // Ground Y
  const gY = 560;
  const sw = "0.8"; // stroke width

  // Stems: x, height, branches [{side, yOffset, length, budR, budStyle}], topBudR, topBudStyle
  const stems = [
    {
      x: 100, h: 420,
      branches: [{ side: -1, y: 180, len: 40, r: 14, style: "outline" as const }],
      topR: 20, topStyle: "outline" as const, id: "01",
    },
    {
      x: 220, h: 480,
      branches: [
        { side: -1, y: 220, len: 45, r: 15, style: "hatched" as const },
        { side: 1, y: 360, len: 35, r: 12, style: "outline" as const },
      ],
      topR: 22, topStyle: "outline" as const, id: "02",
    },
    {
      x: 350, h: 340,
      branches: [{ side: 1, y: 160, len: 42, r: 12, style: "filled" as const }],
      topR: 18, topStyle: "hatched" as const, id: "03",
    },
    {
      x: 450, h: 220,
      branches: [{ side: 1, y: 110, len: 36, r: 11, style: "outline" as const }],
      topR: 16, topStyle: "filled" as const, id: "04",
    },
    {
      x: 570, h: 460,
      branches: [
        { side: 1, y: 210, len: 48, r: 15, style: "outline" as const },
        { side: -1, y: 350, len: 32, r: 11, style: "filled" as const },
      ],
      topR: 21, topStyle: "outline" as const, id: "05",
    },
    {
      x: 700, h: 150,
      branches: [],
      topR: 14, topStyle: "outline" as const, id: "06",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-end justify-center pb-0 overflow-hidden">
      <svg
        viewBox="0 0 900 600"
        className="w-full max-w-[900px] h-auto"
        preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground line — straight horizontal */}
        <line
          x1="0" y1={gY} x2="900" y2={gY}
          stroke="hsl(168 40% 52%)" strokeWidth={sw}
        />

        {stems.map((stem) => {
          const topY = gY - stem.h;
          return (
            <g key={stem.id}>
              {/* Vertical stem */}
              <line
                x1={stem.x} y1={gY} x2={stem.x} y2={topY}
                stroke="hsl(168 40% 52%)" strokeWidth={sw}
              />
              {/* Top bud */}
              <Bud
                cx={stem.x}
                cy={topY}
                r={stem.topR}
                filled={stem.topStyle === "filled"}
                hatched={stem.topStyle === "hatched"}
                id={stem.id}
                onClick={() => handleClick(stem.id)}
              />
              {/* Branches */}
              {stem.branches.map((br, i) => {
                const brY = gY - br.y;
                const brEndX = stem.x + br.side * br.len;
                const subId = `${stem.id}.${i + 1}`;
                return (
                  <g key={subId}>
                    {/* Horizontal branch */}
                    <line
                      x1={stem.x} y1={brY} x2={brEndX} y2={brY}
                      stroke="hsl(168 40% 52%)" strokeWidth={sw}
                    />
                    <Bud
                      cx={brEndX}
                      cy={brY}
                      r={br.r}
                      filled={br.style === "filled"}
                      hatched={br.style === "hatched"}
                      id={subId}
                      onClick={() => handleClick(subId)}
                    />
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      <style>{`
        .garden-bud:hover circle:first-of-type {
          stroke-width: 1.8;
          filter: drop-shadow(0 0 6px hsl(168 40% 72% / 0.5));
        }
        .garden-bud:focus-visible circle:first-of-type {
          stroke-width: 1.8;
          outline: none;
          filter: drop-shadow(0 0 6px hsl(168 40% 72% / 0.5));
        }
      `}</style>
    </div>
  );
};

export default Garden;
