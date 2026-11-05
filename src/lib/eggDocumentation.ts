/**
 * EGG documentation projection: immutable project history and draft output.
 * Uses only a previously authenticated EggProject snapshot, never external
 * cloud credentials. A downloaded draft does not imply Author approval.
 */
import { EGG_SPHERES, type EggProject, type EggEvent, type SphereId } from "./eggEngine.js";
import { buildSpatialSketch, createSpatialGlb, type SpatialStage, type SpatialVariant } from "./eggSpatialGenerator.js";
import {buildEggYolkProductProjection} from "./eggYolkState.js";
import {buildEggBalanceOverview} from "./eggDynamicBalance.js";
import {buildEggEvolutionOverview} from "./eggEvolution.js";

export type PackageOrigin = "author" | "yolk";
export type VisualDraft = { stage:SpatialStage; variant:SpatialVariant; iteration:number };
export type MemoryEntry = {
  id:string; at:string; kind:"event"|"concept"|"material";
  title:string; description:string; status:string;
  sourceId:string; level:number|null; iteration:number|null;
};
export type DocumentationManifest = {
  schema:"egg.documentation/0.1"; projectId:string; projectTitle:string;
  revision:number; level:number; iteration:number; generatedAt:string;
  origin:PackageOrigin; documentStatus:"draft_not_approved";
  source:"authorized_egg_project_snapshot"; authorReleaseRecorded:false;
  externalFilesEmbedded:false; visualStudyEmbedded:boolean;
  visualStudy?:{stage:SpatialStage;variant:SpatialVariant;iteration:number;approved:false;units:"normalized"};
  sourceCounts:{events:number;concepts:number;tasks:number;findings:number;decisions:number;materials:number;memoryEntries:number};
  gaps:string[];
};
export type Bundle={filename:string;manifest:DocumentationManifest;entries:MemoryEntry[];
  files:Array<{path:string;bytes:Uint8Array}>;zip:Uint8Array};

const NAMES:Record<SphereId,string>={
  marketing:"Маркетинг",legal:"Право",design:"Дизайн",production:"Производство",
  testDrive:"Тестдрайв",procurement:"Комплектация",commerce:"Коммерция",retail:"Ритейл",
};
const EVENT_NAMES:Record<EggEvent["kind"],string>={
  seed_recorded:"Исходная идея сохранена",seed_proposed:"Предложение исходной идеи",
  question_routed:"Вопрос направлен",work_started:"Сфера начала работу",
  finding_returned:"Результат представлен",author_decision:"Решение Автора",
  level_changed:"Уровень изменён",iteration_started:"Новая итерация",
  artifact_registered:"Материал зарегистрирован",artifact_confirmed:"Подтверждение материала",
  concept_proposed:"Предложение концепции",concept_decided:"Решение по концепции",
  cycle_started:"Цикл запущен",sphere_transited:"Сфера пройдена транзитом",
  cycle_sphere_completed:"Сфера внесла результат",cycle_synthesized:"Желток согласовал потоки",
  cycle_decided:"Решение Автора по циклу",
  yolk_review_recorded:"Черновой смысловой анализ Желтка",
  balance_tension_recorded:"Новая гипотеза напряжения",
  balance_tension_decided:"Автор изменил статус напряжения",
  evolution_assessed:"Автор оценил изменения между итерациями",
};
const txt=(value:unknown)=>typeof value==="string"?value.replace(/\r/g,"").trim():"";
const encoder=new TextEncoder();
const bytes=(value:string)=>encoder.encode(value);
const clean=(s:string)=>s.replace(/[\u0000-\u0008\u000b-\u001f]/g," ");

