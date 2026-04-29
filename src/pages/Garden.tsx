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
  showLabel?: boolean;
  onClick?: () => void;
  onHover?: (id: string | null) => void;
  delay: number;
  visible: boolean;
}

interface BudPropsExt extends BudProps {
  active?: boolean;
}

const Bud = ({ cx, cy, r, filled, hatched, id, label, onClick, onHover, delay, visible, active }: BudPropsExt) => {
  const hatchId = `hatch-${id}`;
  return (
    <g
      className={`garden-bud${active ? " is-active" : ""}`}
      onClick={onClick}
      onMouseEnter={() => onHover?.(id)}
      onMouseLeave={() => onHover?.(null)}
      role="button"
      tabIndex={0}
      aria-label={label || `Элемент ${id}`}
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
          <pattern id={hatchId} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="hsl(203 24% 45%)" strokeWidth="1" />
          </pattern>
        </defs>
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={filled ? "hsl(203 24% 45%)" : hatched ? `url(#${hatchId})` : "none"}
        stroke="hsl(203 24% 35%)"
        strokeWidth="0.8"
        className="transition-all duration-300"
      />
      <circle cx={cx} cy={cy} r={r + 6} fill="transparent" stroke="transparent" className="garden-hit" />
    </g>
  );
};

const GARDEN_PASSWORD = "1111";

const TypewriterLabel = ({ text }: { text: string | null }) => {
  if (!text) {
    return <span className="garden-typewriter">&nbsp;</span>;
  }
  return (
    <span key={text} className="garden-typewriter visible">
      {text}
    </span>
  );
};

