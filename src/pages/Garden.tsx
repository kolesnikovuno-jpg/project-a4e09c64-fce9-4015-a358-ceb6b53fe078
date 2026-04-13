import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEffect, useMemo, useState } from "react";
import PageTransition from "@/components/PageTransition";

interface BudProps {
  cx: number;
  cy: number;
  r: number;
  filled?: boolean;
  hatched?: boolean;
  id: string;
  label?: string;
  onClick?: () => void;
  delay: number;
  visible: boolean;
}

const Bud = ({ cx, cy, r, filled, hatched, id, label, onClick, delay, visible }: BudProps) => {
  const hatchId = `hatch-${id}`;
  return (
    <g
      className="garden-bud"
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Элемент ${id}`}
      style={{
        cursor: "pointer",
        opacity: visible ? 1 : 0,
        transform: visible ? "scale(1)" : "scale(0)",
        transformOrigin: `${cx}px ${cy}px`,
        transition: `opacity 0.6s ease ${delay}s, transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}s`,
      }}
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
      {label && <title>{label}</title>}
    </g>
  );
};

const Garden = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    // Trigger animation after mount
    const t = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const budLabels: Record<string, string> = {
    "01": "Архитектура",
    "02": "Интерьер",
    "03": "Предмет",
    "04": "Графика",
    "05": "Lyra",
    "06": "Эскиз",
  };

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

  const gY = 560;
  const sw = "0.8";

  const desktopStems = [
    {
      x: 180, h: 370,
      branches: [{ side: -1, y: 160, len: 35, r: 8, style: "outline" as const }],
      topR: 13, topStyle: "outline" as const, id: "01",
    },
    {
      x: 290, h: 430,
      branches: [
        { side: -1, y: 200, len: 40, r: 9, style: "hatched" as const },
        { side: 1, y: 320, len: 30, r: 7, style: "outline" as const },
      ],
      topR: 15, topStyle: "outline" as const, id: "02",
    },
    {
      x: 410, h: 290,
      branches: [{ side: 1, y: 140, len: 38, r: 7, style: "filled" as const }],
      topR: 12, topStyle: "hatched" as const, id: "03",
    },
    {
      x: 500, h: 180,
      branches: [{ side: 1, y: 90, len: 32, r: 6, style: "outline" as const }],
      topR: 10, topStyle: "filled" as const, id: "04",
    },
    {
      x: 620, h: 410,
      branches: [
        { side: 1, y: 190, len: 42, r: 9, style: "outline" as const },
        { side: -1, y: 310, len: 28, r: 6, style: "filled" as const },
      ],
      topR: 14, topStyle: "outline" as const, id: "05",
    },
    {
      x: 760, h: 120,
      branches: [],
      topR: 9, topStyle: "outline" as const, id: "06",
    },
  ];

  const mobileStems = [
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

  const stems = isMobile ? mobileStems : desktopStems;
  const vbWidth = isMobile ? 800 : 900;

  // Generate random delays for stems and buds (stable across renders)
  const { budDelays, stemDelays } = useMemo(() => {
    const budD: Record<string, number> = {};
    const stemD: Record<string, number> = {};
    const src = isMobile ? mobileStems : desktopStems;
    
    // Randomize stem growth order
    const stemIds = src.map(s => s.id);
    const shuffledStems = [...stemIds].sort(() => Math.random() - 0.5);
    shuffledStems.forEach((id, i) => {
      stemD[id] = 0.3 + i * 0.2 + Math.random() * 0.15;
    });

    // Collect all buds and randomize bloom order
    let allBuds: string[] = [];
    src.forEach((stem) => {
      allBuds.push(stem.id);
      stem.branches.forEach((_, i) => {
        allBuds.push(`${stem.id}.${i + 1}`);
      });
    });
    const shuffledBuds = [...allBuds].sort(() => Math.random() - 0.5);
    shuffledBuds.forEach((id, i) => {
      budD[id] = 1.2 + i * 0.15 + Math.random() * 0.1;
    });
    return { budDelays: budD, stemDelays: stemD };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobile]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center pt-[18vh] md:pt-[6vh] overflow-hidden relative">
      <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
        <span className="text-sm tracking-[0.15em] text-foreground font-normal select-none">
          Garden
        </span>
        <a href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }} className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors">
          .uno
        </a>
      </div>
      <svg
        viewBox={`0 0 ${vbWidth} 600`}
        className="w-full max-w-[900px] h-auto"
        preserveAspectRatio="xMidYMax meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Ground line — fade in */}
        <line
          x1="0" y1={gY} x2={vbWidth} y2={gY}
          stroke="hsl(168 40% 52%)" strokeWidth={sw}
          style={{
            opacity: animated ? 1 : 0,
            transition: "opacity 0.6s ease-out",
          }}
        />

        {stems.map((stem) => {
          const topY = gY - stem.h;
          const stemDelay = stemDelays[stem.id] || 0.3;
          return (
            <g key={stem.id}>
              {/* Vertical stem — grows from ground up */}
              <line
                x1={stem.x} y1={gY} x2={stem.x} y2={topY}
                stroke="hsl(168 40% 52%)" strokeWidth={sw}
                style={{
                  strokeDasharray: stem.h,
                  strokeDashoffset: animated ? 0 : stem.h,
                  transition: `stroke-dashoffset 0.9s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${stemDelay}s`,
                }}
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
                delay={budDelays[stem.id] || 1}
                visible={animated}
              />
              {/* Branches */}
              {stem.branches.map((br, i) => {
                const brY = gY - br.y;
                const brEndX = stem.x + br.side * br.len;
                const subId = `${stem.id}.${i + 1}`;
                // Branch appears after stem has grown past this point
                const branchGrowDelay = stemDelay + (br.y / stem.h) * 0.9;
                return (
                  <g key={subId}>
                    {/* Horizontal branch */}
                    <line
                      x1={stem.x} y1={brY} x2={brEndX} y2={brY}
                      stroke="hsl(168 40% 52%)" strokeWidth={sw}
                      style={{
                        strokeDasharray: br.len,
                        strokeDashoffset: animated ? 0 : br.len,
                        transition: `stroke-dashoffset 0.5s ease-out ${branchGrowDelay}s`,
                      }}
                    />
                    <Bud
                      cx={brEndX}
                      cy={brY}
                      r={br.r}
                      filled={br.style === "filled"}
                      hatched={br.style === "hatched"}
                      id={subId}
                      onClick={() => handleClick(subId)}
                      delay={budDelays[subId] || 1.2}
                      visible={animated}
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
