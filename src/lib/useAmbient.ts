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
  dawn: lab([188,172,162]),
  night: lab([35,31,28]),
};

// Local solar estimate, with optional browser coordinates. No coordinates leave the device.
type Location = { lat: number; lon: number };
// Approximate apparent solar elevation in degrees, continuous over the day.
// The timezone fallback is an approximation, never a claim of exact location.
function solarElevation(date: Date, location: Location | null): number {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const fallback: Record<string,Location> = {"Europe/Kyiv":{lat:50.45,lon:30.52},"Europe/Kiev":{lat:50.45,lon:30.52}};
  const loc = location ?? fallback[zone];
  const h = date.getHours()+date.getMinutes()/60+date.getSeconds()/3600+date.getMilliseconds()/3600000;
  if (!loc) return 45*Math.cos((h-13)*Math.PI/12);
  const n = (Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())-Date.UTC(date.getFullYear(),0,0))/86400000;
  const yearDays=(Date.UTC(date.getFullYear()+1,0,1)-Date.UTC(date.getFullYear(),0,1))/86400000;
  const g=2*Math.PI/yearDays*(n-1+(h-12)/24);
  const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
  const decl=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
  const lat=loc.lat*Math.PI/180;
  const angle=(h*60+eq+4*loc.lon+date.getTimezoneOffset()-720)*Math.PI/720;
  return Math.asin(Math.max(-1,Math.min(1,Math.sin(lat)*Math.sin(decl)+Math.cos(lat)*Math.cos(decl)*Math.cos(angle))))*180/Math.PI;
}
export function ambientWeights(elevation: number) {
  const smooth=(v:number)=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
  const night=1-smooth((elevation+12)/12);
  const day=smooth(elevation/15);
  return {night,day,dawn:Math.max(0,1-night-day)};
}
export function useAmbient() {
  const [mode, setMode] = useState<Mode>(() => {
    try { const m = localStorage.getItem(KEY) as Mode; return modes.includes(m) ? m : "auto"; } catch { return "auto"; }
  });
  const [date,setDate] = useState(()=>new Date());
  const [location,setLocation] = useState<Location|null>(null);
  useEffect(()=>{
    let active=true;
    // Do not prompt on arrival; use location only if the visitor already granted permission.
    if(navigator.permissions && navigator.geolocation) navigator.permissions.query({name:"geolocation"}).then(p=>{
      if(active && p.state==="granted") navigator.geolocation.getCurrentPosition(pos=>{
        if(active) setLocation({lat:pos.coords.latitude,lon:pos.coords.longitude});
      },()=>{}, {maximumAge:86400000,timeout:4000});
    }).catch(()=>{});
    const tick=()=>setDate(new Date());
    const timer=window.setInterval(tick,1000);
    document.addEventListener("visibilitychange",tick);
    return ()=>{active=false;window.clearInterval(timer);document.removeEventListener("visibilitychange",tick);};
  },[]);
  useEffect(() => {
    const sync = () => { try { const m=localStorage.getItem(KEY) as Mode; if(modes.includes(m)) setMode(m); } catch {} };
    window.addEventListener("studio:ambient-mode",sync);
    window.addEventListener("storage",sync);
    return ()=>{window.removeEventListener("studio:ambient-mode",sync);window.removeEventListener("storage",sync);};
  },[]);
  const cycle = () => {
    const next=modes[(modes.indexOf(mode)+1)%modes.length];
    setMode(next);
    try {localStorage.setItem(KEY,next);} catch {}
    window.dispatchEvent(new Event("studio:ambient-mode"));
  };
  const weights=ambientWeights(solarElevation(date,location));
  // Separate morning and evening photo adapters without changing the shared solar cycle.
  const slope=solarElevation(new Date(date.getTime()+60000),location)-solarElevation(new Date(date.getTime()-60000),location);
  const t=Math.max(0,Math.min(1,.5-slope/.1));
  const evening=mode==="dusk"?1:mode==="dawn"?0:t*t*(3-2*t);
  let dawn=weights.dawn;
  let nightWeight=weights.night;
  if(mode==="dawn"){dawn=1;nightWeight=0;}
  if(mode==="day"){dawn=0;nightWeight=0;}
  if(mode==="dusk"){dawn=.65;nightWeight=.35;}
  if(mode==="night"){dawn=0;nightWeight=1;}
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
  return { mode, cycle, evening, dawn: dawnAlpha, nightWeight, night: dark, palette, background: "hsl("+bgHsl+")", exposure: (1.45-.16*dawn-.35*nightWeight).toFixed(3) };
}
