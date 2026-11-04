import { useState } from "react";
import {
  AI_HANDOFF_SPHERES,buildEggAiHandoff,type AiHandoffSphere
} from "../../lib/eggAiHandoff";

type Task={sphere:string;question:string;status:string};
export default function EggAiHandoff({
  projectId,sphere,revision,level,iteration,seed,concept,pendingConcept,remark,tasks=[],
}:{
  projectId:string;sphere:AiHandoffSphere;revision:number;level:number;iteration:number;
  seed:string;concept?:string;pendingConcept?:string;remark?:string;tasks?:Task[];
}){
  const [expanded,setExpanded]=useState(false);
  const [copied,setCopied]=useState(false);
  const [message,setMessage]=useState("");
  const safeReturnUrl=typeof window!=="undefined"
    ? window.location.origin+"/egg?project="+encodeURIComponent(projectId)+"&start="+encodeURIComponent(sphere)
    : "/egg?project="+encodeURIComponent(projectId)+"&start="+encodeURIComponent(sphere);
  const prompt=buildEggAiHandoff({projectId,sphere,revision,level,iteration,seed,concept,pendingConcept,remark,tasks,returnUrl:safeReturnUrl});
  async function copyContext(){
    try {
      if(!navigator.clipboard?.writeText)throw Error("clipboard_unavailable");
      await navigator.clipboard.writeText(prompt);
      setCopied(true);setMessage("Контекст скопирован. Вставьте его в диалог ChatGPT и продолжайте обсуждение.");
    }catch{
      setExpanded(true);
      setMessage("Автоматическое копирование недоступно. Выделите и скопируйте текст из поля ниже.");
    }
  }
  function switchToAi(){
    // Clipboard request is initiated synchronously by the user's click.
    void copyContext();
    window.open("https://chatgpt.com/","_blank","noopener,noreferrer");
    setExpanded(true);
  }
  return <section className="space-y-2 rounded-lg border border-foreground/15 p-3" aria-label={"Переход к AI: "+AI_HANDOFF_SPHERES[sphere]}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div><p className="text-sm font-medium">{sphere==="idea"?"Осмысление идеи с AI":"Диалог с AI"}</p>
      <p className="text-xs text-foreground/60">Сфера «{AI_HANDOFF_SPHERES[sphere]}» · ревизия {revision}</p></div>
      <button type="button" onClick={switchToAi} className="rounded-full border border-foreground/35 bg-foreground/5 px-4 py-2 text-sm">
        Переключиться на ChatGPT
      </button>
    </div>
    <p className="text-xs leading-relaxed text-foreground/65">{sphere==="idea"?"Откроется ChatGPT с контекстом для вставки. AI уточнит замысел по одному важному вопросу за раз, не повторяя известного, и поможет сформировать концепцию. Открытые параметры можно оставить открытыми.":"Откроется ChatGPT в новой вкладке. Контекст проекта копируется для вставки в чат. Вы сможете обсуждать и переосмыслять замысел столько, сколько нужно."} EGG ничего не утверждает автоматически.</p>
    <div className="flex flex-wrap gap-x-4 gap-y-2">
      <button type="button" onClick={()=>void copyContext()} className="text-xs underline underline-offset-4">Скопировать контекст</button>
      <button type="button" onClick={()=>setExpanded(open=>!open)} className="text-xs underline underline-offset-4">{expanded?"Скрыть текст для ChatGPT":"Посмотреть текст для ChatGPT"}</button>
      <a href={safeReturnUrl} className="text-xs underline underline-offset-4">Вернуться к сфере в EGG</a>
    </div>
    {message&&<p role="status" className="text-xs text-foreground/75">{message}</p>}
    {expanded&&<div className="space-y-2">
      <label className="block text-xs font-medium" htmlFor={"egg-ai-context-"+sphere}>Контекст для переноса в AI</label>
      <textarea id={"egg-ai-context-"+sphere} rows={7} readOnly value={prompt} onFocus={e=>e.target.select()}
        className="w-full resize-y rounded border border-foreground/20 bg-background p-3 text-xs leading-relaxed"
        aria-label="Контекст для копирования в ChatGPT"/>
      <p className="text-[11px] text-foreground/55">Ни ключи доступа, ни токены аккаунта в текст не включаются. Перед отправкой прочитайте содержание; в ChatGPT он попадёт только после вашего действия.</p>
      <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer" className="inline-block text-xs underline underline-offset-4">Открыть ChatGPT вручную</a>
    </div>}
    {copied&&<p className="text-[11px] text-foreground/55">После диалога вернитесь в EGG: в сфере «Идея» можно вставить согласованный текст концепции, в остальных сферах — сохранить рабочие результаты.</p>}
  </section>;
}
