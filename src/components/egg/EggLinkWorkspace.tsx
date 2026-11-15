import { useEffect, useState } from "react";
import { Camera, Check, ExternalLink, FileText, Globe2, X } from "lucide-react";
import EggPhotoWorkspace from "./EggPhotoWorkspace";

/** Only web URLs may be embedded or linked. */
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

/**
 * Cached public-page preview comes from EGG server-side API.
 * It is not the user's live tab; cross-origin iframe pixels cannot be read.
 */
export default function EggLinkWorkspace({
 address,onClose,onCaptureText,onCaptureImage,onCaptureCrop,
}:{address:string;onClose:()=>void;
 onCaptureText?:(text:string,sourceUrl:string)=>void;
 onCaptureImage?:(file:File,sourceUrl:string)=>Promise<boolean>|boolean;
 onCaptureCrop?:(dataUrl:string,sourceUrl:string)=>void;
}){
 const url=normalizeSiteUrl(address);
 const [textOpen,setTextOpen]=useState(false);
 const [text,setText]=useState("");
 const [screenshot,setScreenshot]=useState<string|null>(null);
 const [error,setError]=useState("");
 const [capturing,setCapturing]=useState(false);
 const requestScreenshot=async()=>{
  if(!url||capturing)return;
  setCapturing(true);setError("");
  try{
   const response=await fetch("/api/egg?op=page-screenshot",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url}),
   });
   const result=await response.json() as {
    ok?:boolean;status?:string;imageDataUrl?:string;error?:string;
   };
   if(response.status===202||result.status==="pending"){
    setError("Снимок ещё формируется. Нажмите «Фрагмент» повторно.");
    return;
   }
   if(!response.ok||!result.ok||!result.imageDataUrl){
    setError("Снимок этой страницы не получен. Возможно, сайт ограничивает автоматический просмотр.");
    return;
   }
   setScreenshot(result.imageDataUrl);
   setTextOpen(false);
  }catch{
   setError("Сервис снимков недоступен. Попробуйте ещё раз.");
  }finally{setCapturing(false);}
 };
 const saveText=()=>{
  if(!url||!onCaptureText||!text.trim())return;
  onCaptureText(text.trim(),url);
  setText("");setError("");setTextOpen(false);
 };
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{
   if(event.key!=="Escape"||screenshot)return;
   event.stopPropagation();
   if(textOpen){setTextOpen(false);return;}
   onClose();
  };
  window.addEventListener("keydown",handler,true);
  return()=>window.removeEventListener("keydown",handler,true);
 },[onClose,textOpen,screenshot]);
 const host=url?new URL(url).host:address;
 const control="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-background/95 text-foreground shadow-[0_3px_14px_rgba(0,0,0,.15)] backdrop-blur-md hover:bg-background focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";
 return <section data-testid="egg-link-workspace" aria-label="Просмотр сайта" role="dialog"
  className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center p-2 sm:p-6">
  <div className="pointer-events-auto relative h-[min(76dvh,900px)] w-[min(92vw,1050px)] overflow-hidden bg-background shadow-[0_10px_45px_rgba(0,0,0,.16)] sm:h-[min(82dvh,900px)]"
    style={{borderRadius:"12px"}}>
   <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 sm:p-3">
    <span className="min-w-0 max-w-[45%] truncate rounded-full bg-background/90 px-3 py-2 text-[11px] text-foreground/70 shadow-sm backdrop-blur-md">
     <Globe2 size={13} className="mr-1 inline"/>{host}
    </span>
    <div className="pointer-events-auto flex items-center gap-1.5">
     {url&&onCaptureCrop&&<button type="button" aria-label="Фрагмент сайта" title="Получить снимок публичной страницы и выделить фрагмент"
       className={control} disabled={capturing} onClick={()=>void requestScreenshot()}><Camera size={18}/></button>}
     {url&&onCaptureText&&<button type="button" aria-label="Текст сайта" title="Сохранить текст"
       className={control} onClick={()=>{setTextOpen(v=>!v);setError("");}}><FileText size={18}/></button>}
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
   {textOpen&&url&&<div data-testid="egg-site-text-panel"
     className="pointer-events-auto absolute bottom-3 right-3 z-30 w-[min(330px,calc(100%-24px))] rounded-xl bg-background/95 p-3 shadow-[0_5px_28px_rgba(0,0,0,.22)] backdrop-blur-md">
     <div className="mb-2 flex items-center justify-between gap-2">
      <span className="text-sm font-medium">Текст из сайта</span>
      <button type="button" aria-label="Закрыть ввод текста" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-foreground/10"
       onClick={()=>setTextOpen(false)}><X size={16}/></button>
     </div>
     <textarea aria-label="Текст с сайта" rows={4} value={text} onChange={e=>setText(e.target.value)}
       placeholder="Скопируйте текст на сайте и вставьте сюда"
       className="w-full resize-y rounded-lg border border-foreground/15 bg-background p-2.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-foreground/40"/>
     <button type="button" aria-label="Добавить текст в поле" disabled={!text.trim()}
       onClick={saveText} className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-3 py-2.5 text-xs text-background disabled:opacity-35">
       <Check size={15}/> На холст
     </button>
    </div>}
   {error&&<div role="alert" className="absolute bottom-3 left-3 z-30 rounded-full bg-background/95 px-3 py-2 text-xs shadow-md">{error}</div>}
   {!textOpen&&url&&<div className="pointer-events-none absolute bottom-2 left-1/2 z-20 max-w-[92%] -translate-x-1/2 rounded-full bg-background/90 px-3 py-2 text-center text-[11px] text-foreground/65 shadow-sm backdrop-blur-md">
    «Фрагмент» передаёт публичный URL сервису WordPress.com для снимка. Это не текущий экран; снимок может быть устаревшим.
   </div>}
  </div>
  {screenshot&&url&&onCaptureCrop&&<EggPhotoWorkspace src={screenshot} title="Выделите область скриншота" cropOnly
    onSave={()=>{}} onCrop={cropped=>{onCaptureCrop(cropped,url);setScreenshot(null);}}
    onClose={()=>setScreenshot(null)}/>}
 </section>;
}
