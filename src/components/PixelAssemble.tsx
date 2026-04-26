import { useEffect, useRef, useState } from "react";

interface PixelAssembleProps {
  src: string;
  pixelSize?: number;
  duration?: number;
  onComplete?: () => void;
  className?: string;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Renders a canvas that assembles `src` from many scattered pixels,
 * then fades out to reveal the underlying image (handled by parent).
 */
const PixelAssemble = ({
  src,
  pixelSize = 2,
  duration = 1600,
  onComplete,
  className,
}: PixelAssembleProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let rafId = 0;
    let cancelled = false;

    const setSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setSize();

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;

    img.onload = () => {
      if (cancelled) return;
      const cw = canvas.width;
      const ch = canvas.height;

      // cover-fit, mirror object-cover with mobile shift (75%) / desktop center
      const isMobile = cw < 768;
      const scale = Math.max(cw / img.width, ch / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const focusX = isMobile ? 0.75 : 0.5;
      const offX = (cw - drawW) * focusX;
      const offY = (ch - drawH) * 0.5;

      // Render image into offscreen canvas at viewport size to sample pixels
      const off = document.createElement("canvas");
      off.width = cw;
      off.height = ch;
      const octx = off.getContext("2d")!;
      octx.drawImage(img, offX, offY, drawW, drawH);
      const data = octx.getImageData(0, 0, cw, ch).data;

      const cols = Math.ceil(cw / pixelSize);
      const rows = Math.ceil(ch / pixelSize);

      type P = {
        tx: number; ty: number;
        sx: number; sy: number;
        color: string;
        delay: number;
      };
      const pixels: P[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const px = c * pixelSize;
          const py = r * pixelSize;
          const sxIdx = Math.min(px + (pixelSize >> 1), cw - 1);
          const syIdx = Math.min(py + (pixelSize >> 1), ch - 1);
          const i = (syIdx * cw + sxIdx) * 4;
          const a = data[i + 3];
          if (a < 8) continue;
          // scatter origin: from all sides — pick a point outside the viewport edges
          const angle = Math.random() * Math.PI * 2;
          // distance beyond the diagonal so origin is always off-screen
          const maxR = Math.hypot(cw, ch) * 0.6;
          const dist = maxR + Math.random() * maxR * 0.5;
          pixels.push({
            tx: px,
            ty: py,
            sx: cw / 2 + Math.cos(angle) * dist,
            sy: ch / 2 + Math.sin(angle) * dist,
            color: `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`,
            // mostly random arrival so the image converges from every side at once
            delay: Math.random() * 0.55,
          });
        }
      }

      const start = performance.now();
      const total = duration;
      const ps = pixelSize;

      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - start;
        const globalT = Math.min(elapsed / total, 1);

        ctx.clearRect(0, 0, cw, ch);

        for (let k = 0; k < pixels.length; k++) {
          const p = pixels[k];
          // each pixel has its own normalized timeline based on delay
          const local = (globalT - p.delay) / (1 - p.delay);
          if (local <= 0) continue;
          const t = local >= 1 ? 1 : easeOutCubic(local);
          const x = p.sx + (p.tx - p.sx) * t;
          const y = p.sy + (p.ty - p.sy) * t;
          ctx.globalAlpha = Math.min(1, local * 1.4);
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, ps, ps);
        }
        ctx.globalAlpha = 1;

        if (globalT < 1) {
          rafId = requestAnimationFrame(tick);
        } else {
          // assembled — let parent reveal the underlying <img>; keep canvas painted
          onComplete?.();
        }
      };
      rafId = requestAnimationFrame(tick);
    };

    const onResize = () => {
      // keep simple: do not restart on resize during the short animation
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
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

export default PixelAssemble;