export function buildEggProductMemory(project:EggProject):MemoryEntry[]{
  const lookup=new Map(project.tasks.map(task=>[task.id,task]));
  const cycles=new Map((project.flowCycles??[]).map(cycle=>[cycle.id,cycle]));
  const entries:MemoryEntry[]=project.events.map(event=>{
    const task=event.taskId?lookup.get(event.taskId):undefined;
    const sourceCycle=/cycle-[0-9]+/.exec(event.detail)?.[0];
    const cycle=sourceCycle?cycles.get(sourceCycle):undefined;
    return {
      id:"event/"+event.id,at:event.at,kind:"event",
      title:EVENT_NAMES[event.kind]??event.kind,
      description:txt(event.detail),
      status:event.actor==="author"?"Автор":"ИИ",
      sourceId:event.id,level:task?.level??cycle?.level??null,iteration:task?.iteration??cycle?.iteration??null,
    };
  });
  for(const c of project.concepts??[]){
    entries.push({id:"concept/"+c.id,at:c.createdAt,kind:"concept",
      title:"Концепция "+c.id,description:txt(c.text),status:c.status,
      sourceId:c.id,level:c.level,iteration:c.iteration});
    if(c.decision)entries.push({
      id:"decision/"+c.id,at:c.decision.at,kind:"concept",
      title:"Решение Автора по "+c.id,description:txt(c.decision.reason),
      status:c.decision.outcome,sourceId:c.id,level:c.level,iteration:c.iteration,
    });
  }
  for(const cycle of project.flowCycles??[]){
    for(const station of [...cycle.first,...cycle.second]){
      if(station.result)entries.push({
        id:"flow-result/"+station.result.id,at:station.result.at,kind:"event",
        title:"Результат "+NAMES[station.sphere]+" · "+cycle.id,
        description:station.result.text,status:station.result.evidence,
        sourceId:station.result.id,level:cycle.level,iteration:cycle.iteration,
      });
    }
    if(cycle.decision)entries.push({
      id:"flow-decision/"+cycle.id,at:cycle.decision.at,kind:"event",
      title:"Решение Автора · "+cycle.id,description:cycle.decision.reason,
      status:cycle.decision.outcome,sourceId:cycle.id,
      level:cycle.level,iteration:cycle.iteration,
    });
  }
  for(const a of project.artifacts??[]){
    const task=a.taskId?lookup.get(a.taskId):undefined;
    entries.push({id:"material/"+a.id,at:a.registeredAt,kind:"material",
      title:a.title+" · v"+a.version,description:"Коллекция: "+a.collectionKey+
        "; тип: "+a.mimeType+(a.webUrl?"; ссылка: "+a.webUrl:""),
      status:a.status,sourceId:a.id,
      level:task?.level??null,iteration:task?.iteration??null});
  }
  return entries.sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
}
export function findDocumentationGaps(project:EggProject):string[]{
  const problems:string[]=[];
  if(!project.seed.text.trim())problems.push("Исходная идея Автора не сформирована.");
  if(!(project.concepts??[]).some(c=>c.status==="accepted"))
    problems.push("Нет принятой Автором концепции.");
  const unresolved=project.tasks.filter(t=>["question","working","returned","revision_requested"].includes(t.status));
  if(unresolved.length)problems.push("Открытых задач / решений: "+unresolved.length+".");
  const reported=(project.artifacts??[]).filter(a=>a.status!=="author_confirmed");
  if(reported.length)problems.push("Материалов без подтверждения Автора: "+reported.length+".");
  if(!(project.artifacts??[]).some(a=>a.status==="author_confirmed"))
    problems.push("Нет подтверждённых Автором внешних документов.");
  const latestCycle=project.flowCycles?.[project.flowCycles.length-1];
  if(latestCycle?.status==="running")problems.push("Оба потока текущей итерации ещё не завершены.");
  if(latestCycle?.status==="awaiting_author")problems.push("Синтез Желтка ожидает решения Автора.");
  if(latestCycle?.synthesis)problems.push(...latestCycle.synthesis.gaps);
  problems.push("Финальный выпуск документации Автором не зарегистрирован.");
  return problems;
}
function dna(project:EggProject){
  const approved=[...(project.concepts??[])].reverse().find(c=>c.status==="accepted");
  const open=[...(project.concepts??[])].reverse().find(c=>c.status==="proposed");
  return [
    "# EGG / ДНК продукта","",
    "## Исходная идея Автора","",clean(project.seed.text)||"Пока отсутствует.","",
    "## Принятая концепция","",approved?clean(approved.text):"Нет утверждённой концепции.","",
    ...(open?["## Концепция на рассмотрении · не утверждена","",clean(open.text),""]:[]),
  ].join("\n");
}
function spheres(project:EggProject){
  const lines=["# EGG / 8 сфер","","Факты, гипотезы, вопросы и решения сохраняют свои исходные статусы.",""];
  for(const id of Object.keys(EGG_SPHERES) as SphereId[]){
    lines.push("## "+NAMES[id],"",EGG_SPHERES[id].purpose,"");
    const tasks=project.tasks.filter(t=>t.sphere===id);
    if(!tasks.length){lines.push("Результаты не зарегистрированы.","");continue;}
    for(const task of tasks){
      lines.push("### "+task.id+" · "+task.status+" · уровень "+task.level+" / итерация "+task.iteration,
        "",clean(task.question),"");
      for(const finding of task.findings){
        lines.push("**"+finding.id+" · "+finding.evidence+"**", "",
          clean(finding.text),"");
        if(finding.sourceRefs.length)lines.push("Источники: "+finding.sourceRefs.join("; "),"");
      }
      for(const decision of task.decisions)
        lines.push("**Автор · "+decision.outcome+"**","",clean(decision.reason),"");
    }
  }
  return lines.join("\n");
}
/** Explicit stream itinerary and source provenance across complete / targeted cycles. */
function flowCycles(project:EggProject):string{
  const lines=[
    "# EGG / Потоки, итерации и синтез Желтка","",
    "Вертикальная модель: Идея → уровни 1–5 → Материя. Идея и Материя не уровни.","",
    "Стандартный поток 1: Идея → Маркетинг → Дизайн → Тестдрайв → Коммерция → Желток.",
    "Стандартный поток 2: Идея → Право → Производство → Комплектация → Ритейл → Желток.","",
    "Оба маршрута неизменны. Транзит означает проход без нового исследования.",
    "Автоматический синтез объединяет данные, но НЕ доказывает их совместимость.",
    "Одно решение Автора применяется к результату завершённого цикла.","",
  ];
  const yolk=buildEggYolkProductProjection(project);
  lines.push("## Паспорт состояния продукта · версия для Автора","",
    "ДНК: "+yolk.dna.text,
    "Принятая концепция: "+(yolk.dna.conceptId??"не зарегистрирована"),
    "Визуальная версия: "+yolk.visual.label,
    "Предостережение: "+yolk.visual.warning,
    "Основание синтеза: "+(yolk.cycleId??"нет")+" ("+yolk.synthesisOrigin+")",
    "Состояние результатов: новых "+yolk.counts.new+
      ", унаследованных "+yolk.counts.inherited+
      ", отсутствующих "+yolk.counts.missing+".","",
    ...yolk.spheres.map(s=>"- "+s.label+" / "+s.status+" / "+(s.resultId??"нет источника")+
      ": "+(s.summary??"нет результата")),
    "",
    "### Пересечения потоков · на проверку","",
    ...(yolk.checks.length?yolk.checks.map(ch=>"- "+ch.title+" / "+ch.status+
      ": "+ch.note+" [источники: "+(ch.sourceResultIds.join(", ")||"нет")+"]"):
      ["Сопоставление ожидает завершённого синтеза."]),
    "","Это карта проверок, а не установление смысловой, юридической или технической совместимости.","");
  const evolution=buildEggEvolutionOverview(project);
  lines.push("## Карта изменений · ритм итераций","",
    "Метод: сравниваются записи и источники. Это не автоматическая оценка улучшения или сохранения смысловых инвариантов.",
    "Исходная ДНК: "+evolution.baseline.seed,
    "Рабочая концепция: "+(evolution.baseline.workingConceptId??"нет"),
    "Утверждённая концепция: "+(evolution.baseline.approvedConceptId??"не утверждена"),
    ...(!evolution.comparisons.length?["Нет потоковых циклов. Исходная точка сохранена; изменений для сопоставления нет."]:[]),
    ...evolution.comparisons.flatMap(c=>[
      "### "+c.fromLabel+" → "+c.toLabel,
      "Источник сравнения: "+(c.fromCycleId??"исторические выводы")+" → "+c.toCycleId,
      "Основание итерации: "+(c.reason??"не зарегистрировано"),
      "Направленные Автором сферы: "+(c.requestedTargets.join(", ")||"не зарегистрированы"),
      "Статус: "+c.toStatus,
      "Изменено текстов: "+c.counts.changedText+"; наследовано: "+c.counts.inherited+
        "; ожидается: "+c.counts.awaiting,
      ...c.deltas.map(d=>"- "+d.label+" · "+d.status+
        " · было "+(d.before?.id??"нет")+" / стало "+(d.after?.id??"нет")+
        (d.authorRequested?" · адресовано Автором":"")),
      ...c.linkedTensions.flatMap(t=>[
        "Напряжение: "+t.title+" · "+t.status,
        ...t.events.map(e=>"  "+e.at+" / "+e.action+": "+e.reason),
      ]),
      ...(c.assessment?[
        "Оценка Автора: "+c.assessment.outcome+" · ДНК: "+c.assessment.dnaImpact,
        "Основание: "+c.assessment.reason,
        "Источники оценки: "+c.assessment.evidenceResultIds.join(", "),
      ]:["Улучшение/ухудшение и смысловое соответствие Автором не оценены."]),
      "",
    ]),"");
  const balance=buildEggBalanceOverview(project);
  lines.push("## Dynamic Balance v1 · карта напряжений","",
    "Исходная ДНК Автора: "+balance.core.originalSeed,
    "Рабочая концепция: "+(balance.core.workingConceptId??"нет"),
    "Утверждённая концепция: "+(balance.core.approvedConceptId??"отсутствует"),
    "Смысловая сохранность ДНК требует решения Автора, не подтверждена алгоритмом.",
    "Непроверенных кандидатов: "+balance.counts.potential+
      "; под контролем: "+balance.counts.tracked+
      "; закрыто Автором: "+balance.counts.resolved+".","",
    "### Обнаруженные вопросы, пока не зарегистрированные в журнале","",
    ...balance.candidates.flatMap(c=>[
      "- "+c.title+" ("+c.key+") · аналитическая гипотеза, не дефект",
      "  Основания: "+c.sourceRefs.join(", "),
      "  Проверить: "+c.verification,
      ...c.resolutionOptions.map(option=>"  Возможный подход (гипотеза): "+option),
      "  Возможные адресаты следующей итерации: "+c.suggestedTargets.join(", "),
    ]),
    "","### Журнал и история решений","",
    ...balance.recorded.flatMap(t=>[
      "- "+t.title+" · "+t.id+" · "+t.status+" · критичность "+t.severity,
      "  Источники: "+t.sourceRefs.join(", "),
      "  Проверка: "+t.verification,
      ...t.resolutionOptions.map(option=>"  Возможный подход (гипотеза): "+option),
      ...t.history.map(h=>"  "+h.at+" · "+h.actor+" · "+h.action+
        " · "+h.reason+
        (h.verificationRefs.length?" · новые основания: "+h.verificationRefs.join(", "):"")),
    ]),
    "","Ни одно напряжение не добавляет новую связь между потоками; повторная итерация назначается только решением Автора.","");
  if(!(project.flowCycles??[]).length)lines.push(
    "Новых потоковых циклов пока нет; исторические задачи сохранены отдельно."
  );
  for(const cycle of project.flowCycles??[]){
    lines.push("## "+cycle.id+" · уровень "+cycle.level+" · итерация "+cycle.iteration,
      "","Состояние: "+cycle.status,
      "Исходный комментарий: "+(cycle.authorBrief||"Первичный полный цикл"),"");
    for(const key of ["first","second"] as const){
      lines.push("### "+(key==="first"?"Маркетинг → Дизайн → Тестдрайв → Коммерция":
        "Право → Производство → Комплектация → Ритейл"),"");
      for(const station of cycle[key]){
        lines.push("**"+NAMES[station.sphere]+" · "+station.status+"**","",
          station.result?station.result.text+" · "+station.result.evidence+
            " · "+station.result.id:
          station.inherited?"Транзит · наследован "+station.inherited.resultId+
            " из "+station.inherited.cycleId:
            station.status==="transited"?"Транзит без исторического результата.":"Новый вывод отсутствует.",
          ...(station.result?.sourceRefs.length?["Источники: "+station.result.sourceRefs.join("; ")]:[]),
          ...(station.result?.discoveredQuestions?.length?[
            "Вопросы, самостоятельно выявленные сферой (не подтверждены):",
            ...station.result.discoveredQuestions.flatMap(q=>[
              "- "+q.domain+": "+q.question,
              ...(q.basis?["  Основание: "+q.basis]:[]),
              ...(q.sourceRefs.length?["  Ссылки: "+q.sourceRefs.join("; ")]:[]),
            ]),
          ]:[]),
          ...(station.result?.legalSimilarity?[
            "### Право · проверка возможных пересечений (без юридического заключения)",
            "Версия формы: "+(station.result.legalSimilarity.subject.designResultId??"нет идентифицированной"),
            "Статус: "+station.result.legalSimilarity.status,
            "Территории: "+(station.result.legalSimilarity.territories.join(", ")||"не указаны"),
            ...station.result.legalSimilarity.searches.map(s=>
              "Поиск: "+s.category+" · "+s.sourceName+" · "+s.sourceUrl+
              " · запрос: "+s.query+" · дата: "+s.searchedAt),
            ...station.result.legalSimilarity.candidates.flatMap(hit=>[
              "Возможное пересечение: "+hit.kind+" · "+hit.title+" · "+hit.sourceUrl,
              "Сходство: "+hit.similarity,
              "Отличия: "+(hit.differences??"не исследованы"),
            ]),
            ...station.result.legalSimilarity.limitations.map(note=>"Ограничение: "+note),
            "Сходство не означает нарушение прав, а отсутствие совпадений не является правовой очисткой.",
          ]:[]),
          ...(station.requiresRecheck?["**Внимание: унаследованный вывод требует повторной проверки актуальности.**"]:[]),"");
      }
    }
    if(cycle.semanticReview)lines.push("### Желток / смысловая интерпретация ИИ · не утверждена","",
      "Источник синтеза: "+cycle.semanticReview.sourceSynthesisId,
      "Статус: "+cycle.semanticReview.status,
      "Резюме: "+cycle.semanticReview.summary,
      ...cycle.semanticReview.interpretations.flatMap(item=>[
        "- "+item.kind+" · "+item.title,
        "  Описание: "+item.explanation,
        "  Источники результатов: "+item.sourceResultIds.join(", "),
        "  Проверить: "+item.verificationNeeded,
        "  Возможные адресаты: "+(item.suggestedSphereTargets.join(", ")||"не предложены"),
      ]),
      ...cycle.semanticReview.limitations.map(note=>"Ограничение: "+note),
      "Этот результат не утверждает ДНК, реализацию, правомерность или коммерческую состоятельность.","");
    if(cycle.synthesis)lines.push("### Желток / встреча потоков","",
      "Открытых вопросов сфер: "+(cycle.synthesis.openQuestions?.length??0),
      "Проверка сходства, версия формы: "+(cycle.synthesis.second[0]?.legalSimilarity?.subject.designResultId??"не подтверждена"),
      ...(cycle.synthesis.openQuestions??[]).map(q=>"- "+q.sphere+" / "+q.domain+": "+q.question+
        " ("+q.provenance+" · не подтверждено)"),
      "Коммерция: "+(cycle.synthesis.endpoints.commerce.text??"Нет данных")+
        " · "+cycle.synthesis.endpoints.commerce.status,
      "Ритейл: "+(cycle.synthesis.endpoints.retail.text??"Нет данных")+
        " · "+cycle.synthesis.endpoints.retail.status,
      "Оговорки:","",...cycle.synthesis.gaps.map(g=>"— "+g),"");
    if(cycle.decision)lines.push("### Автор / результат цикла","",
      cycle.decision.outcome+" · "+cycle.decision.reason,
      "Сферы следующей итерации: "+(cycle.decision.addressedSpheres.join(", ")||"Все сферы следующего уровня"),"");
  }
  return lines.join("\n");
}

