import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { ChevronLeft, CircleDot, type LucideIcon } from "lucide-react";
import {useEggUi} from "../../i18n/eggUi";

export type EggMenuAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect?: () => void;
  children?: EggMenuAction[];
  disabled?: boolean;
  selected?: boolean;
  tint?: string;
};

/**
 * One fixed dial: the compact launcher and the expanded hub share a center.
 * All actions orbit around it continuously instead of replacing fixed slots.
 */
export default function EggRadialMenu({ actions, title = "EGG", side = "left" }: { actions: EggMenuAction[]; title?: string; side?:"left"|"right" }) {
  const {ui}=useEggUi();
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<EggMenuAction[]>([]);
  const [rotation, setRotation] = useState(0);
  const dial = useRef<HTMLDivElement>(null);
  const drag = useRef<{id:number; angle:number; startRotation:number; travel:number; moved:boolean; itemId:string|null}|null>(null);
  const suppressClick = useRef<{id:string;time:number}|null>(null);
  const current = path[path.length - 1];
  const entries = current?.children ?? actions;
  const angleAt = (x:number,y:number) => {
    const bounds=dial.current?.getBoundingClientRect();
    if(!bounds)return 0;
    return Math.atan2(y-(bounds.top+bounds.height/2),x-(bounds.left+bounds.width/2))*180/Math.PI;
  };
  const normalizeDelta=(value:number)=>((value+540)%360)-180;
  useEffect(() => { setRotation(0); }, [path.length, current?.id]);
  useEffect(() => {
    if(!open)return;
    const key=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();if(path.length)setPath(v=>v.slice(0,-1));else setOpen(false);}
      if(event.key==="ArrowRight"){event.preventDefault();setRotation(v=>v+30);}
      if(event.key==="ArrowLeft"){event.preventDefault();setRotation(v=>v-30);}
    };
    window.addEventListener("keydown",key);
    return()=>window.removeEventListener("keydown",key);
  },[open,path.length]);
  const close=()=>{setOpen(false);setPath([]);setRotation(0);};
  const select=(item:EggMenuAction)=>{
    if(item.disabled)return;
    if(item.children?.length){setPath(value=>[...value,item]);return;}
    item.onSelect?.();
    close();
  };
  const wheel=(event:WheelEvent<HTMLDivElement>)=>{
    event.stopPropagation();event.preventDefault();
    const delta=event.deltaY+event.deltaX;
    if(Math.abs(delta)>2)setRotation(v=>v+(delta>0?18:-18));
  };
  const down=(event:PointerEvent<HTMLDivElement>)=>{
    if((event.target as Element).closest("[data-dial-hub]"))return;
    if(event.pointerType==="mouse"&&event.button!==0)return;
    const button=(event.target as Element).closest("[data-dial-item]") as HTMLElement|null;
    drag.current={id:event.pointerId,angle:angleAt(event.clientX,event.clientY),startRotation:rotation,travel:0,moved:false,itemId:button?.dataset.dialItem??null};
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch{/* no capture in synthetic test environments */}
    event.stopPropagation();
  };
  const move=(event:PointerEvent<HTMLDivElement>)=>{
    const tracking=drag.current;
    if(!tracking||tracking.id!==event.pointerId)return;
    const nextAngle=angleAt(event.clientX,event.clientY);
    const delta=normalizeDelta(nextAngle-tracking.angle);
    tracking.angle=nextAngle;
    tracking.travel+=Math.abs(delta);
    if(tracking.travel>5)tracking.moved=true;
    if(tracking.moved){
      // Integrate successive angular changes so a complete revolution has no 180° jump.
      tracking.startRotation+=delta;
      setRotation(tracking.startRotation);
    }
    event.stopPropagation();
  };
  const up=(event:PointerEvent<HTMLDivElement>)=>{
    const tracking=drag.current;
    if(!tracking||tracking.id!==event.pointerId)return;
    drag.current=null;
    try{event.currentTarget.releasePointerCapture(event.pointerId);}catch{/* optional */}
    if(!tracking.moved&&tracking.itemId){
      const item=entries.find(entry=>entry.id===tracking.itemId);
      if(item){suppressClick.current={id:item.id,time:Date.now()};select(item);}
    }
    event.stopPropagation();
  };
  const position="egg-menu-dial fixed bottom-[max(.5rem,env(safe-area-inset-bottom))] "+(side==="right"?"right-[max(.5rem,env(safe-area-inset-right))] ":"left-[max(.5rem,env(safe-area-inset-left))] ");
  if(!open)return (
    <div className={position+" pointer-events-none z-[75]"} data-testid="egg-menu-fixed-position">
      <button type="button" aria-label={ui.menuOpen} title={ui.menuTitle} onClick={()=>setOpen(true)}
        className="egg-menu-launcher pointer-events-auto absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#989a92]/50 bg-[#f8f6f1]/65 text-[#777b73] shadow-[0_2px_12px_rgba(65,64,56,.06)] backdrop-blur-[3px] transition-colors hover:border-[#777b73]/70 hover:bg-[#f8f6f1]/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#989a92]">
        <CircleDot size={24} strokeWidth={1.05}/>
      </button>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[75]" aria-label={ui.menuTitle}>
      <button type="button" aria-label={ui.menuClose} className="absolute inset-0 cursor-default bg-[#f6f1e9]/5" onClick={close}/>
      <div ref={dial} data-testid="egg-menu-fixed-position"
        className={position+" select-none touch-none"}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
        <svg viewBox="0 0 330 330" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx="165" cy="165" r="149" fill="#f8f5ef" fillOpacity=".13" stroke="#9c9e95" strokeOpacity=".30"/>
          <circle cx="165" cy="165" r="113" fill="none" stroke="#9c9e95" strokeOpacity=".22"/>
          <circle cx="165" cy="165" r="56" fill="none" stroke="#9c9e95" strokeOpacity=".26"/>
        </svg>
        {entries.map((entry,index)=>{
          const angle=(-90+index*360/entries.length+rotation)*Math.PI/180;
          const style={left:(50+Math.cos(angle)*34.25)+"%",top:(50+Math.sin(angle)*34.25)+"%"};
          const Icon=entry.icon;
          return <button type="button" key={entry.id} data-dial-item={entry.id} data-testid="egg-menu-orbit-item"
            disabled={entry.disabled} aria-label={entry.label}
            style={style} onClick={()=>{
              const previous=suppressClick.current;
              if(previous?.id===entry.id&&Date.now()-previous.time<400){suppressClick.current=null;return;}
              select(entry);
            }}
            className={"egg-menu-orbit-item absolute flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border bg-[#faf9f6]/85 p-1 text-[#727770] shadow-[0_2px_12px_rgba(65,64,56,.06)] backdrop-blur-sm transition-[left,top,background-color] duration-75 hover:bg-[#f8f6f1] disabled:opacity-35 "+
              (entry.selected?"border-[#8b9286]/65 bg-[#ebece7]/90":"border-[#a6a89e]/40")}>
            <Icon size={20} strokeWidth={1.25} color={entry.tint}/>
            <span className="egg-menu-orbit-label max-w-[69px] break-words text-center text-[10px] font-normal leading-[1.05rem]">{entry.label}</span>
          </button>;
        })}
        <button type="button" data-dial-hub aria-label={path.length?ui.menuBack:ui.menuExit}
          onPointerDown={e=>e.stopPropagation()}
          onClick={()=>{if(path.length)setPath(v=>v.slice(0,-1));else close();}}
          className="egg-menu-hub absolute left-1/2 top-1/2 flex h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border border-[#92958b]/50 bg-[#f8f6f1]/90 text-[#727770] shadow-[0_2px_12px_rgba(65,64,56,.07)] backdrop-blur-sm">
          {path.length?<ChevronLeft size={23} strokeWidth={1.25}/>:<CircleDot size={25} strokeWidth={1.05}/>}
          <span className="max-w-[83px] text-center text-[12px] font-medium leading-tight">{current?.label||title}</span>
        </button>
      </div>
    </div>
  );
}
