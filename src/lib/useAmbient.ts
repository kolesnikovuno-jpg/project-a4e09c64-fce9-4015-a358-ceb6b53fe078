import { useEffect, useState, type CSSProperties } from "react";

type Mode = "auto" | "day" | "night" | "dawn" | "dusk";
const KEY = "studio-ambient-mode";
const modes: Mode[] = ["auto", "dawn", "day", "dusk", "night"];
// Neutral architectural surfaces sampled from the Lyra photographs:
// day concrete 92/90/85, dawn 102/85/79, night 45/39/34.
// Lift the day/dawn surface values for reading; keep chroma restrained.
type Triple = [number, number, number];
const linear = (v: number) => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4;
const srgb = (v: number) => Math.max(0,Math.min(1,v <= .0031308 ? 12.92*v : 1.055*Math.pow(v,1/2.4)-.055));
const lab = (rgb: Triple): Triple => {
  const [r,g,b] = rgb.map(v=>linear(v/255));
  const l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b);
  const m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b);
  const s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
  return [.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s];
};
const rgb = ([L,a,b]: Triple): Triple => {
  const l=(L+.3963377774*a+.2158037573*b)**3;
  const m=(L-.1055613458*a-.0638541728*b)**3;
  const s=(L-.0894841775*a-1.291485548*b)**3;
  return [srgb(4.0767416621*l-3.3077115913*m+.2309699292*s),srgb(-1.2684380046*l+2.6097574011*m-.3413193965*s),srgb(-.0041960863*l-.7034186147*m+1.707614701*s)];
};
const toHsl = ([r,g,b]: Triple): string => {
  const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min, l=(max+min)/2;
  let h=0;
  if(d>1e-8) { h=max===r ? (g-b)/d : max===g ? (b-r)/d+2 : (r-g)/d+4; h=((h*60)%360+360)%360; }
  const sat=d>1e-8 ? d/(1-Math.abs(2*l-1)) : 0;
  return h.toFixed(2)+" "+(sat*100).toFixed(2)+"% "+(l*100).toFixed(2)+"%";
};
const luminance = (c: Triple) => .2126*linear(c[0])+.7152*linear(c[1])+.0722*linear(c[2]);
const contrast = (a: Triple,b: Triple) => (Math.max(luminance(a),luminance(b))+.05)/(Math.min(luminance(a),luminance(b))+.05);
const anchors = {
  day: lab([239,237,233]),
  dawn: lab([219,205,196]),
  night: lab([35,31,28]),
};

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
  // Blend in OKLab; use the same actual image contribution for the palette.
  const dayWeight = Math.max(0,1-dawn-nightWeight);
  const bgLab = anchors.day.map((v,i)=>v*dayWeight+anchors.dawn[i]*dawn+anchors.night[i]*nightWeight) as Triple;
  const bg = rgb(bgLab);
  const inkDark: Triple = [32/255,30/255,28/255];
  const inkLight: Triple = [239/255,234/255,228/255];
  const dark = contrast(bg,inkLight)>contrast(bg,inkDark);
  const fg = dark ? inkLight : inkDark;
  const bgHsl = toHsl(bg), fgHsl = toHsl(fg);
  const palette = {
    "--background": bgHsl,
    "--foreground": fgHsl,
    "--ambient-accent": fgHsl,
    "--ambient-egg": "hsl("+fgHsl+" / "+(0.055-0.01*nightWeight)+")",
    "--ambient-background": "hsl("+bgHsl+")",
    "--ambient-foreground": "hsl("+fgHsl+")",
  } as CSSProperties;
  // Night is the top photo layer; compensate the dawn alpha so the underlying
  // daytime photo does not leak through a night-to-dawn transition.
  const dawnAlpha = nightWeight >= 1 ? 0 : Math.min(1,dawn/(1-nightWeight));
  return { mode, cycle: () => setMode(m => modes[(modes.indexOf(m)+1)%modes.length]), dawn: dawnAlpha, nightWeight, night: dark, palette, background: "hsl("+bgHsl+")", exposure: (1.45-.16*dawn-.35*nightWeight).toFixed(3) };
}
