import { useState } from "react";
import type { SphereId } from "../../lib/eggEngine";

type Mode="auto"|"symbiosis"|"manual";
const ROLES:Record<SphereId,{role:string;mission:string;output:string}>={
 marketing:{role:"Маркетинговый аналитик",mission:"Исследует аудиторию, потребности, контекст и гипотезы ценности.",output:"Рыночные гипотезы, аудитория и позиционирование"},
 legal:{role:"Юридический аналитик",mission:"Анализирует авторские права, лицензирование, ограничения и риски.",output:"Юридические вопросы, ограничения и рекомендации"},
 design:{role:"Дизайнер",mission:"Исследует форму, функцию, пропорции и визуальную выразительность.",output:"Варианты формы и открытые проектные вопросы"},
 production:{role:"Инженер-технолог",mission:"Исследует способы изготовления, сборку и технологические ограничения.",output:"Производственные гипотезы и ограничения"},
 testDrive:{role:"Специалист по испытаниям",mission:"Определяет проверяемые свойства, сценарии тестирования и критерии оценки.",output:"План испытаний и наблюдения"},
 procurement:{role:"Специалист по материалам и снабжению",mission:"Исследует материалы, комплектующие, доступность и альтернативы.",output:"Материальная спецификация и вопросы снабжения"},
 commerce:{role:"Экономист продукта",mission:"Анализирует затраты, цену и варианты экономической модели.",output:"Предварительная экономика и допущения"},
 retail:{role:"Специалист по ритейлу",mission:"Исследует каналы представления и передачи объекта пользователю.",output:"Гипотезы каналов и форматов предложения"},
};
export default function EggSpherePanel({sphere,name,summary,status,onClose}:{sphere:SphereId;name:string;summary:string;status:string;onClose:()=>void}){
 const [mode,setMode]=useState<Mode>("symbiosis");
 const [expanded,setExpanded]=useState(false);
 const [draft,setDraft]=useState("");
 const [notes,setNotes]=useState<string[]>([]);
 const [notice,setNotice]=useState("");
 const role=ROLES[sphere];
 const changeMode=(next:Mode)=>{setMode(next);setNotice("");};
 return <section className="fixed inset-x-3 bottom-3 z-50 mx-auto max-h-[86dvh] max-w-[540px] overflow-y-auto rounded-2xl border border-foreground/20 bg-background p-4 shadow-2xl sm:bottom-6 sm:p-5" role="dialog" aria-label={"Панель сферы "+name} data-testid="egg-sphere-panel">
  <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.17em] text-foreground/45">EGG / СФЕРА</p><h2 className="mt-1 text-lg font-light">{name}</h2></div><button type="button" onClick={onClose} className="rounded-full border border-foreground/20 px-3 py-1 text-sm" aria-label="Закрыть панель">×</button></div>
  <p className="mt-3 text-sm leading-relaxed text-foreground/75">{summary}</p>
  <button type="button" className="mt-2 border-b border-foreground/35 text-xs text-foreground/65" onClick={()=>setExpanded(v=>!v)} aria-expanded={expanded}>{expanded?"Свернуть":"Развернуть описание и роль ИИ"} →</button>
  {expanded&&<div className="mt-3 rounded-xl bg-foreground/5 p-3 text-xs leading-relaxed"><p className="font-medium">{role.role}</p><p className="mt-2">{role.mission}</p><p className="mt-2 text-foreground/65">Отделять факты от гипотез, сохранять источники, не изменять ДНК и не утверждать решения за Автора.</p><p className="mt-2">Выход: {role.output}.</p></div>}
  <div className="mt-4 border-t border-foreground/10 pt-3"><p className="mb-2 text-xs text-foreground/55">Режим обработки</p><div className="grid grid-cols-3 gap-1 rounded-xl bg-foreground/5 p-1" role="group" aria-label="Режим обработки">{([["auto","Авто"],["symbiosis","Симбиоз"],["manual","Ручной"]] as const).map(([value,label])=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>changeMode(value)} className={"rounded-lg px-2 py-2 text-xs transition-colors "+(mode===value?"bg-background text-foreground shadow-sm":"text-foreground/55")}>{label}</button>)}</div></div>
  <div className="mt-4 min-h-[150px] rounded-xl border border-foreground/15 p-3">
   {mode==="auto"?<><p className="text-sm font-medium">Автоматическая обработка</p><p className="mt-2 text-xs leading-relaxed text-foreground/65">Подключённый ИИ должен получить входной пакет и инструкцию роли, обработать данные и подготовить результат для следующей сферы.</p><p className="mt-3 text-xs text-foreground/50">Запуск появится после подключения исполнительного механизма EGG.</p></>:null}
   {mode==="symbiosis"?<><p className="text-sm font-medium">Диалог · {role.role}</p><p className="mt-2 text-xs text-foreground/60">Здесь будет диалог с подключённым ИИ. Пока можно собрать свои заметки для будущего обсуждения.</p>{notes.map((n,i)=><p key={i} className="mt-2 rounded-lg bg-foreground/5 p-2 text-xs whitespace-pre-wrap">{n}</p>)}<textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Вопрос, наблюдение или уточнение…" className="mt-3 min-h-[75px] w-full resize-y rounded-lg border border-foreground/20 bg-transparent p-2 text-sm"/><button type="button" disabled={!draft.trim()} onClick={()=>{setNotes(v=>[...v,draft.trim()]);setDraft("");setNotice("Заметка добавлена в текущую панель. Сохранение в проект ещё не подключено.");}} className="mt-2 rounded-lg border border-foreground/25 px-3 py-2 text-xs disabled:opacity-40">Добавить заметку</button></>:null}
   {mode==="manual"?<><p className="text-sm font-medium">Ручной ввод</p><p className="mt-2 text-xs text-foreground/60">Автор самостоятельно формирует результат сферы без обработки ИИ.</p><textarea value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Материалы, выводы, предложения, вопросы…" className="mt-3 min-h-[125px] w-full resize-y rounded-lg border border-foreground/20 bg-transparent p-2 text-sm"/></>:null}
  </div>
  <div className="mt-4 border-t border-foreground/10 pt-3"><p className="text-xs text-foreground/55">Выход сферы</p><p className="mt-1 text-sm">{role.output}</p><p className="mt-1 text-xs text-foreground/50">Передача следующей сфере — после подключения единого протокола.</p><button type="button" disabled className="mt-3 w-full rounded-xl border border-foreground/25 px-3 py-3 text-sm opacity-50">Сформировать и передать результат →</button></div>
  {notice&&<p role="status" className="mt-3 text-xs text-foreground/65">{notice}</p>}
  <p className="mt-3 text-[10px] text-foreground/40">Интерфейс v0.1 · без имитации работы ИИ и передачи данных</p>
 </section>;
}