function materials(project:EggProject){
  const lines=["# EGG / Реестр материалов","",
    "Внешние файлы не загружены в архив. Включены только ссылки, статусы и метаданные.",""];
  if(!(project.artifacts??[]).length)lines.push("Зарегистрированных файлов нет.","");
  for(const a of project.artifacts??[]){
    lines.push("## "+clean(a.title),"",
      "Запись "+a.id+" · коллекция "+a.collectionKey+" · версия ссылки "+a.version,
      "Статус: "+a.status+" · MIME: "+a.mimeType,
      ...(a.sphere?["Сфера: "+NAMES[a.sphere]]:[]),
      ...(a.webUrl?["Ссылка: "+a.webUrl]:[]),"");
  }
  return lines.join("\n");
}
function memory(entries:MemoryEntry[]){
  const lines=["# EGG / Память формирования","","Хронология записей EGG. Не является независимой проверкой выводов.",""];
  if(!entries.length)lines.push("Записей нет.");
  for(const e of entries){
    lines.push("## "+e.at+" · "+e.title,"",
      "Источник: "+e.sourceId+" · "+e.status+
      (e.level!==null?" · уровень "+e.level+" / итерация "+e.iteration:" · этап не указан"),
      "",clean(e.description)||"Без пояснения",""
    );
  }
  return lines.join("\n");
}
function visual(project:EggProject,study?:VisualDraft){
  const lines=["# EGG / Пространственные версии","",
    "Наличие ссылки не подтверждает содержимое внешнего 3D-файла.",""];
  if(study)lines.push(
    "## Локальный эскиз Желтка","",
    "Стадия "+study.stage+" · вариант "+study.variant+" · итерация "+study.iteration,
    "В архиве: visual/yolk-study-unapproved.glb",
    "Статус: исследовательская параметрическая модель, НЕ модель по утверждённому проекту.",
    "Единицы нормализованы; размеры, эргономика, прочность и технология не проверены.",""
  );
  else lines.push("Локальная 3D-модель не включена. Сфера Автора не генерирует модель самостоятельно.","");
  const registered=(project.artifacts??[]).filter(a=>/glb|3d|model|geometry|модел|эскиз/i.test(
    [a.title,a.collectionKey,a.mimeType].join(" ")));
  if(!registered.length)lines.push("Зарегистрированных 3D-версий не обнаружено.","");
  for(const a of registered)lines.push("- "+a.title+" · v"+a.version+" · "+a.status+(a.webUrl?" · "+a.webUrl:""));
  return lines.join("\n");
}

