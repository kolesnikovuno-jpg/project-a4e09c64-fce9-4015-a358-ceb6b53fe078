import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import photoA from "@/assets/photo-a.jpg";
import photoB from "@/assets/photo-b.jpg";

const PIXEL_SIZE = 4;
const TRANSITION_DURATION = 1800;
const SILENCE_HOLD = 350; // ms of guaranteed stillness after R reaches max

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function getPixels(
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number,
  pixelSize: number
) {
  const offscreen = document.createElement("canvas");
  const scale = Math.min(canvasW / img.width, canvasH / img.height) * 0.85;
  const w = Math.floor(img.width * scale);
  const h = Math.floor(img.height * scale);
  offscreen.width = w;
  offscreen.height = h;
  const ctx = offscreen.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const cols = Math.ceil(w / pixelSize);
  const rows = Math.ceil(h / pixelSize);
  const offsetX = Math.floor((canvasW - w) / 2);
  const offsetY = Math.floor((canvasH - h) / 2);

  const colors: string[][] = [];
  for (let row = 0; row < rows; row++) {
    colors[row] = [];
    for (let col = 0; col < cols; col++) {
      const sx = Math.min(col * pixelSize + pixelSize / 2, w - 1);
      const sy = Math.min(row * pixelSize + pixelSize / 2, h - 1);
      const i = (Math.floor(sy) * w + Math.floor(sx)) * 4;
      colors[row][col] = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
    }
  }
  return { colors, cols, rows, offsetX, offsetY };
}

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

