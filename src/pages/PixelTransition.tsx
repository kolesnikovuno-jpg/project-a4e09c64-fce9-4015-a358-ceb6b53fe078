import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import photoA from "@/assets/photo-a.jpg";
import photoB from "@/assets/photo-b.jpg";

const PIXEL_SIZE = 4;
const TRANSITION_DURATION = 3000;


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
  dying: boolean; // scattering away
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

  const animRef = useRef<{
    dyingPixels: Pixel[];
    birthPixels: Pixel[];
    holdPixels: Pixel[];
    phase: "idle" | "morph";
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

    // Create initial hold pixels from image A
    const holdPixels: Pixel[] = [];
    for (let row = 0; row < dataA.rows; row++) {
      for (let col = 0; col < dataA.cols; col++) {
        const x = dataA.offsetX + col * PIXEL_SIZE;
        const y = dataA.offsetY + row * PIXEL_SIZE;
        holdPixels.push({
          x, y, targetX: x, targetY: y,
          startX: x, startY: y,
          color: dataA.colors[row][col],
          targetColor: dataA.colors[row][col],
          delay: 0, dying: false,
        });
      }
    }

    animRef.current = {
      dyingPixels: [],
      birthPixels: [],
      holdPixels,
      phase: "idle",
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

      if (state.phase === "idle") {
        for (const p of state.holdPixels) {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
        }
      } else if (state.phase === "morph") {
        const progress = Math.min(elapsed / TRANSITION_DURATION, 1);

        // Draw dying pixels (scatter left, fade out)
        for (const p of state.dyingPixels) {
          const t = Math.max(0, Math.min(1, (progress - p.delay) / (1 - p.delay)));
          const e = easeInOutCubic(t);
          p.x = p.startX + (p.targetX - p.startX) * e;
          p.y = p.startY + (p.targetY - p.startY) * e;
          ctx.globalAlpha = 1 - t;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
        }

        // Draw birth pixels (gather from right, fade in)
        for (const p of state.birthPixels) {
          const t = Math.max(0, Math.min(1, (progress - p.delay) / (1 - p.delay)));
          const e = easeInOutCubic(t);
          p.x = p.startX + (p.targetX - p.startX) * e;
          p.y = p.startY + (p.targetY - p.startY) * e;
          ctx.globalAlpha = t;
          ctx.fillStyle = p.color;
          ctx.fillRect(p.x, p.y, PIXEL_SIZE - 1, PIXEL_SIZE - 1);
        }

        ctx.globalAlpha = 1;

        if (progress >= 1) {
          // Snap birth pixels as new hold
          state.holdPixels = state.birthPixels.map(p => ({
            ...p,
            x: p.targetX,
            y: p.targetY,
          }));
          state.dyingPixels = [];
          state.birthPixels = [];
          state.phase = "idle";
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

  const handleClick = useCallback(() => {
    const state = animRef.current;
    if (state && state.phase === "idle") {
      const now = performance.now();
      const canvas = canvasRef.current!;
      const nextImg = state.currentImage === 0 ? 1 : 0;
      const nextData = state.imagesData[nextImg];

      const dying: Pixel[] = state.holdPixels.map(p => ({
        ...p,
        startX: p.x,
        startY: p.y,
        targetX: -200 + Math.random() * -400,
        targetY: p.y + (Math.random() - 0.5) * canvas.height * 0.8,
        delay: Math.random() * 0.4,
        dying: true,
      }));

      const birth: Pixel[] = [];
      for (let row = 0; row < nextData.rows; row++) {
        for (let col = 0; col < nextData.cols; col++) {
          const tx = nextData.offsetX + col * PIXEL_SIZE;
          const ty = nextData.offsetY + row * PIXEL_SIZE;
          birth.push({
            x: canvas.width + 200 + Math.random() * 400,
            y: ty + (Math.random() - 0.5) * canvas.height * 0.8,
            startX: canvas.width + 200 + Math.random() * 400,
            startY: ty + (Math.random() - 0.5) * canvas.height * 0.8,
            targetX: tx,
            targetY: ty,
            color: nextData.colors[row][col],
            targetColor: nextData.colors[row][col],
            delay: Math.random() * 0.4,
            dying: false,
          });
        }
      }

      state.dyingPixels = dying;
      state.birthPixels = birth;
      state.holdPixels = [];
      state.phase = "morph";
      state.phaseStart = now;
      state.currentImage = nextImg;
    }
  }, []);

  return (
    <div className="fixed inset-0 bg-white cursor-pointer" onClick={handleClick}>
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
