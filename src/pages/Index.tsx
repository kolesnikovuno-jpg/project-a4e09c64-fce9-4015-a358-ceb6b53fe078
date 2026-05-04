import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useAnimationControls } from "motion/react";
import { useIsNative } from "@/hooks/use-native";
import { useLocale } from "@/i18n/useLocale";
import Garden from "./Garden";

type Phase = "idle" | "fixating" | "moving" | "converged";

const Index = () => {
  const navigate = useNavigate();
  const isNative = useIsNative();
  const { localePath } = useLocale();

  const [phase, setPhase] = useState<Phase>("idle");
  const [hovered, setHovered] = useState(false);
  const [revealGarden, setRevealGarden] = useState(false);
  const smallControls = useAnimationControls();
  const fieldControls = useAnimationControls();
  const containerRef = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const smallRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isNative) navigate("/unocalc", { replace: true });
  }, [isNative, navigate]);

  const begin = async () => {
    if (phase !== "idle") return;
    setPhase("fixating");

    // Phase 3 — fixation (compress + densify)
    await smallControls.start({
      scale: 0.97,
      opacity: 1,
      transition: { duration: 0.14, ease: [0.4, 0, 0.6, 1] },
    });

    // Compute attraction vector toward large field center
    const container = containerRef.current?.getBoundingClientRect();
    const small = smallRef.current?.getBoundingClientRect();
    const field = fieldRef.current?.getBoundingClientRect();
    if (!container || !small || !field) {
      navigate(localePath("/garden"));
      return;
    }
    const smallCx = small.left + small.width / 2;
    const smallCy = small.top + small.height / 2;
    const fieldCx = field.left + field.width / 2;
    const fieldCy = field.top + field.height / 2;
    const dx = fieldCx - smallCx;
    const dy = fieldCy - smallCy;

    setPhase("moving");

    // Phase 5 — space reacts as motion begins
    fieldControls.start({
      scale: 1.018,
      opacity: 0.55,
      transition: { duration: 0.9, ease: [0.25, 0.1, 0.25, 1] },
    });

    // Phase 4 + 6 — attraction (ease-in) then settle (ease-out)
    await smallControls.start({
      x: dx,
      y: dy,
      scale: 0.4,
      opacity: 0.9,
      transition: {
        x: { duration: 0.95, ease: [0.32, 0.0, 0.67, 0.0] },
        y: { duration: 0.95, ease: [0.32, 0.0, 0.67, 0.0] },
        scale: { duration: 1.05, ease: [0.32, 0.0, 0.67, 0.2] },
        opacity: { duration: 1.05, ease: [0.4, 0, 0.2, 1] },
      },
    });

    // Final convergence settle
    await Promise.all([
      smallControls.start({
        scale: 0.05,
        opacity: 0,
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
      }),
      fieldControls.start({
        scale: 1.06,
        opacity: 0.85,
        transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] },
      }),
    ]);

    setPhase("converged");
    // Phase 7 — spatial transition: reveal garden in-place
    setRevealGarden(true);
    // Update URL silently after the visual reveal begins
    window.setTimeout(() => {
      window.history.replaceState({}, "", localePath("/garden"));
    }, 600);
  };

  return (
    <div
      ref={containerRef}
      className="relative min-h-screen w-full overflow-hidden bg-background"
    >
      {/* Garden — emerges within the same scene as a deeper layer */}
      <motion.div
        className="absolute inset-0 z-20"
        initial={{ opacity: 0, scale: 1.04, filter: "blur(8px)" }}
        animate={
          revealGarden
            ? { opacity: 1, scale: 1, filter: "blur(0px)" }
            : { opacity: 0, scale: 1.04, filter: "blur(8px)" }
        }
        transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ pointerEvents: revealGarden ? "auto" : "none" }}
      >
        {revealGarden && <Garden />}
      </motion.div>

      {/* Large circle — the field */}
      <motion.div
        ref={fieldRef}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          width: "min(72vmin, 720px)",
          height: "min(72vmin, 720px)",
          background:
            "radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.07) 0%, hsl(var(--primary) / 0.035) 45%, hsl(var(--primary) / 0) 72%)",
          border: "1px solid hsl(var(--primary) / 0.08)",
          opacity: 0.4,
        }}
        initial={{ scale: 1, opacity: 0.4 }}
        animate={fieldControls}
      />

      {/* Small circle — the visitor */}
      <motion.button
        ref={smallRef}
        onClick={begin}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        aria-label=""
        className="absolute left-1/2 top-1/2 z-10 rounded-full focus:outline-none"
        style={{
          width: 18,
          height: 18,
          marginLeft: -9,
          marginTop: -9,
          background: "hsl(var(--primary))",
          boxShadow: hovered
            ? "0 0 24px 2px hsl(var(--primary) / 0.35)"
            : "0 0 12px 0 hsl(var(--primary) / 0.18)",
          cursor: phase === "idle" ? "pointer" : "default",
          transition: "box-shadow 600ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
        initial={{ scale: 1, opacity: 0.92, x: 0, y: 0 }}
        animate={smallControls}
        disabled={phase !== "idle"}
      />
    </div>
  );
};

export default Index;
