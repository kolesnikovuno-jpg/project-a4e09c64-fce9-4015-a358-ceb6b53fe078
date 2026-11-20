import {useEffect, useMemo, useState} from "react";
import {
  buildEggDnaCandidate, eggDnaSourceKey, emptyEggDnaReview,
  isEggDnaReviewComplete, parseEggDnaSuggestion,
  type EggDnaReview, type EggDnaFields,
} from "../../lib/eggDnaFormation";

type Source = {id:string;type:string;text:string};
const keyFor=(id:string)=>"egg:dna-review:v1:"+id;
function readReview(projectId:string):EggDnaReview {
  try {
    const value=JSON.parse(localStorage.getItem(keyFor(projectId))||"null");
    if(value&&typeof value==="object"&&
      ["formedIdea","essence","invariants","openParameters","sourceKey"].every(k=>typeof value[k]==="string")&&
      (value.reviewedAt===null||typeof value.reviewedAt==="string")) {
      return {
        formedIdea:value.formedIdea.slice(0,3000),
        essence:value.essence.slice(0,1200),
        invariants:value.invariants.slice(0,1200),
        openParameters:value.openParameters.slice(0,700),
        sourceKey:value.sourceKey,
        reviewedAt:value.reviewedAt,
      };
    }
  }catch{/* Local source remains author-editable. */}
  return emptyEggDnaReview();
}
export default function EggDnaFormation({
  projectId,intent,constraints,materials,materialInsight,visualSourceKey="",suggestedIdea="",latestAnswer,
  onRequestAi,onReviewChange,
}:{
  projectId:string;intent:string;constraints:string;
  materials:Source[];materialInsight:string;visualSourceKey?:string;suggestedIdea?:string;latestAnswer:string;
  onRequestAi:(prompt:string)=>void;
  onReviewChange:(reviewedCandidate:{dna:string;idea:string}|null)=>void;
}){
  const [fields,setFields]=useState<EggDnaReview>(()=>readReview(projectId));
  const [notice,setNotice]=useState("");
  const sourceKey=eggDnaSourceKey(intent,constraints,materials,materialInsight,visualSourceKey);
  const candidate=useMemo(()=>buildEggDnaCandidate(fields),[fields]);
  const ready=!!suggestedIdea.trim()&&!!candidate&&isEggDnaReviewComplete(fields,sourceKey);

  useEffect(()=>{setFields(readReview(projectId));setNotice("");},[projectId]);
  useEffect(()=>{try{localStorage.setItem(keyFor(projectId),JSON.stringify(fields));}
   catch{setNotice("Недостаточно места для сохранения черновика ДНК в браузере.");}
  },[projectId,fields]);
  useEffect(()=>{onReviewChange(ready&&candidate?{dna:candidate,idea:fields.formedIdea.trim()}:null);},[ready,candidate,fields.formedIdea,onReviewChange]);

  function edit(field:keyof EggDnaFields,value:string){
    setFields(previous=>({...previous,[field]:value,reviewedAt:null}));
    setNotice("");
  }
  function request(){
    if(!suggestedIdea.trim()){setNotice("Сначала завершите внешний круг восьми сфер и проверьте сформированную Идею.");return;}
    onRequestAi(
      "Предложи КАНДИДАТ ДНК на основании намерения Автора, принятого Материального и нашего исследования. "+
      "Сначала установи сущность, затем отдели инварианты от переменных свойств. "+
      "Верни РОВНО четыре раздела, каждый с меткой в начале строки: "+
      "ИДЕЯ: (краткая рабочая формулировка). СУЩНОСТЬ: (для чего объект существует). "+
      "ИНВАРИАНТЫ: (что должно сохраняться, без жёстких материалов и формы). "+
      "ОТКРЫТЫЕ ПАРАМЕТРЫ: (что неизвестно или требует проверки). "+
      "Не придумывай внешние источники. Все положения пока гипотезы. "+
      "Не утверждай ДНК за Автора. "+
      "Рабочая формулировка Автора: "+(fields.formedIdea.trim()||suggestedIdea.trim()).slice(0,1100)
    );
    setNotice("Запрос направлен в диалог справа. После ответа нажмите «Перенести предложение ИИ».");
  }
  function importReply(){
    const parsed=parseEggDnaSuggestion(latestAnswer);
    if(!parsed){setNotice("В ответе нет явно разделённых сущности и инвариантов. Заполните поля вручную или повторите запрос.");return;}
    setFields(previous=>({...previous,
      ...parsed,formedIdea:parsed.formedIdea||previous.formedIdea||intent.slice(0,3000),
      reviewedAt:null,
    }));
    setNotice("Черновик ИИ перенесён в редактор. Проверьте каждый пункт перед авторским подтверждением.");
  }
  function review(){
    if(!suggestedIdea.trim()){setNotice("Перед ДНК требуется результат внешнего круга сфер.");return;}
    if(!candidate){setNotice("Укажите сформированную идею, сущность и хотя бы один инвариант (не короче 8 символов).");return;}
    setFields(previous=>({...previous,sourceKey,reviewedAt:new Date().toISOString()}));
    setNotice("Кандидат ДНК проверен Автором для текущих материалов. Серверная ДНК ещё не утверждена.");
  }
  const sourceChanged=!!fields.reviewedAt&&!ready;
  return <section className="rounded-xl border border-foreground/20 bg-background/90 p-3 sm:p-4 space-y-3"
    data-testid="egg-dna-formation" aria-label="Формирование Идеи и ДНК">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-medium">Идея → ДНК</h3>
      <span className="text-[11px] text-foreground/60">{ready?"Проверено Автором":"Рабочий кандидат"}</span>
    </div>
    <p className="text-xs leading-relaxed text-foreground/65">
      Внешний круг сфер формирует Идею. ДНК — короткая выжимка её устойчивых принципов.
      ИИ предлагает, Автор проверяет. До серверного утверждения этот текст не влияет на Желток и сферы.
    </p>
    <label className="block text-xs text-foreground/70">Сформированная Идея
      <textarea aria-label="Сформированная Идея" rows={3} maxLength={3000}
        value={fields.formedIdea} onChange={e=>edit("formedIdea",e.target.value)}
        placeholder="Что именно должно существовать? Не обязательно называть традиционный предмет."
        className="mt-1 w-full resize-y rounded-lg border border-foreground/20 bg-background p-3 text-sm"/>
    </label>
    {!fields.formedIdea&&<button type="button" disabled={!suggestedIdea.trim()}
      onClick={()=>edit("formedIdea",suggestedIdea.trim())}
      className="rounded-full border border-foreground/25 px-3 py-2 text-xs disabled:opacity-40"
      data-testid="egg-use-formed-idea">
      Взять сформированную Идею
    </button>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs text-foreground/70">Сущность · зачем это существует?
        <textarea aria-label="Сущность ДНК" rows={3} maxLength={1200}
          value={fields.essence} onChange={e=>edit("essence",e.target.value)}
          placeholder="Главный смысл и назначение; не техническое решение"
          className="mt-1 w-full resize-y rounded-lg border border-foreground/20 bg-background p-3 text-sm"/>
      </label>
      <label className="block text-xs text-foreground/70">Инварианты · что необходимо сохранить?
        <textarea aria-label="Инварианты ДНК" rows={3} maxLength={1200}
          value={fields.invariants} onChange={e=>edit("invariants",e.target.value)}
          placeholder="Принципы, которые нельзя потерять при смене формы"
          className="mt-1 w-full resize-y rounded-lg border border-foreground/20 bg-background p-3 text-sm"/>
      </label>
    </div>
    <label className="block text-xs text-foreground/70">Что остаётся открытым? · необязательно
      <textarea aria-label="Открытые параметры ДНК" rows={2} maxLength={700}
        value={fields.openParameters} onChange={e=>edit("openParameters",e.target.value)}
        placeholder="Материал, технология, морфология, неизвестные ограничения"
        className="mt-1 w-full resize-y rounded-lg border border-foreground/20 bg-background p-3 text-sm"/>
    </label>
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={request} disabled={!suggestedIdea.trim()}
        className="rounded-full border border-foreground/30 px-3 py-2 text-xs disabled:opacity-40"
        data-testid="egg-request-dna">Предложить ДНК с ИИ</button>
      <button type="button" onClick={importReply} disabled={!latestAnswer}
        className="rounded-full border border-foreground/30 px-3 py-2 text-xs disabled:opacity-40"
        data-testid="egg-import-dna">Перенести предложение ИИ</button>
      <button type="button" onClick={review} disabled={!candidate||ready||!suggestedIdea.trim()}
        className="rounded-full bg-[#607466] px-3 py-2 text-xs text-white disabled:opacity-40"
        data-testid="egg-review-dna">Проверено Автором · подготовить к утверждению</button>
    </div>
    {sourceChanged&&<p role="alert" className="text-xs text-amber-800">
      Исходное намерение, рамки, материалы или кандидат ДНК изменились. Проверьте и подтвердите снова.
    </p>}
    {ready&&<p role="status" className="rounded-lg border border-[#607466]/40 p-3 text-xs">
      ДНК подготовлена к серверному утверждению. Далее откройте «ДНК и цикл»;
      только отдельное действие Автора закрепит зерно в проекте.
    </p>}
    {notice&&<p role="status" className="text-xs text-foreground/65">{notice}</p>}
    <details className="text-xs text-foreground/60">
      <summary className="cursor-pointer">Источники и границы исследования</summary>
      <p className="mt-2">{materials.length} отобранных материалов; карта Материального: {materialInsight?"принята":"отсутствует"}.
        Вложения анализируются только при фактической передаче превью. Ссылки сами по себе не означают, что содержимое сайтов было прочитано.
        Автоматический поиск в интернете пока не подключён.</p>
    </details>
  </section>;
}