const Garden = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [animated, setAnimated] = useState(false);
  const [activeBud, setActiveBud] = useState<string | null>(null);
  const [hoveredBud, setHoveredBud] = useState<string | null>(null);
  // Password disabled until 2026-04-29 — then restore: sessionStorage.getItem("garden_unlocked") === "true"
  const [unlocked, setUnlocked] = useState(() => {
    const disableUntil = new Date("2026-05-29T00:00:00");
    return new Date() < disableUntil ? true : sessionStorage.getItem("garden_unlocked") === "true";
  });
  const [passInput, setPassInput] = useState("");
  const [error, setError] = useState(false);

  const budLabels: Record<string, string> = {
    "01": "Архитектура",
    "02": "Интерьер",
    "03": "Предмет",
    "04": "Графика",
    "05": "Lyra — кресло",
    "06": "Эскиз",
    "06.1": "unocalc",
  };

  const routes: Record<string, string> = {
    "05": "/lyra",
    "06.1": "/unocalc",
  };

  const gY = 560;
  const sw = "0.8";

  const desktopStems = [
    {
      x: 180,
      h: 370,
      branches: [{ side: -1, y: 160, len: 35, r: 8, style: "outline" as const }],
      topR: 13,
      topStyle: "outline" as const,
      id: "01",
    },
    {
      x: 290,
      h: 430,
      branches: [
        { side: -1, y: 200, len: 40, r: 9, style: "hatched" as const },
        { side: 1, y: 320, len: 30, r: 7, style: "outline" as const },
      ],
      topR: 15,
      topStyle: "outline" as const,
      id: "02",
    },
    {
      x: 410,
      h: 290,
      branches: [{ side: 1, y: 140, len: 38, r: 7, style: "filled" as const }],
      topR: 12,
      topStyle: "hatched" as const,
      id: "03",
    },
    {
      x: 500,
      h: 180,
      branches: [{ side: 1, y: 90, len: 32, r: 6, style: "outline" as const }],
      topR: 10,
      topStyle: "filled" as const,
      id: "04",
    },
    {
      x: 620,
      h: 410,
      branches: [
        { side: 1, y: 190, len: 42, r: 9, style: "outline" as const },
        { side: -1, y: 310, len: 28, r: 6, style: "filled" as const },
      ],
      topR: 14,
      topStyle: "outline" as const,
      id: "05",
    },
    {
      x: 760,
      h: 120,
      branches: [{ side: -1, y: 60, len: 32, r: 6, style: "outline" as const }],
      topR: 9,
      topStyle: "outline" as const,
      id: "06",
    },
  ];

  const mobileStems = [
    {
      x: 100,
      h: 420,
      branches: [{ side: -1, y: 180, len: 40, r: 14, style: "outline" as const }],
      topR: 20,
      topStyle: "outline" as const,
      id: "01",
    },
    {
      x: 220,
      h: 480,
      branches: [
        { side: -1, y: 220, len: 45, r: 15, style: "hatched" as const },
        { side: 1, y: 360, len: 35, r: 12, style: "outline" as const },
      ],
      topR: 22,
      topStyle: "outline" as const,
      id: "02",
    },
    {
      x: 350,
      h: 340,
      branches: [{ side: 1, y: 160, len: 42, r: 12, style: "filled" as const }],
      topR: 18,
      topStyle: "hatched" as const,
      id: "03",
    },
    {
      x: 450,
      h: 220,
      branches: [{ side: 1, y: 110, len: 36, r: 11, style: "outline" as const }],
      topR: 16,
      topStyle: "filled" as const,
      id: "04",
    },
    {
      x: 570,
      h: 460,
      branches: [
        { side: 1, y: 210, len: 48, r: 15, style: "outline" as const },
        { side: -1, y: 350, len: 32, r: 11, style: "filled" as const },
      ],
      topR: 21,
      topStyle: "outline" as const,
      id: "05",
    },
    {
      x: 700,
      h: 150,
      branches: [{ side: -1, y: 75, len: 36, r: 11, style: "outline" as const }],
      topR: 14,
      topStyle: "outline" as const,
      id: "06",
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
    const stemIds = src.map((s) => s.id);
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

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handlePassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passInput === GARDEN_PASSWORD) {
      sessionStorage.setItem("garden_unlocked", "true");
      setUnlocked(true);
    } else {
      setError(true);
      setPassInput("");
    }
  };

  const handleClick = (id: string) => {
    if (isMobile) {
      if (activeBud === id) {
        if (routes[id]) navigate(routes[id]);
        setActiveBud(null);
      } else {
        setActiveBud(id);
      }
    } else {
      if (routes[id]) navigate(routes[id]);
    }
  };

  const displayedLabelId = isMobile ? activeBud : hoveredBud;
  const displayedLabel = displayedLabelId ? budLabels[displayedLabelId] : null;

  if (!unlocked) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <form onSubmit={handlePassSubmit} className="flex flex-col items-center gap-6">
            <input
              type="password"
              value={passInput}
              onChange={(e) => {
                setPassInput(e.target.value);
                setError(false);
              }}
              placeholder="••••"
              autoFocus
              className="bg-transparent border-b border-primary/40 text-center text-lg tracking-[0.3em] text-foreground outline-none py-2 w-32 placeholder:text-muted-foreground/40"
            />
            {error && <span className="text-xs text-destructive tracking-wider">неверный пароль</span>}
          </form>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center pt-[18vh] md:pt-[6vh] overflow-hidden relative">
        <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
          <span className="text-sm tracking-[0.15em] text-foreground font-normal select-none">Garden</span>
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate("/");
            }}
            className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors"
          >
            .uno
          </a>
        </div>
        {/* Floating label above stems, aligned to right edge */}
        <div
          className="absolute right-6 left-6 text-right pointer-events-none select-none z-10"
          style={{ top: "calc(18vh - 2.5rem + 15px)" }}
        >
          <TypewriterLabel text={displayedLabel} />
        </div>
        <svg
          viewBox={`0 0 ${vbWidth} 600`}
          className="w-full max-w-[900px] h-auto"
          preserveAspectRatio="xMidYMax meet"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Ground line — fade in */}
          <line
            x1="0"
            y1={gY}
            x2={vbWidth}
            y2={gY}
            stroke="hsl(203 24% 35%)"
            strokeWidth={sw}
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
                  x1={stem.x}
                  y1={gY}
                  x2={stem.x}
                  y2={topY}
                  stroke="hsl(203 24% 35%)"
                  strokeWidth={sw}
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
                  label={budLabels[stem.id]}
                  showLabel={activeBud === stem.id}
                  onClick={() => handleClick(stem.id)}
                  onHover={setHoveredBud}
                  delay={budDelays[stem.id] || 1}
                  visible={animated}
                  active={displayedLabelId === stem.id}
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
                        x1={stem.x}
                        y1={brY}
                        x2={brEndX}
                        y2={brY}
                        stroke="hsl(203 24% 35%)"
                        strokeWidth={sw}
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
                        onHover={setHoveredBud}
                        showLabel={activeBud === subId}
                        delay={budDelays[subId] || 1.2}
                        visible={animated}
                        active={displayedLabelId === subId}
                      />
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>

        <style>{`
        .garden-typewriter{
          display:inline-block;
          font-family:'Manrope',system-ui,sans-serif;
          font-size:14px;
          font-weight:300;
          letter-spacing:0.28em;
          color:hsl(0 0% 55%);
          overflow:hidden;
          white-space:nowrap;
          width:0;
          max-width:100%;
          border-right:1px solid transparent;
          vertical-align:bottom;
        }
        .garden-typewriter.visible{
          animation:gardenType 1.2s steps(32,end) .15s forwards,
                    gardenCaret .7s step-end .15s 1 forwards;
        }
        @keyframes gardenType{
          from{width:0;}
          to{width:100%;}
        }
        @keyframes gardenCaret{
          0%,100%{border-right-color:transparent;}
          50%{border-right-color:hsl(203 24% 40% / 0.6);}
        }
        .garden-bud circle:first-of-type{
          transition: fill 0.35s ease, stroke 0.35s ease, stroke-width 0.35s ease;
        }
        .garden-bud.is-active circle:first-of-type,
        .garden-bud:hover circle:first-of-type,
        .garden-bud:focus-visible circle:first-of-type{
          fill:#C8D9E6;
          stroke:#A8BDD0;
          stroke-width:1.4;
          outline:none;
        }
      `}</style>
      </div>
    </PageTransition>
  );
};

export default Garden;
