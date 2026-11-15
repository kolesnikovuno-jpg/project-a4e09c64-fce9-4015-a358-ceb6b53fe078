import { useEffect, useState } from "react";
import { ExternalLink, Globe2, Maximize2, Minimize2, X } from "lucide-react";

/** Accept only normal web addresses; never embed javascript:, data:, file:, etc. */
export function normalizeSiteUrl(value:string):string|null {
 const trimmed=value.trim();
 if(!trimmed||/[\u0000-\u001f\u007f]/.test(trimmed))return null;
 const address=/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)?trimmed:"https://"+trimmed;
 try {
  const url=new URL(address);
  if(!["https:","http:"].includes(url.protocol)||!url.hostname||url.username||url.password)return null;
  return url.href;
 } catch {return null;}
}

/** Preview a collected external site as a free window over the EGG field. */
export default function EggLinkWorkspace({address,onClose}:{address:string;onClose:()=>void}){
 const url=normalizeSiteUrl(address);
 const [expanded,setExpanded]=useState(false);
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.stopPropagation();onClose();}};
  window.addEventListener("keydown",handler,true);
  return()=>window.removeEventListener("keydown",handler,true);
 },[onClose]);
 const host=url?new URL(url).host:address;
 const control="flex h-10 w-10 items-center justify-center rounded-full bg-background/95 text-foreground shadow-[0_3px_14px_rgba(0,0,0,.15)] backdrop-blur-md transition-colors hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
 return <section data-testid="egg-link-workspace" aria-label="Просмотр сайта" role="dialog"
  className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-6">
  <div className={"pointer-events-auto relative overflow-hidden bg-background shadow-[0_10px_45px_rgba(0,0,0,.16)] transition-[width,height] duration-200 "+
   (expanded?"h-[calc(100dvh-16px)] w-[calc(100vw-16px)] sm:h-[calc(100dvh-48px)] sm:w-[calc(100vw-48px)]":
    "h-[min(76dvh,900px)] w-[min(92vw,1050px)]")}
   style={{borderRadius:"12px"}}>
   <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-3">
    <span className="min-w-0 max-w-[50%] truncate rounded-full bg-background/90 px-3 py-2 text-[11px] text-foreground/70 shadow-sm backdrop-blur-md">
     <Globe2 size={13} className="mr-1 inline"/>{host}
    </span>
    <div className="pointer-events-auto flex items-center gap-1.5">
     {url&&<a data-testid="egg-site-open-external" href={url} target="_blank" rel="noopener noreferrer"
      aria-label="Открыть сайт отдельно" title="В браузере" className={control}><ExternalLink size={18}/></a>}
     <button type="button" aria-label={expanded?"Уменьшить окно сайта":"Развернуть окно сайта"}
      title={expanded?"Уменьшить окно":"Развернуть"} className={control}
      onClick={()=>setExpanded(value=>!value)}>{expanded?<Minimize2 size={18}/>:<Maximize2 size={18}/>}</button>
     <button type="button" aria-label="Закрыть сайт" title="Закрыть" className={control}
      onClick={onClose}><X size={19}/></button>
    </div>
   </div>
   {url?<iframe
     data-testid="egg-site-frame"
     key={url} src={url} title={"Сайт "+host}
     referrerPolicy="no-referrer"
     sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
     className="h-full w-full bg-white" />
    :<div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Globe2 size={28} className="text-foreground/45"/>
      <p className="text-sm">Это не адрес сайта. Укажите ссылку с http:// или https://.</p>
      <p className="break-all text-xs text-foreground/55">{address}</p>
     </div>}
   {url&&<div className="pointer-events-none absolute bottom-2 left-1/2 z-20 max-w-[92%] -translate-x-1/2 rounded-full bg-background/90 px-3 py-2 text-center text-[11px] text-foreground/65 shadow-sm backdrop-blur-md">
    Если сайт не открывается здесь, используйте <a href={url} target="_blank" rel="noopener noreferrer"
     className="pointer-events-auto underline underline-offset-2">внешнюю ссылку</a>.
   </div>}
  </div>
 </section>;
}
