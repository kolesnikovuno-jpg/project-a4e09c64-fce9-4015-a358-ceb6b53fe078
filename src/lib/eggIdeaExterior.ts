/** Independent external research lenses of EGG, BEFORE Author-approved Idea/DNA.
 * All eight see the same Author initiation, selected Matter and external Field.
 * They must not inherit another sphere's output, invent web research, create
 * product geometry, or approve a project level.
 */
import type {SphereId} from "./eggEngine.js";
export const EGG_IDEA_EXTERIOR_ORDER=[
 "marketing","design","testDrive","commerce",
 "legal","production","procurement","retail",
] as const satisfies readonly SphereId[];
export const EGG_IDEA_EXTERIOR_LENSES:Record<SphereId,{name:string;question:string;boundary:string}>={
 marketing:{name:"Маркетинг",question:"Какую человеческую потребность, ситуацию или неудовлетворённую возможность обнаруживает намерение? Какие альтернативы или вопросы спроса проверить?",
  boundary:"Не утверждай существование спроса, размера рынка или платежеспособности без проверенных данных."},
 design:{name:"Дизайн",question:"Каков смысловой и пространственный потенциал намерения, его выразительные принципы и возможные противоречия, ещё без выбора формы?",
  boundary:"Не превращай открытое намерение в конкретное кресло, материал, геометрию или готовый проект."},
 testDrive:{name:"Тестдрайв",question:"Как человек предположительно взаимодействует с будущим решением? Какие сценарии использования и риски требуют настоящего испытания?",
  boundary:"Не объявляй виртуальные предположения результатом теста или подтверждённой эргономикой."},
 commerce:{name:"Коммерция",question:"Какие модели существования и обмена ценностью возможны для замысла? Какую экономическую неопределённость стоит исследовать?",
  boundary:"Не приписывай цене, бюджету, прибыли или рынку неподтверждённые цифры."},
 legal:{name:"Право",question:"Какие авторские, договорные, регуляторные или правовые вопросы необходимо будет уточнить с учётом предполагаемой юрисдикции?",
  boundary:"Не утверждай, что проверены реестры, нормы, патенты или права; не выдавай юридическое заключение."},
 production:{name:"Производство",question:"Какие принципиальные физические и технологические пути существуют и какие ограничения могут влиять на идею до выбора конструкции?",
  boundary:"Не объявляй расчёты, прочность или производственную реализуемость подтверждёнными."},
 procurement:{name:"Комплектация",question:"Какие классы ресурсов и неизвестные зависимости потенциально потребуются для воплощения замысла?",
  boundary:"Не называй конкретных поставщиков, цен, запасов и сроков без источников."},
 retail:{name:"Ритейл",question:"В какой форме можно показать, объяснить и проверить интерес к будущему решению, не обещая готового продукта?",
  boundary:"Не утверждай, что проведены демонстрации, продажи или исследования покупателей."},
};
export type EggIdeaExteriorFinding={sphere:SphereId;text:string};
export function eggIdeaExteriorSourceKey(input:{
 intent:string;constraints:string;materialInsight:string;
 selected:readonly {id:string;type:string;text:string}[];
 field:readonly {id:string;type:string;text:string}[];
 visualKey?:string;
}):string{
 const value=JSON.stringify({
  intent:input.intent.trim().slice(0,3000),
  constraints:input.constraints.trim().slice(0,2000),
  materialInsight:input.materialInsight.trim().slice(0,1400),
  selected:input.selected.map(m=>[m.id,m.type,m.text.slice(0,1500)]),
  field:input.field.map(m=>[m.id,m.type,m.text.slice(0,500)]),
  visualKey:input.visualKey??"",
 });
 let hash=2166136261;
 for(let i=0;i<value.length;i++)hash=Math.imul(hash^value.charCodeAt(i),16777619);
 return (hash>>>0).toString(16).padStart(8,"0");
}
export function eggIdeaExteriorProgress(
 findings:readonly EggIdeaExteriorFinding[],
):number{
 const ids=new Set(findings.filter(f=>f.text.trim()).map(f=>f.sphere));
 return EGG_IDEA_EXTERIOR_ORDER.filter(s=>ids.has(s)).length;
}
