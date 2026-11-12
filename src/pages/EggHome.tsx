import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import EggSpherePanel from "../components/egg/EggSpherePanel";
import { YOLK_SPHERES } from "../components/egg/EggYolkExperience";
import type { SphereId } from "../lib/eggEngine";
export default function EggHome(){
 const [selected,setSelected]=useState<SphereId|null>(null);
 const [open,setOpen]=useState(false);
 const [angle,setAngle]=useState(0);
 const [typed,setTyped]=useState(0);
 const pointer=useRef<{x:number;angle:number}|null>(null);
 const meta=YOLK_SPHERES.find(s=>s.id===selected);
 const text=meta?.detail??"Восемь сфер исследуют разные стороны идеи. В центре формируется Желток — рабочая форма концепта.";
 useEffect(()=>{setTyped(0);if(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches){setTyped(text.length);return;}
 let n=0;const timer=window.setInterval(()=>{n++;setTyped(n);if(n>=text.length)clearInterval(timer);},25);
 return()=>clearInterval(timer);},[text]);
 return <main className="min-h-screen bg-background px-4 py-5 text-foreground sm:px-8" data-testid="egg-public-experience">
  <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 text-xs">
   <a href="https://kolesnikov.studio" className="text-foreground/50">kolesnikov.studio</a>
   <span className="tracking-[.3em]">EGG</span>
   <Link to="/egg/connect" className="rounded-full border border-foreground/25 px-4 py-2">Войти / Регистрация</Link>
  </header>
  <div className="mx-auto grid min-h-[calc(100dvh-110px)] max-w-7xl items-center gap-6 lg:grid-cols-[1fr_300px]">
   <section className="relative mx-auto aspect-square w-full max-w-[min(90vw,76vh,750px)] touch-pan-y select-none" aria-label="Интерактивное Яйцо">
    <div className="absolute inset-[8%] rounded-[50%] border border-foreground/15 bg-foreground/[.015] shadow-[inset_0_0_65px_rgba(127,127,127,.04)]"
     onPointerDown={e=>{pointer.current={x:e.clientX,angle};e.currentTarget.setPointerCapture(e.pointerId);}}
     onPointerMove={e=>{if(pointer.current)setAngle(pointer.current.angle+(e.clientX-pointer.current.x)*.5);}}
     onPointerUp={()=>{pointer.current=null;}} onPointerCancel={()=>{pointer.current=null;}}/>
    <div className="pointer-events-none absolute inset-[20%] rounded-[50%] border border-foreground/10"/>
    <div className="pointer-events-none absolute inset-[32%] rounded-full border border-foreground/20 bg-foreground/[.07] shadow-[inset_12px_12px_45px_rgba(127,127,127,.08)]"/>
    <span className="pointer-events-none absolute left-1/2 top-[2%] -translate-x-1/2 text-[10px] tracking-[.2em] text-foreground/55">ИДЕЯ</span>
    <span className="pointer-events-none absolute bottom-[2%] left-1/2 -translate-x-1/2 text-[10px] tracking-[.2em] text-foreground/55">МАТЕРИЯ</span>
    {YOLK_SPHERES.map(s=>{const a=(s.angle+angle)*Math.PI/180;return <button key={s.id} type="button" data-testid={"egg-public-sphere-"+s.id}
      onClick={()=>setSelected(s.id)} aria-pressed={selected===s.id}
      style={{left:(50+42*Math.cos(a))+"%",top:(50+42*Math.sin(a))+"%",borderColor:s.accent}}
      className={"absolute z-10 flex h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background/95 px-1 text-center text-[10px] shadow-sm transition-[left,top] duration-75 sm:h-[78px] sm:w-[78px] sm:text-xs "+(selected===s.id?"ring-2 ring-foreground/30":"")}>{s.name}</button>;})}
   </section>
   <aside className="mx-auto w-full max-w-[380px] pb-8 lg:pb-0" aria-live="polite">
    <p className="text-[10px] uppercase tracking-[.2em] text-foreground/45">{meta?"Сфера / "+meta.tag:"EGG / знакомство"}</p>
    <h1 className="mt-4 text-3xl font-extralight">{meta?.name??"Яйцо"}</h1>
    <p className="mt-4 min-h-24 text-sm leading-7 text-foreground/65">{text.slice(0,typed)}{typed<text.length&&"▍"}</p>
    {meta?<button type="button" onClick={()=>setOpen(true)} className="mt-3 border-b border-foreground/40 pb-1 text-sm">Развернуть →</button>:<p className="mt-2 text-xs text-foreground/45">Нажмите на сферу или вращайте Яйцо движением по его поверхности.</p>}
    <p className="mt-9 text-xs text-foreground/45">Ознакомительный режим · изменения недоступны</p>
    <Link to="/egg/connect" className="mt-3 inline-flex rounded-full border border-foreground/25 px-5 py-3 text-sm">Войти для работы →</Link>
   </aside>
  </div>
  {meta&&open&&<EggSpherePanel key={meta.id} sphere={meta.id} name={meta.name} summary={meta.detail} status="Ознакомление" projectId={null} guest onClose={()=>setOpen(false)}/>}
 </main>;
}
