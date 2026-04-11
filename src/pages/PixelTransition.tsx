import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import photoA from "@/assets/photo-a.jpg";
import photoB from "@/assets/photo-b.jpg";

const PIXEL_SIZE = 8;
const TRANSITION_DURATION = 2500;
const HOLD_DURATION = 3000;

interface Pixel {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  color: string;
  targetColor: string;
  delay: number;
}

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
): { colors: string[][]; cols: number; rows: number; offsetX: number; offsetY: number } {
  const offscreen = document.createElement("canvas");
  // fit image into canvas maintaining aspect ratio
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

  const animRef = useRef<{
    pixels: Pixel[];
    phase: "hold" | "scatter" | "gather" | "holdB";
    phaseStart: number;
    currentImage: 0 | 1;
    imagesData: ReturnType<typeof getPixels>[];
  } | null>(null);

  const init = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const images = await Promise.all([loadImage(photoA), loadImage(photoB)]);
    const dataA = getPixels(images[0], canvas.width, canvas.height, PIXEL_SIZE);
    const dataB = getPixels(images[1], canvas.width, canvas.height, PIXEL_SIZE);

    // Create initial pixels from image A
    const pixels: Pixel[] = [];
    for (let row = 0; row < dataA.rows; row++) {
      for (let col = 0; col < dataA.cols; col++) {
        const x = dataA.offsetX + col * PIXEL_SIZE;
        const y = dataA.offsetY + row * PIXEL_SIZE;
        pixels.push({
          x, y, targetX: x, targetY: y,
          startX: x, startY: y,
          color: dataA.colors[row][col],
          targetColor: dataA.colors[row][col],
          delay: Math.random() * 0.3,
        });
      }
    }

    animRef.current = {
      pixels,
      phase: "hold",
      phaseStart: performance.now(),
      currentImage: 0,
      imagesData: [dataA, dataB],
    };

    setLoaded(true);

    let animId: number;

    const animate = (now: number) => {
      const state = animRef.current!;
      const elapsed = now - state.phaseStart;

      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (state.phase === "hold" || state.phase === "holdB") {
        // Just draw pixels in place
        for (const p of state.pixels) {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
        }

        if (elapsed > HOLD_DURATION) {
          // Start scatter phase
          const nextImg = state.currentImage === 0 ? 1 : 0;
          const nextData = state.imagesData[nextImg];
          
          // Scatter: pixels fly off to the left with randomness
          for (const p of state.pixels) {
            p.startX = p.x;
            p.startY = p.y;
            p.targetX = -200 + Math.random() * -300;
            p.targetY = p.y + (Math.random() - 0.5) * canvas.height * 0.6;
            p.delay = Math.random() * 0.25;
          }
          state.phase = "scatter";
          state.phaseStart = now;

          // Prepare gather targets from next image
          const gatherPixels: { x: number; y: number; color: string }[] = [];
          for (let row = 0; row < nextData.rows; row++) {
            for (let col = 0; col < nextData.cols; col++) {
              gatherPixels.push({
                x: nextData.offsetX + col * PIXEL_SIZE,
                y: nextData.offsetY + row * PIXEL_SIZE,
                color: nextData.colors[row][col],
              });
            }
          }

          // Resize pixel array if needed, assign gather targets
          const maxLen = Math.max(state.pixels.length, gatherPixels.length);
          while (state.pixels.length < maxLen) {
            // duplicate random pixels if we need more
            const src = state.pixels[Math.floor(Math.random() * state.pixels.length)];
            state.pixels.push({ ...src, delay: Math.random() * 0.25 });
          }
          // Store gather targets in a stash
          (state as any).gatherTargets = gatherPixels;
          (state as any).nextImage = nextImg;
        }
      } else if (state.phase === "scatter") {
        const progress = Math.min(elapsed / TRANSITION_DURATION, 1);

        for (const p of state.pixels) {
          const t = Math.max(0, Math.min(1, (progress - p.delay) / (1 - p.delay)));
          const e = easeInOutCubic(t);
          p.x = p.startX + (p.targetX - p.startX) * e;
          p.y = p.startY + (p.targetY - p.startY) * e;
          const alpha = 1 - t * 0.7;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
        }
        ctx.globalAlpha = 1;

        if (progress >= 1) {
          // Start gather phase — pixels come from right
          const gatherTargets = (state as any).gatherTargets as { x: number; y: number; color: string }[];
          const nextImg = (state as any).nextImage as 0 | 1;

          // Trim or use pixels
          state.pixels.length = gatherTargets.length;

          for (let i = 0; i < gatherTargets.length; i++) {
            const p = state.pixels[i];
            if (!p) continue;
            p.startX = canvas.width + 200 + Math.random() * 300;
            p.startY = gatherTargets[i].y + (Math.random() - 0.5) * canvas.height * 0.6;
            p.targetX = gatherTargets[i].x;
            p.targetY = gatherTargets[i].y;
            p.targetColor = gatherTargets[i].color;
            p.color = gatherTargets[i].color;
            p.x = p.startX;
            p.y = p.startY;
            p.delay = Math.random() * 0.25;
          }

          state.phase = "gather";
          state.phaseStart = now;
          state.currentImage = nextImg;
        }
      } else if (state.phase === "gather") {
        const progress = Math.min(elapsed / TRANSITION_DURATION, 1);

        for (const p of state.pixels) {
          const t = Math.max(0, Math.min(1, (progress - p.delay) / (1 - p.delay)));
          const e = easeInOutCubic(t);
          p.x = p.startX + (p.targetX - p.startX) * e;
          p.y = p.startY + (p.targetY - p.startY) * e;
          const alpha = 0.3 + t * 0.7;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
        }
        ctx.globalAlpha = 1;

        if (progress >= 1) {
          // Snap to final positions
          for (const p of state.pixels) {
            p.x = p.targetX;
            p.y = p.targetY;
          }
          state.phase = "holdB";
          state.phaseStart = now;
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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

  return (
    <div className="fixed inset-0 bg-white">
      <canvas ref={canvasRef} className="block w-full h-full" />
      <button
        onClick={() => navigate("/")}
        className="absolute top-4 left-4 text-xs tracking-widest text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        ← .uno
      </button>
    </div>
  );
};

export default PixelTransition;