const PixelTransition = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [loaded, setLoaded] = useState(false);

  // Single source of truth: ripple radius R drives everything.
  const animRef = useRef<{
    phase: "idle" | "morph" | "silence";
    phaseStart: number;
    currentImage: 0 | 1;
    nextImage: 0 | 1;
    imagesData: ReturnType<typeof getPixels>[];
    centerX: number;
    centerY: number;
    maxR: number;
  } | null>(null);

  const init = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // PRELOAD: do not render anything until both images are decoded and pixelated.
    const images = await Promise.all([loadImage(photoA), loadImage(photoB)]);
    const dataA = getPixels(images[0], canvas.width, canvas.height, PIXEL_SIZE);
    const dataB = getPixels(images[1], canvas.width, canvas.height, PIXEL_SIZE);

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    // Max radius covers the farthest corner of the viewport from center.
    const maxR = Math.hypot(Math.max(cx, canvas.width - cx), Math.max(cy, canvas.height - cy));

    animRef.current = {
      phase: "idle",
      phaseStart: performance.now(),
      currentImage: 0,
      nextImage: 0,
      imagesData: [dataA, dataB],
      centerX: cx,
      centerY: cy,
      maxR,
    };

    setLoaded(true);

    let animId: number;

    // Helper: draw a full image (pixelated grid) on the canvas.
    const drawImage = (data: ReturnType<typeof getPixels>) => {
      for (let row = 0; row < data.rows; row++) {
        for (let col = 0; col < data.cols; col++) {
          ctx.fillStyle = data.colors[row][col];
          ctx.fillRect(
            data.offsetX + col * PIXEL_SIZE,
            data.offsetY + row * PIXEL_SIZE,
            PIXEL_SIZE - 1,
            PIXEL_SIZE - 1
          );
        }
      }
    };

    // Helper: draw image clipped to a circle of radius R around (cx, cy).
    // Hard boundary — no fade, no soft edge. A pixel is shown iff its center
    // distance to (cx, cy) is <= R.
    const drawImageInsideRipple = (
      data: ReturnType<typeof getPixels>,
      cx: number,
      cy: number,
      R: number
    ) => {
      const r2 = R * R;
      const half = PIXEL_SIZE / 2;
      for (let row = 0; row < data.rows; row++) {
        const py = data.offsetY + row * PIXEL_SIZE + half;
        const dy = py - cy;
        const dy2 = dy * dy;
        if (dy2 > r2) continue;
        for (let col = 0; col < data.cols; col++) {
          const px = data.offsetX + col * PIXEL_SIZE + half;
          const dx = px - cx;
          if (dx * dx + dy2 > r2) continue;
          ctx.fillStyle = data.colors[row][col];
          ctx.fillRect(
            data.offsetX + col * PIXEL_SIZE,
            data.offsetY + row * PIXEL_SIZE,
            PIXEL_SIZE - 1,
            PIXEL_SIZE - 1
          );
        }
      }
    };

    const animate = (now: number) => {
      const state = animRef.current!;

      if (state.phase === "idle") {
        // Static frame already drawn after last morph; nothing to do.
        // Keep RAF alive for resize/click responsiveness, but skip redraw.
        animId = requestAnimationFrame(animate);
        return;
      }

      if (state.phase === "silence") {
        // Hold absolute stillness for SILENCE_HOLD ms — no redraw at all.
        if (now - state.phaseStart >= SILENCE_HOLD) {
          state.phase = "idle";
        }
        animId = requestAnimationFrame(animate);
        return;
      }

      // phase === "morph": single time → R mapping drives everything.
      const elapsed = now - state.phaseStart;
      const tRaw = Math.min(elapsed / TRANSITION_DURATION, 1);
      const t = easeInOutCubic(tRaw);
      const R = t * state.maxR;

      const current = state.imagesData[state.currentImage];
      const next = state.imagesData[state.nextImage];

      // 1. Background.
      ctx.fillStyle = "rgb(255,255,255)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 2. Outside the ripple → still the previous image.
      drawImage(current);

      // 3. Inside the ripple (distance <= R) → the next image. Hard boundary.
      drawImageInsideRipple(next, state.centerX, state.centerY, R);

      if (tRaw >= 1) {
        // Final frame: pure next image, no residual motion.
        ctx.fillStyle = "rgb(255,255,255)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawImage(next);
        state.currentImage = state.nextImage;
        state.phase = "silence";
        state.phaseStart = now;
      }

      animId = requestAnimationFrame(animate);
    };

    // Initial paint — image A, fully resolved.
    ctx.fillStyle = "rgb(255,255,255)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawImage(dataA);

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const s = animRef.current;
      if (!s) return;
      s.centerX = canvas.width / 2;
      s.centerY = canvas.height / 2;
      s.maxR = Math.hypot(
        Math.max(s.centerX, canvas.width - s.centerX),
        Math.max(s.centerY, canvas.height - s.centerY)
      );
      // Repaint current image so the canvas isn't blank after resize.
      ctx.fillStyle = "rgb(255,255,255)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawImage(s.imagesData[s.currentImage]);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  useEffect(() => {
    const cleanup = init();
    return () => { cleanup.then(fn => fn?.()); };
  }, [init]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const state = animRef.current;
    const canvas = canvasRef.current;
    if (!state || !canvas) return;
    // Only accept input when fully at rest. No interruption mid-ripple.
    if (state.phase !== "idle") return;

    const rect = canvas.getBoundingClientRect();
    state.centerX = e.clientX - rect.left;
    state.centerY = e.clientY - rect.top;
    state.maxR = Math.hypot(
      Math.max(state.centerX, canvas.width - state.centerX),
      Math.max(state.centerY, canvas.height - state.centerY)
    );
    state.nextImage = state.currentImage === 0 ? 1 : 0;
    state.phase = "morph";
    state.phaseStart = performance.now();
  }, []);

  return (
    <div className="fixed inset-0 bg-background cursor-pointer" onClick={handleClick}>
      <canvas ref={canvasRef} className="block w-full h-full pointer-events-none" />
      <button
        onClick={(e) => { e.stopPropagation(); navigate("/"); }}
        className="absolute top-4 left-4 text-xs tracking-widest text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        ← .uno
      </button>
    </div>
  );
};

export default PixelTransition;