const CRC_TABLE=Array.from({length:256},(_,x)=>{
  let n=x;for(let j=0;j<8;j++)n=(n&1)?(0xedb88320^(n>>>1)):(n>>>1);return n>>>0;
});
function crc32(b:Uint8Array){
  let n=0xffffffff;for(let i=0;i<b.length;i++)n=CRC_TABLE[(n^b[i])&255]^(n>>>8);
  return (n^0xffffffff)>>>0;
}
function u16(v:DataView,p:number,x:number){v.setUint16(p,x,true)}
function u32(v:DataView,p:number,x:number){v.setUint32(p,x>>>0,true)}
/** Portable ZIP, STORE method 0, UTF-8 names, CRC and central directory. */
export function zipDocumentation(files:Array<{path:string;bytes:Uint8Array}>):Uint8Array{
  const chunks:Uint8Array[]=[],central:Uint8Array[]=[];
  const used=new Set<string>();let position=0,totalCentral=0;
  if(files.length>30)throw Error("Too many files");
  for(const file of files){
    if(!/^[a-zA-Z0-9._/-]+$/.test(file.path)||file.path.startsWith("/")||
      file.path.split("/").includes("..")||used.has(file.path))throw Error("Unsafe file name");
    used.add(file.path);
    const name=bytes(file.path),data=file.bytes,hash=crc32(data);
    const local=new Uint8Array(30+name.length),h=new DataView(local.buffer);
    u32(h,0,0x04034b50);u16(h,4,20);u16(h,6,0x800);u16(h,8,0);
    u32(h,14,hash);u32(h,18,data.length);u32(h,22,data.length);
    u16(h,26,name.length);local.set(name,30);chunks.push(local,data);
    const directory=new Uint8Array(46+name.length),d=new DataView(directory.buffer);
    u32(d,0,0x02014b50);u16(d,4,20);u16(d,6,20);u16(d,8,0x800);
    u32(d,16,hash);u32(d,20,data.length);u32(d,24,data.length);
    u16(d,28,name.length);u32(d,42,position);directory.set(name,46);
    central.push(directory);totalCentral+=directory.length;
    position+=local.length+data.length;
  }
  const end=new Uint8Array(22),e=new DataView(end.buffer);
  u32(e,0,0x06054b50);u16(e,8,files.length);u16(e,10,files.length);
  u32(e,12,totalCentral);u32(e,16,position);
  const result=new Uint8Array(position+totalCentral+end.length);
  let write=0;
  for(const chunk of [...chunks,...central,end]){result.set(chunk,write);write+=chunk.length;}
  return result;
}

