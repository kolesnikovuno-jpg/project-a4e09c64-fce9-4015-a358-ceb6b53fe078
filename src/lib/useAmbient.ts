import { useEffect, useState } from "react";

type Mode = "auto" | "day" | "night" | "dawn";
const KEY = "studio-ambient-mode";
const modes: Mode[] = ["auto", "dawn", "day", "night"];
export function useAmbient() {
  const [mode, setMode] = useState<Mode>(() => {
    try { const m = localStorage.getItem(KEY) as Mode; return modes.includes(m) ? m : "auto"; } catch { return "auto"; }
  });
  const [hour, setHour] = useState(() => { const d = new Date(); return d.getHours() + d.getMinutes()/60; });
  useEffect(() => {
    const tick = () => { const d = new Date(); setHour(d.getHours() + d.getMinutes()/60); };
    const timer = window.setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, []);
  useEffect(() => { try { localStorage.setItem(KEY, mode); } catch {} }, [mode]);
  const h = mode === "auto" ? hour : mode === "dawn" ? 7 : mode === "day" ? 12 : 23;
  const lerp = (a: number, b: number) => Math.max(0, Math.min(1, (h-a)/(b-a)));
  const smooth = (v: number) => v*v*(3-2*v);
  const dawn = h < 7 ? smooth(lerp(5,7)) : 1-smooth(lerp(7,10));
  const nightWeight = h < 7 ? 1-smooth(lerp(5,7)) : smooth(lerp(17,21));
  return { mode, cycle: () => setMode(m => modes[(modes.indexOf(m)+1)%modes.length]), dawn, nightWeight, night: nightWeight > .5 };
}
