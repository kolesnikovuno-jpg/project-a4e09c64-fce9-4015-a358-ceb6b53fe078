import { useEffect, useRef } from "react";

interface PixelAssembleProps {
  src: string;
  pixelSize?: number;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

/**
 * Ripple-from-point reveal:
 *   point (hold) -> circle expands -> 3 ripple waves propagate
 *   -> pixels sharpen as each ripple passes (center -> edge)
 *   -> micro-settle (subtle scale 1 -> 1.01 -> 1).
 * No glow, no shadows. Monochrome strokes.
 */
const PixelAssemble = ({
  src,
  pixelSize = 2,
  duration = 2200,
  onComplete,
  className,
}: PixelAssembleProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const completedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let cancelled = false;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    canvas.width = Math.floor(cw * dpr);
    canvas.height = Math.floor(ch * dpr);
    canvas.style.width = cw + "px";
    canvas.style.height = ch + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      if (cancelled) return;

      const isMobile = cw < 768;
      const scale = Math.max(cw / img.width, ch / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const focusX = isMobile ? 0.75 : 0.5;
      const offX = (cw - drawW) * focusX;
      const offY = (ch - drawH) * 0.5;

      const off = document.createElement("canvas");
      off.width = cw;
      off.height = ch;
      const octx = off.getContext("2d")!;
      octx.drawImage(img, offX, offY, drawW, drawH);
      const data = octx.getImageData(0, 0, cw, ch).data;

      // Optical center — biased toward the focal subject
      const ox = cw * (isMobile ? 0.62 : 0.5);
      const oy = ch * 0.48;
      const maxR = Math.hypot(Math.max(ox, cw - ox), Math.max(oy, ch - oy));

      // Phase timings, scaled to provided duration
      const base = { point: 120, circle: 260, ripple: 1500, settle: 240 };
      const baseTotal = base.point + base.circle + base.ripple + base.settle;
      const k = duration / baseTotal;
      const tPoint = base.point * k;
      const tCircle = base.circle * k;
      const tRipple = base.ripple * k;
      const tSettle = base.settle * k;

      const ps = pixelSize;
      const cols = Math.ceil(cw / ps);
      const rows = Math.ceil(ch / ps);

      type P = { x: number; y: number; nr: number; color: string };
      const pixels: P[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = c * ps;
          const py = r * ps;
          const sx = Math.min(px + (ps >> 1), cw - 1);
          const sy = Math.min(py + (ps >> 1), ch - 1);
          const i = (sy * cw + sx) * 4;
          if (data[i + 3] < 8) continue;
          const dx = px + ps / 2 - ox;
          const dy = py + ps / 2 - oy;
          pixels.push({
            x: px,
            y: py,
            nr: Math.hypot(dx, dy) / maxR,
            color: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
          });
        }
      }

      const ripples = [0, 0.08, 0.16];
      const start = performance.now();

      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        ctx.clearRect(0, 0, cw, ch);

        if (elapsed < tPoint) {
          drawDot(ctx, ox, oy, 2);
          rafId = requestAnimationFrame(tick);
          return;
        }

        if (elapsed < tPoint + tCircle) {
          const t = (elapsed - tPoint) / tCircle;
          const e = easeOutCubic(t);
          drawDot(ctx, ox, oy, 2 * (1 - e));
          drawCircle(ctx, ox, oy, 2 + e * 38, 1, 0.9);
          rafId = requestAnimationFrame(tick);
          return;
        }

        const rippleStart = tPoint + tCircle;
        if (elapsed < rippleStart + tRipple) {
          const tR = (elapsed - rippleStart) / tRipple;
          const front = easeOutQuart(tR);

          for (let i2 = 0; i2 < pixels.length; i2++) {
            const p = pixels[i2];
            const d = front - p.nr;
            if (d <= -0.12) continue;
            let a: number;
            if (d >= 0) a = 1;
            else a = easeOutCubic(1 - Math.min(1, -d / 0.12));
            ctx.globalAlpha = a;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x, p.y, ps, ps);
          }
          ctx.globalAlpha = 1;

          for (let i2 = 0; i2 < ripples.length; i2++) {
            const local = (tR - ripples[i2]) / (1 - ripples[i2]);
            if (local <= 0 || local >= 1) continue;
            const e = easeOutCubic(local);
            drawCircle(ctx, ox, oy, e * maxR, 0.6, (1 - local) * 0.32);
          }

          rafId = requestAnimationFrame(tick);
          return;
        }

        // Settle: full image painted with subtle scale 1 -> 1.01 -> 1
        const tS = Math.min(1, (elapsed - rippleStart - tRipple) / tSettle);
        const s = 1 + 0.01 * Math.sin(easeInOutSine(tS) * Math.PI);
        ctx.save();
        ctx.translate(ox, oy);
        ctx.scale(s, s);
        ctx.translate(-ox, -oy);
        for (let i2 = 0; i2 < pixels.length; i2++) {
          const p = pixels[i2];
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, ps, ps);
        }
        ctx.restore();

        if (tS < 1) {
          rafId = requestAnimationFrame(tick);
        } else if (!completedRef.current) {
          completedRef.current = true;
          onComplete?.();
        }
      };
      rafId = requestAnimationFrame(tick);
    };

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
  }, [src, pixelSize, duration, onComplete]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ pointerEvents: "none" }}
    />
  );
};

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  if (r <= 0) return;
  ctx.fillStyle = "rgba(20,20,20,0.92)";
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawCircle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  lineWidth = 1,
  opacity = 0.9,
) {
  if (r <= 0) return;
  ctx.strokeStyle = `rgba(20,20,20,${opacity})`;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
}

export default PixelAssemble;
