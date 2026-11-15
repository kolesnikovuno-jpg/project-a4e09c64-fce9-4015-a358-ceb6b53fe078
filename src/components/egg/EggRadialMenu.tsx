import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { ChevronLeft, CircleDot, Menu, type LucideIcon } from "lucide-react";

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
export default function EggRadialMenu({ actions, title = "EGG" }: { actions: EggMenuAction[]; title?: string }) {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState<EggMenuAction[]>([]);
  const [rotation, setRotation] = useState(0);
  const dial = useRef<HTMLDivElement>(null);
  const drag = useRef<{id:number; angle:number; startRotation:number; moved:boolean; itemId:string|null}|null>(null);
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
    drag.current={id:event.pointerId,angle:angleAt(event.clientX,event.clientY),startRotation:rotation,moved:false,itemId:button?.dataset.dialItem??null};
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch{/* no capture in synthetic test environments */}
    event.stopPropagation();
  };
  const move=(event:PointerEvent<HTMLDivElement>)=>{
    const tracking=drag.current;
    if(!tracking||tracking.id!==event.pointerId)return;
    const nextAngle=angleAt(event.clientX,event.clientY);
    const delta=normalizeDelta(nextAngle-tracking.angle);
    tracking.angle=nextAngle;
    if(Math.abs(delta)>5)tracking.moved=true;
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
  const position="fixed bottom-[max(.75rem,env(safe-area-inset-bottom))] left-[max(.5rem,env(safe-area-inset-left))] h-[min(330px,calc(100vw-1rem))] w-[min(330px,calc(100vw-1rem))]";
  if(!open)return (
    <div className={position+" pointer-events-none z-[75]"} data-testid="egg-menu-fixed-position">
      <button type="button" aria-label="Открыть круговое меню" title="Меню EGG" onClick={()=>setOpen(true)}
        className="pointer-events-auto absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#63766a]/25 bg-[#607466] text-[#faf8f3] shadow-[0_10px_30px_rgba(57,68,55,.18)] transition-transform hover:scale-105">
        <CircleDot size={26} strokeWidth={1.25}/>
      </button>
    </div>
  );
  return (
    <div className="fixed inset-0 z-[75]" aria-label="Круговое меню EGG">
      <button type="button" aria-label="Закрыть круговое меню" className="absolute inset-0 cursor-default bg-[#f6f1e9]/15 backdrop-blur-[1px]" onClick={close}/>
      <div ref={dial} data-testid="egg-menu-fixed-position"
        className={position+" select-none touch-none"}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel}>
        <svg viewBox="0 0 330 330" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          <circle cx="165" cy="165" r="149" fill="#f8f5ef" fillOpacity=".97" stroke="#8d978a" strokeOpacity=".28"/>
          <circle cx="165" cy="165" r="113" fill="none" stroke="#8d978a" strokeOpacity=".2"/>
          <circle cx="165" cy="165" r="56" fill="none" stroke="#8d978a" strokeOpacity=".22"/>
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
            className={"absolute flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full border bg-[#fffdf8]/95 p-1 text-[#45534a] shadow-sm transition-[left,top,background-color] duration-75 hover:bg-[#eaf0e8] disabled:opacity-35 "+
              (entry.selected?"border-[#607466]/70 bg-[#ecf0e9]":"border-[#8a978b]/20")}>
            <Icon size={21} strokeWidth={1.5} color={entry.tint}/>
            <span className="max-w-[69px] text-center text-[10px] leading-[1.05rem]">{entry.label}</span>
          </button>;
        })}
        <button type="button" data-dial-hub aria-label={path.length?"Назад к разделам":"Закрыть меню"}
          onPointerDown={e=>e.stopPropagation()}
          onClick={()=>{if(path.length)setPath(v=>v.slice(0,-1));else close();}}
          className="absolute left-1/2 top-1/2 flex h-[100px] w-[100px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-1 rounded-full bg-[#607466] text-[#faf8f3] shadow-lg">
          {path.length?<ChevronLeft size={25}/>:<Menu size={25} strokeWidth={1.5}/>}
          <span className="max-w-[83px] text-center text-[12px] font-medium leading-tight">{current?.label||title}</span>
        </button>
      </div>
    </div>
  );
}
