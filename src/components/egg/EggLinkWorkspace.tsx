import { useEffect } from "react";
import { ExternalLink, Globe2, X } from "lucide-react";

/** Only ordinary web URLs may be embedded or linked. */
export function normalizeSiteUrl(value:string):string|null {
 const trimmed=value.trim();
 if(!trimmed||/[\u0000-\u001f\u007f]/.test(trimmed))return null;
 const address=/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)?trimmed:"https://"+trimmed;
 try {
  const url=new URL(address);
  if(!["https:","http:"].includes(url.protocol)||!url.hostname||url.username||url.password)return null;
  return url.href;
 }catch{return null;}
}

/**
 * A cross-origin iframe is opaque to EGG. We cannot anchor a note to its
 * internal content, scroll position, or interactive 3D model. Do not render
 * screen-fixed pins as though they were attached to the site.
 */
export default function EggLinkWorkspace({address,onClose}:{address:string;onClose:()=>void}){
 const url=normalizeSiteUrl(address);
 const host=url?new URL(url).host:address;
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{
   if(event.key!=="Escape")return;
   event.stopPropagation();onClose();
  };
  window.addEventListener("keydown",handler,true);
  return()=>window.removeEventListener("keydown",handler,true);
 },[onClose]);
 const control="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/95 text-foreground shadow-[0_3px_14px_rgba(0,0,0,.15)] backdrop-blur-md hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
 return <section data-testid="egg-link-workspace" aria-label="Просмотр сайта" role="dialog"
  className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-6">
  <div className="pointer-events-auto relative h-[min(76dvh,900px)] w-[min(92vw,1050px)] overflow-hidden bg-background shadow-[0_10px_45px_rgba(0,0,0,.16)] sm:h-[min(82dvh,900px)]" style={{borderRadius:"12px"}}>
   <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-3">
    <span className="min-w-0 max-w-[45%] truncate rounded-full bg-background/90 px-3 py-2 text-[11px] text-foreground/70 shadow-sm backdrop-blur-md">
     <Globe2 size={13} className="mr-1 inline"/>{host}
    </span>
    <div className="pointer-events-auto flex items-center gap-1.5">
     {url&&<a data-testid="egg-site-open-external" href={url} target="_blank" rel="noopener noreferrer"
       aria-label="Открыть сайт отдельно" title="В браузере" className={control}><ExternalLink size={18}/></a>}
     <button type="button" aria-label="Закрыть сайт" title="Закрыть" className={control} onClick={onClose}><X size={19}/></button>
    </div>
   </div>
   {url?<iframe data-testid="egg-site-frame" src={url} title={"Сайт "+host}
     referrerPolicy="no-referrer"
     sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
     className="h-full w-full bg-white"/>
    :<div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <Globe2 size={28} className="text-foreground/45"/>
      <p className="text-sm">Это не адрес сайта. Укажите ссылку с http:// или https://.</p>
      <p className="break-all text-xs text-foreground/55">{address}</p>
     </div>}
  </div>
 </section>;
}
