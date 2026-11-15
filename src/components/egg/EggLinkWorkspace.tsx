import { useEffect, useRef, useState } from "react";
import { Check, ClipboardPaste, ExternalLink, FileImage, Globe2, Maximize2, Minimize2, NotebookPen, X } from "lucide-react";

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
export default function EggLinkWorkspace({
 address,onClose,onCaptureText,onCaptureImage,
}:{address:string;onClose:()=>void;
 onCaptureText?:(text:string,sourceUrl:string)=>void;
 onCaptureImage?:(file:File,sourceUrl:string)=>Promise<boolean>|boolean;
}){
 const url=normalizeSiteUrl(address);
 const [expanded,setExpanded]=useState(false);
 const [captureOpen,setCaptureOpen]=useState(false);
 const [captureText,setCaptureText]=useState("");
 const [captureError,setCaptureError]=useState("");
 const [working,setWorking]=useState(false);
 const captureInput=useRef<HTMLInputElement>(null);
 const importImage=async(file?:File|null)=>{
  if(!file||!url||!file.type.startsWith("image/")||!onCaptureImage)return;
  setWorking(true);setCaptureError("");
  try{
   const saved=await onCaptureImage(file,url);
   if(saved===false){setCaptureError("Не удалось сохранить изображение в поле.");return;}
   setCaptureOpen(false);
  }catch{setCaptureError("Не удалось сохранить изображение в поле.");}
  finally{setWorking(false);}
 };
 const pasteFromClipboard=async()=>{
  if(!url)return;
  setCaptureError("");
  if(!navigator.clipboard?.readText){setCaptureError("Используйте «Вставить» в поле текста или загрузите изображение.");return;}
  try{
   const text=await navigator.clipboard.readText();
   if(text.trim())setCaptureText(text);
   else setCaptureError("Буфер пуст. Скопируйте фрагмент текста на сайте.");
  }catch{setCaptureError("Доступ к буферу не предоставлен. Вставьте текст вручную.");}
 };
 const storeText=()=>{
  if(!url||!onCaptureText||!captureText.trim())return;
  onCaptureText(captureText.trim(),url);
  setCaptureText("");setCaptureError("");setCaptureOpen(false);
 };
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
     {(onCaptureText||onCaptureImage)&&<button type="button" aria-label="Сохранить материал сайта" title="Сохранить референс"
      className={control} onClick={()=>{setCaptureOpen(v=>!v);setCaptureError("");}}><NotebookPen size={18}/></button>}
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
   {captureOpen&&url&&<div data-testid="egg-site-capture-panel"
      className="pointer-events-auto absolute bottom-3 right-3 z-30 w-[min(360px,calc(100%-24px))] rounded-xl bg-background/95 p-3 shadow-[0_5px_28px_rgba(0,0,0,.22)] backdrop-blur-md">
      <div className="mb-2 flex items-center justify-between gap-2">
       <span className="text-sm font-medium">Сохранить из сайта</span>
       <button type="button" aria-label="Закрыть сбор материала" onClick={()=>setCaptureOpen(false)}
        className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-foreground/10"><X size={16}/></button>
      </div>
      <p className="mb-2 text-xs text-foreground/65">Скопируйте текст или сохраните изображение с сайта. Материал появится в поле EGG со ссылкой на источник.</p>
      {onCaptureText&&<>
       <textarea aria-label="Текст с сайта" rows={3} value={captureText} onChange={e=>setCaptureText(e.target.value)}
        onPaste={e=>{const imageFile=Array.from(e.clipboardData.files).find(file=>file.type.startsWith("image/"));if(imageFile&&onCaptureImage){e.preventDefault();void importImage(imageFile);}}}
        placeholder="Вставьте выделенный текст из сайта…"
        className="w-full resize-y rounded-lg border border-foreground/15 bg-background p-2.5 text-sm outline-none focus-visible:ring-1 focus-visible:ring-foreground/40"/>
       <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" onClick={()=>void pasteFromClipboard()}
         className="flex items-center gap-1 rounded-full border border-foreground/15 px-3 py-2 text-xs"><ClipboardPaste size={15}/> Вставить</button>
        <button type="button" aria-label="Добавить текст в поле" onClick={storeText} disabled={!captureText.trim()}
         className="flex items-center gap-1 rounded-full bg-foreground px-3 py-2 text-xs text-background disabled:opacity-35"><Check size={15}/> Сохранить текст</button>
       </div>
      </>}
      {onCaptureImage&&<>
       <input ref={captureInput} type="file" accept="image/*" className="hidden"
        aria-label="Выбрать изображение с сайта" onChange={e=>{void importImage(e.target.files?.[0]);e.target.value="";}}/>
       <button type="button" aria-label="Добавить изображение с сайта" disabled={working}
        onClick={()=>captureInput.current?.click()}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-foreground/15 px-3 py-2.5 text-xs disabled:opacity-40">
        <FileImage size={16}/> {working?"Сохранение…":"Загрузить изображение или скриншот"}
       </button>
      </>}
      {captureError&&<p role="alert" className="mt-2 text-xs text-foreground/70">{captureError}</p>}
      <div className="mt-2 truncate text-[10px] text-foreground/45" title={url}>Источник: {url}</div>
     </div>}
   {url&&!captureOpen&&<div className="pointer-events-none absolute bottom-2 left-1/2 z-20 max-w-[92%] -translate-x-1/2 rounded-full bg-background/90 px-3 py-2 text-center text-[11px] text-foreground/65 shadow-sm backdrop-blur-md">
    Если сайт не открывается здесь, используйте <a href={url} target="_blank" rel="noopener noreferrer"
     className="pointer-events-auto underline underline-offset-2">внешнюю ссылку</a>.
   </div>}
  </div>
 </section>;
}