export function buildEggDocumentationBundle(input:{
  project:EggProject;revision:number;generatedAt:string;origin:PackageOrigin;
  visual?:VisualDraft;
}):Bundle{
  const {project,revision,generatedAt,origin}=input;
  if(project.schema!=="egg.engine/0.1"||!project.id||!Number.isSafeInteger(revision)||
    revision<1||!Number.isFinite(Date.parse(generatedAt)))throw Error("Invalid project snapshot");
  const study=origin==="yolk"?input.visual:undefined;
  const entries=buildEggProductMemory(project);
  const manifest:DocumentationManifest={
    schema:"egg.documentation/0.1",
    projectId:project.id,projectTitle:project.title||project.seed.text,
    revision,level:project.level,iteration:project.iteration,generatedAt,origin,
    documentStatus:"draft_not_approved",source:"authorized_egg_project_snapshot",
    authorReleaseRecorded:false,externalFilesEmbedded:false,
    visualStudyEmbedded:Boolean(study),
    ...(study?{visualStudy:{...study,approved:false as const,units:"normalized" as const}}:{}),
    sourceCounts:{
      events:project.events.length,concepts:project.concepts?.length??0,
      tasks:project.tasks.length,
       findings:project.tasks.reduce((n,t)=>n+t.findings.length,0)+
         (project.flowCycles??[]).reduce((n,cycle)=>n+[...cycle.first,...cycle.second].filter(v=>Boolean(v.result)).length,0),
      decisions:project.tasks.reduce((n,t)=>n+t.decisions.length,0)+
         (project.flowCycles??[]).filter(cycle=>Boolean(cycle.decision)).length,
      materials:project.artifacts?.length??0,memoryEntries:entries.length,
    },gaps:findDocumentationGaps(project),
  };
  const readme=[
    "# EGG / Пакет документации","",
    "ЧЕРНОВИК / НЕ УТВЕРЖДЁН / НЕ ПРОИЗВОДСТВЕННЫЕ ЧЕРТЕЖИ","",
    "Проект: "+manifest.projectTitle,
    "ID: "+project.id+" · ревизия "+revision+
    " · уровень "+project.level+" / итерация "+project.iteration,
    "Дата формирования: "+generatedAt,
    "Точка выпуска: "+(origin==="yolk"?"Желток":"Сфера Автора"),"",
    "Две точки выпуска используют ОДИН формат. Сохранение ZIP не утверждает проект.",
    "Окончательная документация требует проверки и отдельного решения Автора.","",
    "## Содержимое","",
    "docs/01-dna.md — ДНК и концепция",
    "docs/02-spheres.md — результаты восьми сфер",
    "docs/03-memory.md — хронология",
    "docs/04-artifacts.md — ссылки на материалы",
    "docs/05-visual.md — статус пространственных версий",
    "docs/06-flow-cycles.md — неизменные маршруты, транзит, наследование и синтез",
    "data/project-snapshot.json — исходное состояние EGG",
    "data/manifest.json — машиночитаемый паспорт",
    ...(study?["visual/yolk-study-unapproved.glb — экспериментальная модель"]:[]),"",
    "## Требует решения / дополнения","",
    ...manifest.gaps.map(item=>"- "+item),"",
    "Внешние облачные файлы НЕ включены. Архив создан локально в браузере.",
    "Для сохранения в облаке пользователь может передать ZIP своему ИИ.",""
  ].join("\n");
  const files=[
    {path:"README.md",bytes:bytes(readme)},
    {path:"docs/01-dna.md",bytes:bytes(dna(project))},
    {path:"docs/02-spheres.md",bytes:bytes(spheres(project))},
    {path:"docs/03-memory.md",bytes:bytes(memory(entries))},
    {path:"docs/04-artifacts.md",bytes:bytes(materials(project))},
    {path:"docs/05-visual.md",bytes:bytes(visual(project,study))},
    {path:"docs/06-flow-cycles.md",bytes:bytes(flowCycles(project))},
    {path:"data/manifest.json",bytes:bytes(JSON.stringify(manifest,null,2)+"\n")},
    {path:"data/project-snapshot.json",bytes:bytes(JSON.stringify(project,null,2)+"\n")},
  ];
  if(study)files.push({path:"visual/yolk-study-unapproved.glb",bytes:createSpatialGlb(
    buildSpatialSketch(study.stage,study.variant,study.iteration))});
  const filename=("EGG-"+project.id.slice(0,12)+"-L"+project.level+"-I"+project.iteration+
    "-R"+revision+"-"+origin+"-draft.zip").replace(/[^A-Za-z0-9.-]/g,"_");
  return {filename,manifest,entries,files,zip:zipDocumentation(files)};
}
