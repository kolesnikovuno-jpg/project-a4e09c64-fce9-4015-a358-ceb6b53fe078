import { useEffect, useState, type CSSProperties } from "react";

type Mode = "auto" | "day" | "night" | "dawn" | "dusk";
const KEY = "studio-ambient-mode";
const modes: Mode[] = ["auto", "dawn", "day", "dusk", "night"];
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
  const h = mode === "auto" ? hour : mode === "dawn" ? 7 : mode === "day" ? 12 : mode === "dusk" ? 18.7 : 23;
  const lerp = (a: number, b: number) => Math.max(0, Math.min(1, (h-a)/(b-a)));
  const smooth = (v: number) => v*v*(3-2*v);
  const dawn = h < 7 ? smooth(lerp(5,7)) : 1-smooth(lerp(7,10));
  const nightWeight = h < 7 ? 1-smooth(lerp(5,7)) : smooth(lerp(17,21));
  // All palette values use the same time weights as the photo layers.
  const mix = (a: number[], b: number[], t: number) => a.map((v,i) => v+(b[i]-v)*t);
  const hsl = (v: number[]) => v.map((n,i) => n.toFixed(2)+(i ? "%" : "")).join(" ");
  const warm = mix([24,26,94],[26,29,76],dawn);
  const bg = mix(warm,[40,7,10],nightWeight);
  // Maintain readable contrast, including twilight; foreground changes sides at mid-luminance.
  const dark = bg[2] < 52;
  const fg = dark ? mix([35,15,92],[35,15,82],nightWeight) : mix([0,0,20],[26,16,23],dawn);
  const accent = dark ? [203,22,76] : [203,24,32];
  const palette = {
    "--background": hsl(bg),
    "--foreground": hsl(fg),
    "--ambient-accent": hsl(accent),
    "--ambient-egg": "hsl("+hsl(fg)+" / "+(0.055-0.01*nightWeight)+")",
    "--ambient-background": "hsl("+hsl(bg)+")",
    "--ambient-foreground": "hsl("+hsl(fg)+")",
  } as CSSProperties;
  return { mode, cycle: () => setMode(m => modes[(modes.indexOf(m)+1)%modes.length]), dawn, nightWeight, night: dark, palette, background: "hsl("+hsl(bg)+")", exposure: (1.45-.16*dawn-.35*nightWeight).toFixed(3) };
}
