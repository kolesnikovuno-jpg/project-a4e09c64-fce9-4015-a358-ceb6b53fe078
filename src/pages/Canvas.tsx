import { useEffect, useRef } from "react";

class Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  alpha: number;
  life: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.size = Math.random() * 2 + 0.5;
    this.speedX = (Math.random() - 0.5) * 1;
    this.speedY = (Math.random() - 0.5) * 1;
    this.alpha = Math.random() * 0.5 + 0.2;
    this.life = 100;
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.life--;
    this.alpha *= 0.97;
  }

  draw(c: CanvasRenderingContext2D) {
    c.beginPath();
    c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    c.fillStyle = `rgba(147,214,208,${this.alpha})`;
    c.fill();
  }
}

function distance(p1: Particle, p2: Particle) {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const Canvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    const particles = particlesRef.current;

    function resize() {
      canvas!.width = window.innerWidth;
      canvas!.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function createBurst(x: number, y: number, count = 12) {
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y));
      }
    }

    function handleMove(x: number, y: number) {
      createBurst(x, y, 2);
    }

    const onMouseMove = (e: MouseEvent) => handleMove(e.clientX, e.clientY);
    const onClick = (e: MouseEvent) => createBurst(e.clientX, e.clientY, 20);
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      handleMove(t.clientX, t.clientY);
    };
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const t = e.touches[0];
      createBurst(t.clientX, t.clientY, 20);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClick);
    canvas.addEventListener("touchmove", onTouchMove, { passive: false });
    canvas.addEventListener("touchstart", onTouchStart, { passive: false });

    function connect() {
      const maxDist = 70;
      for (let a = 0; a < particles.length; a++) {
        for (let b = a + 1; b < particles.length; b++) {
          const dist = distance(particles[a], particles[b]);
          if (dist < maxDist) {
            const opacity = (1 - dist / maxDist) * 0.15;
            c!.strokeStyle = `rgba(147,214,208,${opacity})`;
            c!.lineWidth = 0.4;
            c!.beginPath();
            c!.moveTo(particles[a].x, particles[a].y);
            c!.lineTo(particles[b].x, particles[b].y);
            c!.stroke();
          }
        }
      }
    }

    let animId: number;
    function animate() {
      c!.fillStyle = "rgba(255,255,255,0.2)";
      c!.fillRect(0, 0, canvas!.width, canvas!.height);

      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw(c!);
        if (particles[i].life <= 0) {
          particles.splice(i, 1);
          i--;
        }
      }
      connect();
      animId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClick);
      canvas.removeEventListener("touchmove", onTouchMove);
      canvas.removeEventListener("touchstart", onTouchStart);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full" style={{ zIndex: 0, touchAction: "none" }}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};

export default Canvas;
