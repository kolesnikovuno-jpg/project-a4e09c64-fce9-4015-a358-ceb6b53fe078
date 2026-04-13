import { useEffect, useRef, useCallback } from "react";

const PARTICLE_COUNT = 600;
const INFLUENCE_RADIUS = 180;
const ORGANIZE_STRENGTH = 0.012;
const DRIFT_SPEED = 0.3;
const LINE_DIST = 60;

interface Pt {
  x: number; y: number;
  ox: number; oy: number;
  vx: number; vy: number;
  targetX: number; targetY: number;
  size: number;
  phase: number;
}

function generateTargets(cx: number, cy: number, count: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const rings = 6;
  for (let i = 0; i < count; i++) {
    const ring = (i % rings) + 1;
    const angle = (i / count) * Math.PI * 2 * 3 + (ring * 0.5);
    const r = ring * 28 + Math.sin(i * 0.3) * 12;
    pts.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  }
  return pts;
}

const LyraConcept = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999, active: false, influence: 0 });
  const particlesRef = useRef<Pt[]>([]);
  const animRef = useRef(0);
  const timeRef = useRef(0);

  const init = useCallback((w: number, h: number) => {
    const cx = w / 2;
    const cy = h / 2;
    const targets = generateTargets(cx, cy, PARTICLE_COUNT);
    const pts: Pt[] = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      pts.push({
        x, y, ox: x, oy: y,
        vx: (Math.random() - 0.5) * DRIFT_SPEED,
        vy: (Math.random() - 0.5) * DRIFT_SPEED,
        targetX: targets[i].x,
        targetY: targets[i].y,
        size: Math.random() * 1.2 + 0.4,
        phase: Math.random() * Math.PI * 2,
      });
    }
    particlesRef.current = pts;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let w = 0, h = 0;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      const targets = generateTargets(w / 2, h / 2, PARTICLE_COUNT);
      particlesRef.current.forEach((p, i) => {
        if (targets[i]) { p.targetX = targets[i].x; p.targetY = targets[i].y; }
      });
      if (particlesRef.current.length === 0) init(w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (x: number, y: number) => {
      mouseRef.current.x = x;
      mouseRef.current.y = y;
      mouseRef.current.active = true;
    };
    const onMouse = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => { e.preventDefault(); onMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onLeave = () => { mouseRef.current.active = false; };

    window.addEventListener("mousemove", onMouse);
    canvas.addEventListener("touchmove", onTouch, { passive: false });
    canvas.addEventListener("touchstart", onTouch, { passive: false });
    window.addEventListener("mouseleave", onLeave);

    const animate = () => {
      timeRef.current += 0.016;
      const t = timeRef.current;
      const m = mouseRef.current;

      // Grow/decay influence
      if (m.active) {
        m.influence = Math.min(1, m.influence + 0.008);
      } else {
        m.influence = Math.max(0, m.influence - 0.003);
      }

      ctx.fillStyle = "rgba(12,12,14,0.15)";
      ctx.fillRect(0, 0, w, h);

      const pts = particlesRef.current;
      const inf = m.influence;

      for (const p of pts) {
        // Distance to mouse
        const dx = m.x - p.x;
        const dy = m.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const proximity = Math.max(0, 1 - dist / INFLUENCE_RADIUS);

        // Organize toward target based on influence + proximity
        const organize = inf * (0.3 + proximity * 0.7);
        const tx = p.targetX + Math.sin(t + p.phase) * (1 - organize) * 40;
        const ty = p.targetY + Math.cos(t * 0.7 + p.phase) * (1 - organize) * 40;

        p.vx += (tx - p.x) * ORGANIZE_STRENGTH * organize;
        p.vy += (ty - p.y) * ORGANIZE_STRENGTH * organize;

        // Drift when no influence
        p.vx += Math.sin(t * 0.5 + p.phase) * 0.02 * (1 - organize);
        p.vy += Math.cos(t * 0.3 + p.phase) * 0.02 * (1 - organize);

        // Mouse repulsion (subtle)
        if (dist < INFLUENCE_RADIUS && dist > 0) {
          const repel = proximity * 0.5;
          p.vx -= (dx / dist) * repel;
          p.vy -= (dy / dist) * repel;
        }

        p.vx *= 0.94;
        p.vy *= 0.94;
        p.x += p.vx;
        p.y += p.vy;

        // Wrap
        if (p.x < -20) p.x = w + 20;
        if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20;
        if (p.y > h + 20) p.y = -20;

        // Draw
        const alpha = 0.15 + organize * 0.55;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147,214,208,${alpha})`;
        ctx.fill();
      }

      // Lines between close organized particles
      if (inf > 0.05) {
        ctx.lineWidth = 0.3;
        for (let i = 0; i < pts.length; i++) {
          for (let j = i + 1; j < pts.length; j++) {
            const dx = pts[i].x - pts[j].x;
            const dy = pts[i].y - pts[j].y;
            const d = dx * dx + dy * dy;
            if (d < LINE_DIST * LINE_DIST) {
              const alpha = (1 - Math.sqrt(d) / LINE_DIST) * inf * 0.2;
              ctx.strokeStyle = `rgba(147,214,208,${alpha})`;
              ctx.beginPath();
              ctx.moveTo(pts[i].x, pts[i].y);
              ctx.lineTo(pts[j].x, pts[j].y);
              ctx.stroke();
            }
          }
        }
      }

      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      canvas.removeEventListener("touchmove", onTouch);
      canvas.removeEventListener("touchstart", onTouch);
      window.removeEventListener("mouseleave", onLeave);
    };
  }, [init]);

  return (
    <div className="fixed inset-0 w-full h-full" style={{ background: "#0c0c0e", touchAction: "none" }}>
      <canvas ref={canvasRef} className="block w-full h-full" />
      <p
        className="absolute bottom-12 left-0 right-0 text-center pointer-events-none select-none"
        style={{
          fontFamily: "'Manrope', system-ui, sans-serif",
          fontSize: "clamp(11px, 1.4vw, 14px)",
          fontWeight: 300,
          letterSpacing: "0.12em",
          color: "rgba(147,214,208,0.35)",
        }}
      >
        Form emerges at the boundary of forces
      </p>
    </div>
  );
};

export default LyraConcept;
