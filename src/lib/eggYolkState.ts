/**
 * EGG / Yolk product projection. Read-only view of a *real* EGG snapshot.
 *
 * Do not infer engineering/legal/market facts from narrative AI outputs.
 * "Attention" is a missing verification or source-version dependency,
 * never an AI verdict that two spheres genuinely contradict one another.
 */
import {getActiveConcept,type EggProject,type SphereId} from "./eggEngine.js";
import {type EggFlowCycle,type EggSynthesisItem,EGG_FIXED_ROUTE} from "./eggFlowCycle.js";
import {validDriveWebUrl} from "./eggArtifacts.js";

export const EGG_YOLK_SPHERE_NAMES:Record<SphereId,string>={
  marketing:"Маркетинг",design:"Дизайн",testDrive:"Тестдрайв",commerce:"Коммерция",
  legal:"Право",production:"Производство",procurement:"Комплектация",retail:"Ритейл",
};
export type EggYolkSphereCard={
  sphere:SphereId;label:string;summary:string|null;resultId:string|null;
  status:"new"|"inherited"|"missing";
  sourceCycleId:string|null;evidence:"observation"|"hypothesis"|"question"|null;
  requiresRecheck:boolean;openQuestions:number;
};
export type EggYolkVerification={
  id:"legal_form"|"production_form"|"market_retail"|"cost_resources"|"general";
  title:string;status:"attention"|"to_compare"|"not_enough_data";
  note:string;related:SfPair;sourceResultIds:string[];
};
type SfPair=readonly SphereId[];
export type EggYolkVisualReference={
  type:"approved_concept_image"|"confirmed_external_file"|"local_preview_only";
  label:string;url:string|null;referenceId:string|null;
  approvedForProject:boolean;
  warning:string;
};
export type EggYolkProductProjection={
  cycleId:string|null;level:number;iteration:number;
  phase:"not_started"|"in_progress"|"awaiting_author"|"accepted"|"revision_requested";
  synthesisOrigin:"current"|"previous"|"none";
  dna:{text:string;conceptText:string|null;conceptId:string|null;conceptStatus:"approved"|"not_approved"};
  visual:EggYolkVisualReference;
  spheres:EggYolkSphereCard[];
  checks:EggYolkVerification[];
  gaps:string[];questions:Array<{id:string;sphere:SphereId;domain:string;question:string;
    provenance:"new"|"inherited";requiresRecheck:boolean}>;
  counts:{new:number;inherited:number;missing:number;questionCount:number;needsAttention:number};
  conclusion:"projection_not_a_certification";
};
const shorten=(text:string|null,max=175)=>
  text&&text.trim()?(text.replace(/\s+/g," ").trim().length>max
    ?text.replace(/\s+/g," ").trim().slice(0,max).trimEnd()+"…"
    :text.replace(/\s+/g," ").trim()):null;

function visualReference(project:EggProject):EggYolkVisualReference{
  const approved=getActiveConcept(project);
  // Only AUTHOR-confirmed Drive references are shown as independent project
  // materials; neither registration nor confirmation proves design approval.
  if(approved?.visualUrl&&/^https:\/\/[^\s]+$/i.test(approved.visualUrl)){
    return {type:"approved_concept_image",label:"Изображение принятой концепции",
      url:approved.visualUrl,referenceId:approved.id,approvedForProject:true,
      warning:"Ссылка на концептуальный образ. Не является утверждённой 3D-моделью или доказательством готовности."};
  }
  const files=[...(project.artifacts??[])].reverse();
  const chosen=files.find(file=>file.status==="author_confirmed"&&
    !!file.webUrl&&validDriveWebUrl(file.webUrl,file.fileId)&&
    (/^image\//.test(file.mimeType)||/gltf|glb|usdz|model/i.test(file.mimeType+" "+file.title)));
  if(chosen){
    return {type:"confirmed_external_file",label:chosen.title,
      url:chosen.webUrl??null,referenceId:chosen.id,approvedForProject:false,
      warning:"Автор подтвердил регистрацию ссылки, но не соответствие файла текущей форме или готовность модели."};
  }
  return {type:"local_preview_only",label:"Параметрический эскиз Желтка",
    url:null,referenceId:null,approvedForProject:false,
    warning:"Центральная пространственная визуализация — локальный исследовательский эскиз, а не утверждённая модель проекта."};
}
function cards(items:EggSynthesisItem[]):EggYolkSphereCard[]{
  const bySphere=new Map(items.map(x=>[x.sphere,x]));
  return EGG_FIXED_ROUTE.map(sphere=>{
    const item=bySphere.get(sphere);
    return {sphere,label:EGG_YOLK_SPHERE_NAMES[sphere],
      summary:shorten(item?.text??null),
      resultId:item?.resultId??null,
      status:item?.status??"missing",
      sourceCycleId:item?.sourceCycleId??null,
      evidence:item?.evidence??null,
      requiresRecheck:!!item?.requiresRecheck,
      openQuestions:item?.discoveredQuestions?.length??0,
    };
  });
}
/** Requires inspection, not an assertion of factual contradiction. */
function verify(items:EggYolkSphereCard[],cycle:EggFlowCycle):EggYolkVerification[]{
  const get=(sphere:SphereId)=>items.find(i=>i.sphere===sphere)!;
  const list:EggYolkVerification[]=[];
  const design=get("design"),production=get("production");
  const legal=cycle.synthesis?.second.find(i=>i.sphere==="legal")?.legalSimilarity;
  if(design.resultId){
    const matches=legal?.subject.designResultId===design.resultId;
    list.push({
      id:"legal_form",title:"Форма ↔ Право",
      status:!matches?"attention":legal?.status==="research_reported_unverified"?"to_compare":"attention",
      note:!matches?"У текущей формы нет проверки правовых пересечений именно этой версии.":
        legal?.status==="no_search_reported"?"Версия формы связана с Правом, но поиск по источникам не проведён.":
          "Есть сообщение об исследовании аналогов; правовой вывод ещё требует проверки.",
      related:["design","legal"],sourceResultIds:[design.resultId, ...(get("legal").resultId?[get("legal").resultId!]:[])],
    });
  }
  if(design.resultId){
    const productionForSameSource=!!production.resultId&&
      production.sourceCycleId===design.sourceCycleId;
    list.push({
      id:"production_form",title:"Форма ↔ Производство",
      status:productionForSameSource?"to_compare":"attention",
      note:!production.resultId?"Нет результата Производства для сопоставления с формой.":
        productionForSameSource
          ?"Результаты относятся к одному циклу, но ветви работали параллельно. Нужна проверка технологической совместимости."
          :"Производство использует результат другого цикла. Соответствие нынешней форме следует подтвердить.",
      related:["design","production"],
      sourceResultIds:[design.resultId,...(production.resultId?[production.resultId]:[])],
    });
  }
  const marketing=get("marketing"),retail=get("retail");
  if(marketing.resultId&&retail.resultId){
    list.push({id:"market_retail",title:"Аудитория ↔ Представление",
      status:"to_compare",note:"Совпадение адресата Маркетинга и сценария представления Ритейла не устанавливается по свободному тексту автоматически.",
      related:["marketing","retail"],sourceResultIds:[marketing.resultId,retail.resultId]});
  }
  const commerce=get("commerce"),procurement=get("procurement");
  if(commerce.resultId&&procurement.resultId){
    list.push({id:"cost_resources",title:"Экономика ↔ Комплектация",
      status:"to_compare",note:"Прогноз затрат и конкретные ресурсы требуют сопоставления по числам, единицам и источникам; свободный текст не является сметой.",
      related:["commerce","procurement"],sourceResultIds:[commerce.resultId,procurement.resultId]});
  }
  if(!list.length)list.push({
    id:"general",title:"Недостаточно материалов для сопоставления",
    status:"not_enough_data",note:"Проверки станут доступны после получения результатов сфер.",
    related:[],sourceResultIds:[],
  });
  return list;
}
export function buildEggYolkProductProjection(project:EggProject):EggYolkProductProjection{
  const active=getActiveConcept(project);
  const now=project.flowCycles?.[project.flowCycles.length-1];
  const last=[...(project.flowCycles??[])].reverse().find(c=>!!c.synthesis);
  const synthesis=last?.synthesis;
  const items=synthesis?[...synthesis.first,...synthesis.second]:[];
  const spheres=cards(items);
  const checks=last&&synthesis?verify(spheres,last):[];
  const questions=(synthesis?.openQuestions??[]).map(q=>({
    id:q.id,sphere:q.sphere,domain:q.domain,question:q.question,
    provenance:q.provenance,requiresRecheck:q.requiresRecheck,
  }));
  const counts={
    new:spheres.filter(c=>c.status==="new").length,
    inherited:spheres.filter(c=>c.status==="inherited").length,
    missing:spheres.filter(c=>c.status==="missing").length,
    questionCount:questions.length,
    needsAttention:checks.filter(c=>c.status==="attention").length,
  };
  return {
    cycleId:last?.id??null,level:now?.level??project.level,iteration:now?.iteration??project.iteration,
    phase:now?.status??"not_started",
    synthesisOrigin:!synthesis?"none":now?.id===last?.id?"current":"previous",
    dna:{text:project.seed.text,conceptText:active?.text??null,
      conceptId:active?.id??null,conceptStatus:active?"approved":"not_approved"},
    visual:visualReference(project),
    spheres,checks,gaps:synthesis?.gaps??[],questions,counts,
    conclusion:"projection_not_a_certification",
  };
}
