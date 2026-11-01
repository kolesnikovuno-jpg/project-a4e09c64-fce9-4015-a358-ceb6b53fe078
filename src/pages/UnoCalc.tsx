import { useRef, useState } from "react";
import UnoCrystalScene from "@/components/unocalc/UnoCrystalScene";
import { Link } from "react-router-dom";
import { readUnoScenario, writeUnoScenario } from "@/lib/unocalcScenario";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import UnoBalanceDiagram from "@/components/unocalc/UnoBalanceDiagram";
import {
  allocateResource,
  RESOURCE_SHARES,
  BASE_RESOURCE_PERCENTAGES,
  adaptResourcePercentages,
  type ResourcePercentages,
} from "@/lib/unocalcAllocation";
import {
  REGION_CITIES,
  REGION_COUNTRIES,
  REGION_SOURCES,
  regionCitiesForCountry,
  regionCoefficient,
  regionalUsdEstimate,
  regionalOfficeEuroEstimate,
  type RegionCountryCode,
} from "@/lib/unocalcRegion";
import { useLocale } from "@/i18n/useLocale";
import {
  calculateUno,
  formatUer,
  formatVolume,
  isInvalidDimension,
  type UnoLevel,
} from "@/lib/unocalc";

// Quality identifiers are semantic in the interface. The numerical weights
// are internal UNOcalc coefficients and are never shown as level labels.
const qualityCoefficients = {
  basic: 108,
  functional: 270,
  field: 432,
} as const satisfies Record<string, UnoLevel>;
type QualityId = keyof typeof qualityCoefficients;
const qualityLevels: QualityId[] = ["basic", "functional", "field"];

const copy = {
  en: {
    crystalHeading: "A field of relationships",
    crystalIntro: "Six points form a crystal: two poles and four perspectives on the object's creation. Rotate the field and touch the central form to enter its dimensions.",
    crystalInputs: "Object parameters",
    crystalClose: "Close",
    crystalDetails: "Explore the full resource model",
    crystalDetailsHide: "Hide detailed model",
    crystalResult: "Preliminary index",
    crystalEmpty: "Enter three dimensions to reveal the proportional volume.",
    crystalFootnote: "The crystal is a navigational model, not a physical field measurement. Its four perspectives are separate from the resource allocation below.",
    eyebrow: "Educational tool · preliminary model",
    heroTop: "Explore the resources behind a form.",
    heroBottom: "Resource.",
    intro: "An educational model for exploring resource sufficiency. Enter an object's dimensions, choose an intended quality level and examine the resource structure. This is neither a standard nor a quote.",
    aboutLink: "The principle",
    example: "Explore a hypothetical example · 10 × 10 × 3 m",
    corridorWorking: "Working corridor · ±10%",
    corridorOuter: "Outer corridor · ±20%",
    corridorNote: "Beyond ±20%: reconsider the intended quality level, scope and production assumptions. These are professional heuristic thresholds, not a measured error margin.",
    readTitle: "How to read this reference",
    readInsight: "A reference is a starting point, not an instruction to spend exactly this amount. Below it, ask how savings were achieved; above it, ask which extra conditions justify more resources.",
    indexMeaning: "An author-defined index based on bounding dimensions and the selected quality level. It does not measure physical energy or establish actual cost.",
    nextStepTitle: "Make the result useful",
    nextStep: "Compare it only with a proposal covering the same object and scope. Ask what explains differences: materials, technology, workmanship, durability and production conditions. A close match is not proof of accuracy.",
    allocationGuide: "Components (40%) form the centre. Design, execution and retail are three adjustable branches (20% each); the fourth, investment, supplies capital without an expense percentage.",
    educationalNote: "This model invites inquiry rather than requiring a particular budget. Applicable technical and safety standards remain in force.",
    readLimit: "The result does not verify actual quality or account for every construction and production detail.",
    copySummary: "Copy assessment",
    copyLink: "Copy scenario link",
    copiedSummary: "Assessment copied",
    copiedLink: "Link copied",
    copyError: "Copying is unavailable in this browser",
    sharingNote: "A scenario link restores the dimensions, quality, region and balance. No account or server storage.",
    summaryTitle: "Resource reference",
    summaryAssumptions: "Working assumption: 1 U.E.R. ≈ $1. Not a verified cost or selling price.",
    dimensions: "01 / Overall dimensions",
    dimensionNote: "Enter the object's maximum length, width and height. For irregular forms, this is the bounding volume, not the exact geometric volume.",
    length: "length",
    width: "width",
    height: "height",
    volume: "bounding volume",
    unit: "mm",
    cubic: "m³",
    settings: "02 / Quality of execution",
    qualityNote: "What level of execution do you expect?",
    result: "03 / Your reference",
    reference: "calculated index",
    selection: "selected quality",
    wireframe: "schematic proportions of the bounding volume",
    wireframeNote: "Proportions only; not a scale drawing.",
    costReference: "Illustrative currency equivalent",
    costBasis: "The 1 U.E.R. ≈ $1 relationship is an unvalidated author-defined assumption, not a market valuation. An actual budget requires a scoped design and vendor quotes.",
    prompt: "Enter dimensions to see the reference.",
    invalid: "Each dimension must be a positive number greater than zero.",
    outOfRange: "Dimensions are outside the supported calculation range.",
    definition: "unit of energy resonance",
    disclaimer: "U.E.R. is an author-defined index, not a physical energy measurement.",
    regionalHeading: "Optional / regional comparison",
    regionalIntro: "UNOcalc computes an index from an object's bounding dimensions and selected quality level. Whether that index is meaningful for a particular product type requires validation. A city adds an optional, limited market comparison — not a universal regional adjustment.",
    regionCountry: "country",
    regionCity: "city",
    noRegion: "No regional adjustment",
    selectCity: "Select a city",
    regionalFactor: "relative regional cost factor",
    regionalSource: "Data and method",
    uaMethod: "Ukraine, 2026: Kyiv = 1.00. A contractor's apartment labor price midpoints, assuming 50% labor and 50% similar-priced materials. Low confidence: not verified project totals.",
    euMethod: "Europe, 2026: Warsaw is the reference for each of the three quality levels. Office fit-out prices per m² from Cushman & Wakefield. The qualitative levels are mapped approximately to low/medium/high market tiers; equivalence is not validated.",
    regionReference: "baseline",
    ukraineBaseline: "Kyiv, Ukraine",
    europeBaseline: "Warsaw, Poland",
    regionApplied: "Preliminary city-adjusted estimate",
    regionNotApplied: "Independent European office fit-out reference: EUR per m² × floor area. Not a conversion of U.E.R. into euros and not a benchmark for housing or furniture.",
    regionUnknown: "Original UNOcalc reference, without regional adjustment.",
    regionUpdated: "Market reference: 2026. Not a real-time quote. Regional factors have not been validated to ±10%.",
    originalReference: "Original U.E.R.-based reference",
    officeCostReference: "Separate office fit-out comparison",
    unadjustedLabel: "Original UNOcalc index (no European calibration)",
    areaLabel: "Floor area",
    allocationHeading: "04 / Resource distribution",
    allocationIntro: "Creation resource: retail 20%, design 20%, execution 20%, central components 40%. Investment may fund these costs but is not a fifth spending share. These percentages are an author's starting model, not a general rule.",
    allocationTotal: "Allocation",
    allocationNames: { retail: "retail", design: "project / design", installation: "installation", components: "components" },
    allocationBalanced: "Balance",
    allocationAdapted: "Adaptation",
    allocationFlexibility: "Fixed: the four shares always total 100%. Flexible: each may vary by ±2.5 percentage points; the others compensate automatically.",
    allocationBeyond: "If real requirements exceed this range, reconsider the total project resource rather than forcing the shares.",
    investorTitle: "For an investor",
    investorNote: "Investment supplies the capital that enables this 100% allocation. It is not a fifth expense share. The model helps discuss resource sufficiency before funding; it does not forecast returns or dividends.",
    investorLink: "Investment and resource capacity",
    allocationReset: "Reset",
    allocationAdjust: "Adjust share",
    allocationDragHint: "Drag the three execution branches to redistribute their shares. Investment is incoming capital, not a percentage.",
    investmentDiagramLabel: "investment",
    investmentDiagramHint: "capital in",
    componentsAdjustHint: "components",
    levels: {
      basic: { label: "basic form", hint: "Essential utility, reliability and sound workmanship without unnecessary complexity." },
      functional: { label: "functional architecture", hint: "Integrated function, construction, materials and considered detailing." },
      field: { label: "field of strength", hint: "A coherent, individually tuned relation of form, environment and execution." },
    },
  },
  ru: {
    crystalHeading: "Поле взаимосвязей",
    crystalIntro: "Шесть точек образуют кристалл: два полюса и четыре взгляда на создание объекта. Вращайте поле и коснитесь центральной формы, чтобы ввести размеры.",
    crystalInputs: "Параметры объекта",
    crystalClose: "Закрыть",
    crystalDetails: "Исследовать полную ресурсную модель",
    crystalDetailsHide: "Скрыть подробную модель",
    crystalResult: "Предварительный индекс",
    crystalEmpty: "Введите три размера, чтобы увидеть объём в заданных пропорциях.",
    crystalFootnote: "Кристалл — навигационная модель, а не измерение физического поля. Четыре точки восприятия не равны статьям ресурсного распределения ниже.",
    eyebrow: "Просветительский инструмент · предварительная модель",
    heroTop: "Исследуйте ресурс за формой.",
    heroBottom: "Ресурс.",
    intro: "Просветительская модель ресурсной достаточности. Укажите габариты, выберите предполагаемый уровень качества и исследуйте структуру результата. Это не норматив и не смета.",
    aboutLink: "Принцип UNOcalc",
    example: "Исследовать условный пример · 10 × 10 × 3 м",
    corridorWorking: "Рабочий коридор · ±10%",
    corridorOuter: "Предельный коридор · ±20%",
    corridorNote: "За пределами ±20%: пересмотрите уровень качества, состав работ и технологические предпосылки. Это экспертные ориентиры, а не статистически доказанная погрешность.",
    readTitle: "Как читать ориентир",
    readInsight: "Ориентир — точка отсчёта, а не предписание потратить именно эту сумму. Ниже него — за счёт чего получена экономия? Выше — какие дополнительные условия оправдывают ресурс?",
    indexMeaning: "Авторский индекс по габаритам и выбранному уровню качества. Он не измеряет физическую энергию и не устанавливает фактическую себестоимость.",
    nextStepTitle: "Как использовать ориентир",
    nextStep: "Сравните его с предложением только при одинаковом составе работ. Выясните причины разницы: материалы, технология, мастерство, долговечность, условия производства. Близость чисел не доказывает точность модели.",
    allocationGuide: "В центре — комплектация (40%). Три регулируемые ветви: проект, реализация и ритейл (по 20%); четвёртая — инвестиция, которая даёт капитал и не имеет расходного процента.",
    educationalNote: "Модель предлагает вопросы для исследования, а не предписывает бюджет. Действующие технические нормы и требования безопасности она не заменяет.",
    readLimit: "Расчёт не проверяет фактическое качество и не учитывает каждую особенность конструкции и производства.",
    copySummary: "Копировать результат",
    copyLink: "Копировать ссылку на сценарий",
    copiedSummary: "Результат скопирован",
    copiedLink: "Ссылка скопирована",
    copyError: "Не удалось скопировать в этом браузере",
    sharingNote: "Ссылка восстанавливает габариты, уровень, регион и баланс. Без аккаунта и хранения на сервере.",
    summaryTitle: "Ресурсный ориентир",
    summaryAssumptions: "Рабочее допущение: 1 U.E.R. ≈ $1. Это не подтверждённая стоимость и не цена продажи.",
    dimensions: "01 / Габариты",
    dimensionNote: "Укажи максимальные длину, ширину и высоту объекта. Для сложной формы используется габаритная оболочка, а не точный геометрический объём.",
    length: "длина",
    width: "ширина",
    height: "высота",
    volume: "габаритный объём",
    unit: "мм",
    cubic: "м³",
    settings: "02 / Уровень качества",
    qualityNote: "Какого уровня исполнения ты ожидаешь?",
    result: "03 / Твой ориентир",
    reference: "расчётный индекс",
    selection: "выбранный уровень",
    wireframe: "схема пропорций габаритного объёма",
    wireframeNote: "Условные пропорции, не масштабный чертёж.",
    costReference: "Условный денежный эквивалент",
    costBasis: "Соотношение 1 U.E.R. ≈ $1 — непроверенное авторское допущение, а не рыночная оценка. Реальный бюджет требует проекта с определённым составом работ и предложений исполнителей.",
    prompt: "Введи размеры, чтобы получить ориентир.",
    invalid: "Каждый размер должен быть положительным числом больше нуля.",
    outOfRange: "Размеры выходят за пределы допустимого расчёта.",
    definition: "единица энергетического резонанса",
    disclaimer: "U.E.R. — авторский расчётный индекс, не физическая единица энергии.",
    regionalHeading: "Дополнительно / региональное сравнение",
    regionalIntro: "UNOcalc рассчитывает индекс по габаритам объекта и выбранному уровню качества. Пригодность результата для конкретного типа объектов ещё требует проверки. Город добавляет необязательное сравнение с ограниченными рыночными данными, а не универсальную поправку.",
    regionCountry: "страна",
    regionCity: "город",
    noRegion: "Без региональной поправки",
    selectCity: "Выбери город",
    regionalFactor: "коэффициент сравнения стоимости",
    regionalSource: "Данные и метод",
    uaMethod: "Украина, 2026: Киев = 1,00. Средние точки диапазонов стоимости работ по квартирам; допущение: 50% работы и 50% материалов по сопоставимой цене. Уверенность низкая: итоговые бюджеты не проверены.",
    euMethod: "Европа, 2026: Варшава — база сравнения для каждого из трёх уровней качества. Стоимость офисной отделки за м² по Cushman & Wakefield. Качественные уровни условно сопоставлены с рыночными категориями low/medium/high; эквивалентность не проверена.",
    regionReference: "базовый город",
    ukraineBaseline: "Киев, Украина",
    europeBaseline: "Варшава, Польша",
    regionApplied: "Предварительный ориентир с поправкой на город",
    regionNotApplied: "Отдельный европейский ориентир офисной отделки: €/м² × площадь пола. Это не перевод U.E.R. в евро и не оценка квартир, зданий или мебели.",
    regionUnknown: "Исходный ориентир UNOcalc без региональной поправки.",
    regionUpdated: "Рыночные данные: 2026 год. Не онлайн-смета. Точность коэффициентов ±10% не подтверждена.",
    originalReference: "Исходный ориентир по U.E.R.",
    officeCostReference: "Отдельное сравнение: офисная отделка",
    unadjustedLabel: "Исходный индекс UNOcalc (без калибровки для Европы)",
    areaLabel: "Площадь пола",
    allocationHeading: "04 / Распределение ресурса",
    allocationIntro: "Ресурс созидания: ритейл 20%, проект 20%, реализация 20%, комплектация 40% в центре. Инвестиция обеспечивает капитал, но не является пятой расходной долей. Пропорции — авторская исходная модель, а не отраслевая норма.",
    allocationTotal: "Распределено",
    allocationNames: { retail: "ритейл", design: "проект / дизайн", installation: "монтаж", components: "комплектующие" },
    allocationBalanced: "Равновесие",
    allocationAdapted: "Адаптация",
    allocationFlexibility: "Жёсткость: сумма долей всегда 100%. Гибкость: каждая доля может отклоняться на ±2,5 п.п.; остальные автоматически компенсируют изменение.",
    allocationBeyond: "Если реальные потребности выходят за допуск, следует пересмотреть общую ресурсную ёмкость, а не подгонять проценты.",
    investorTitle: "Для инвестора",
    investorNote: "Инвестиция обеспечивает капитал для этих 100%, но не является пятой долей расходов. Расчёт помогает обсудить достаточность ресурса до финансирования, а не обещает доход или дивиденды.",
    investorLink: "Инвестиции и ресурсная ёмкость",
    allocationReset: "Сбросить",
    allocationAdjust: "Изменить долю",
    allocationDragHint: "Тяни три рабочие ветви, чтобы изменить доли. Инвестиция — входящий капитал, без процента.",
    investmentDiagramLabel: "инвестиция",
    investmentDiagramHint: "вклад",
    componentsAdjustHint: "комплектация",
    levels: {
      basic: { label: "базовая форма", hint: "Необходимая польза, надёжность и добротное исполнение без избыточной сложности." },
      functional: { label: "функциональная архитектура", hint: "Согласованность функции, конструкции, материалов и продуманной деталировки." },
      field: { label: "поле силы", hint: "Целостное, индивидуально настроенное соответствие формы, среды и исполнения." },
    },
  },
  uk: {
    crystalHeading: "Поле взаємозв’язків",
    crystalIntro: "Шість точок утворюють кристал: два полюси та чотири погляди на створення об’єкта. Обертайте поле й торкніться центральної форми, щоб увести розміри.",
    crystalInputs: "Параметри об’єкта",
    crystalClose: "Закрити",
    crystalDetails: "Дослідити повну ресурсну модель",
    crystalDetailsHide: "Сховати докладну модель",
    crystalResult: "Попередній індекс",
    crystalEmpty: "Уведіть три розміри, щоб побачити об’єм у заданих пропорціях.",
    crystalFootnote: "Кристал — навігаційна модель, а не вимірювання фізичного поля. Чотири точки сприйняття не тотожні статтям розподілу ресурсу нижче.",
    eyebrow: "Просвітницький інструмент · попередня модель",
    heroTop: "Досліджуйте ресурс за формою.",
    heroBottom: "Ресурс.",
    intro: "Просвітницька модель ресурсної достатності. Укажіть габарити, оберіть очікуваний рівень якості й дослідіть структуру результату. Це не норматив і не кошторис.",
    aboutLink: "Принцип UNOcalc",
    example: "Дослідити умовний приклад · 10 × 10 × 3 м",
    corridorWorking: "Робочий коридор · ±10%",
    corridorOuter: "Граничний коридор · ±20%",
    corridorNote: "За межами ±20%: перегляньте рівень якості, склад робіт і технологічні припущення. Це експертні орієнтири, а не статистично доведена похибка.",
    readTitle: "Як читати орієнтир",
    readInsight: "Орієнтир — початкова точка, а не вимога витратити саме цю суму. Нижче нього — завдяки чому досягнута економія? Вище — які додаткові умови виправдовують ресурс?",
    indexMeaning: "Авторський індекс за габаритами й обраним рівнем якості. Він не вимірює фізичну енергію і не встановлює фактичну собівартість.",
    nextStepTitle: "Як використати орієнтир",
    nextStep: "Порівнюйте його з пропозицією лише за однакового складу робіт. З’ясуйте причини різниці: матеріали, технологія, майстерність, довговічність, умови виробництва. Збіг чисел не доводить точність моделі.",
    allocationGuide: "У центрі — комплектуючі (40%). Три регульовані гілки: проєкт, реалізація й ритейл (по 20%); четверта — інвестиція, яка надає капітал і не має витратного відсотка.",
    educationalNote: "Модель пропонує питання для дослідження, а не визначає обов’язковий бюджет. Чинних технічних норм і вимог безпеки вона не замінює.",
    readLimit: "Розрахунок не перевіряє фактичну якість і не враховує кожної особливості конструкції та виробництва.",
    copySummary: "Копіювати результат",
    copyLink: "Копіювати посилання на сценарій",
    copiedSummary: "Результат скопійовано",
    copiedLink: "Посилання скопійовано",
    copyError: "Не вдалося скопіювати в цьому браузері",
    sharingNote: "Посилання відновлює габарити, рівень, регіон і баланс. Без облікового запису та зберігання на сервері.",
    summaryTitle: "Ресурсний орієнтир",
    summaryAssumptions: "Робоче припущення: 1 U.E.R. ≈ $1. Це не підтверджена вартість і не ціна продажу.",
    dimensions: "01 / Габарити",
    dimensionNote: "Укажи найбільші довжину, ширину та висоту об’єкта. Для складної форми використовується габаритна оболонка, а не точний геометричний об’єм.",
    length: "довжина",
    width: "ширина",
    height: "висота",
    volume: "габаритний об'єм",
    unit: "мм",
    cubic: "м³",
    settings: "02 / Рівень якості",
    qualityNote: "Якого рівня виконання ти очікуєш?",
    result: "03 / Твій орієнтир",
    reference: "розрахунковий індекс",
    selection: "обраний рівень",
    wireframe: "схема пропорцій габаритного об'єму",
    wireframeNote: "Умовні пропорції, не масштабне креслення.",
    costReference: "Умовний грошовий еквівалент",
    costBasis: "Співвідношення 1 U.E.R. ≈ $1 — неперевірене авторське припущення, а не ринкова оцінка. Реальний бюджет потребує проєкту з визначеним складом робіт і пропозицій виконавців.",
    prompt: "Введи розміри, щоб отримати орієнтир.",
    invalid: "Кожен розмір має бути додатним числом, більшим за нуль.",
    outOfRange: "Розміри виходять за межі допустимого розрахунку.",
    definition: "одиниця енергетичного резонансу",
    disclaimer: "U.E.R. — авторський розрахунковий індекс, не фізична одиниця енергії.",
    regionalHeading: "Додатково / регіональне порівняння",
    regionalIntro: "UNOcalc розраховує індекс за габаритами об’єкта та обраним рівнем якості. Придатність результату для конкретного типу об’єктів ще потребує перевірки. Місто додає необов’язкове порівняння з обмеженими ринковими даними, а не універсальну поправку.",
    regionCountry: "країна",
    regionCity: "місто",
    noRegion: "Без регіональної поправки",
    selectCity: "Обери місто",
    regionalFactor: "коефіцієнт порівняння вартості",
    regionalSource: "Дані та метод",
    uaMethod: "Україна, 2026: Київ = 1,00. Середини діапазонів вартості квартирних робіт; припущення: 50% роботи та 50% матеріалів за співставною ціною. Достовірність низька: повні бюджети не перевірено.",
    euMethod: "Європа, 2026: Варшава — база порівняння для кожного з трьох рівнів якості. Вартість офісного оздоблення за м² за Cushman & Wakefield. Якісні рівні умовно зіставлені з ринковими категоріями low/medium/high; еквівалентність не перевірено.",
    regionReference: "базове місто",
    ukraineBaseline: "Київ, Україна",
    europeBaseline: "Варшава, Польща",
    regionApplied: "Попередній орієнтир із поправкою на місто",
    regionNotApplied: "Окремий європейський орієнтир офісного оздоблення: €/м² × площа підлоги. Це не перетворення U.E.R. на євро й не оцінка квартир, будівель або меблів.",
    regionUnknown: "Початковий орієнтир UNOcalc без регіональної поправки.",
    regionUpdated: "Ринкові дані: 2026 рік. Не онлайн-кошторис. Точність коефіцієнтів ±10% не підтверджена.",
    originalReference: "Початковий орієнтир за U.E.R.",
    officeCostReference: "Окреме порівняння: офісне оздоблення",
    unadjustedLabel: "Початковий індекс UNOcalc (без калібрування для Європи)",
    areaLabel: "Площа підлоги",
    allocationHeading: "04 / Розподіл ресурсу",
    allocationIntro: "Ресурс створення: ритейл 20%, проєкт 20%, реалізація 20%, комплектуючі 40% у центрі. Інвестиція забезпечує капітал, але не є п’ятою витратною часткою. Пропорції — авторська вихідна модель, а не галузева норма.",
    allocationTotal: "Розподілено",
    allocationNames: { retail: "ритейл", design: "проєкт / дизайн", installation: "монтаж", components: "комплектуючі" },
    allocationBalanced: "Рівновага",
    allocationAdapted: "Адаптація",
    allocationFlexibility: "Жорсткість: сума часток завжди 100%. Гнучкість: кожна частка може відхилятися на ±2,5 в.п.; інші автоматично компенсують зміну.",
    allocationBeyond: "Якщо реальні потреби виходять за межі допуску, слід переглянути загальну ресурсну місткість, а не підганяти відсотки.",
    investorTitle: "Для інвестора",
    investorNote: "Інвестиція забезпечує капітал для цих 100%, але не є п’ятою часткою витрат. Розрахунок допомагає обговорити достатність ресурсу до фінансування, а не обіцяє дохід чи дивіденди.",
    investorLink: "Інвестиції та ресурсна місткість",
    allocationReset: "Скинути",
    allocationAdjust: "Змінити частку",
    allocationDragHint: "Перетягуй три робочі гілки, щоб змінити частки. Інвестиція — вхідний капітал, без відсотка.",
    investmentDiagramLabel: "інвестиція",
    investmentDiagramHint: "внесок",
    componentsAdjustHint: "комплектуючі",
    levels: {
      basic: { label: "базова форма", hint: "Необхідна користь, надійність і добротне виконання без зайвої складності." },
      functional: { label: "функціональна архітектура", hint: "Узгодженість функції, конструкції, матеріалів і продуманої деталізації." },
      field: { label: "поле сили", hint: "Цілісна, індивідуально налаштована відповідність форми, середовища та виконання." },
    },
  },
} as const;


const VolumeDiagram = ({
  dimensions,
  level,
  label,
}: {
  dimensions: [string, string, string];
  level: UnoLevel;
  label: string;
}) => {
  const entered = dimensions.map(Number);
  const valid = dimensions.every((value) => value.trim() !== "") &&
    entered.every((value) => Number.isFinite(value) && value > 0);
  const values = valid ? entered : [5200, 3600, 2800];
  const largest = Math.max(...values);
  const x = 72 + (66 * values[0]) / largest;
  const y = 27 + (41 * values[1]) / largest;
  const z = 58 + (54 * values[2]) / largest;
  const ox = 42;
  const oy = 181;
  const point = (coords: number[]) => coords[0].toFixed(1) + "," + coords[1].toFixed(1);
  const base = [
    [ox, oy],
    [ox + x, oy],
    [ox + x + y, oy - y * 0.45],
    [ox + y, oy - y * 0.45],
  ];
  const top = base.map(([px, py]) => [px, py - z]);
  const polygon = (points: number[][]) => points.map(point).join(" ");
  const fill = level === 432 ? 0.13 : level === 270 ? 0.075 : 0.035;
  const display = (index: number) => valid ? entered[index].toLocaleString("en-US") : "—";

  return (
    <figure className="overflow-hidden border border-border/65 bg-foreground/[0.018]">
      <svg viewBox="0 0 310 224" role="img" aria-label={label} className="mx-auto block h-auto w-full max-w-[330px] text-foreground">
        <line x1="12" y1="201" x2="290" y2="201" stroke="currentColor" strokeOpacity="0.12" />
        <polygon points={polygon([top[0], top[1], top[2], top[3]])} fill="currentColor" fillOpacity={fill} stroke="currentColor" strokeOpacity="0.42" strokeWidth="1" />
        <polygon points={polygon([base[0], base[1], top[1], top[0]])} fill="currentColor" fillOpacity={fill / 2} stroke="currentColor" strokeOpacity="0.52" strokeWidth="1" />
        <polygon points={polygon([base[1], base[2], top[2], top[1]])} fill="currentColor" fillOpacity={fill * 1.4} stroke="currentColor" strokeOpacity="0.52" strokeWidth="1" />
        <path d={"M " + point(base[0]) + " L " + point(base[3]) + " L " + point(base[2])} stroke="currentColor" strokeOpacity="0.27" strokeDasharray="4 5" fill="none" />
        <path d={"M " + point(base[3]) + " L " + point(top[3])} stroke="currentColor" strokeOpacity="0.27" strokeDasharray="4 5" fill="none" />
        <circle cx={base[0][0]} cy={base[0][1]} r="2" fill="currentColor" fillOpacity="0.6" />
        <circle cx={top[2][0]} cy={top[2][1]} r="2" fill="currentColor" fillOpacity="0.6" />
        <g fontFamily="inherit" fontSize="12" fontWeight="400" fill="currentColor" fillOpacity="0.85">
          <text x={ox + x / 2} y={oy + 16} textAnchor="middle">A</text>
          <text x={base[1][0] + y / 2 + 4} y={oy - y * 0.225 + 15} textAnchor="middle">B</text>
          <text x={base[2][0] + 11} y={base[2][1] - z / 2} textAnchor="middle">C</text>
        </g>
      </svg>
      <div className="grid grid-cols-3 gap-2 border-t border-border/60 px-3 py-2.5 text-[11px] text-foreground/80 sm:px-4">
        {["A", "B", "C"].map((axis, i) => (
          <span key={axis} className="whitespace-nowrap font-light tabular-nums">
            <span className="mr-1 font-medium">{axis}</span>
            {display(i)}
          </span>
        ))}
      </div>
    </figure>
  );
};

const UnoCalc = () => {
  const [initial] = useState(() => readUnoScenario(new URLSearchParams(window.location.search)));
  const [a, setA] = useState(initial.a);
  const [b, setB] = useState(initial.b);
  const [c, setC] = useState(initial.c);
  const [quality, setQuality] = useState<QualityId>(initial.quality);
  const q: UnoLevel = qualityCoefficients[quality];
  const [country, setCountry] = useState<RegionCountryCode | "none">(initial.country);
  const [cityId, setCityId] = useState<string>(initial.cityId);
  const [resourcePercentages, setResourcePercentages] = useState<ResourcePercentages>(initial.shares);
  const [copyStatus, setCopyStatus] = useState<"summary" | "link" | "error" | null>(null);
  const [crystalInputsOpen, setCrystalInputsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const crystalInputsRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);
  const openCrystalInputs = () => {
    setCrystalInputsOpen(true);
    requestAnimationFrame(() => crystalInputsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
  const openDetails = () => {
    setDetailsOpen(true);
    requestAnimationFrame(() => detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };
  const { locale, localePath } = useLocale();
  const t = copy[locale];

  const calculation = calculateUno({ a, b, c, q });
  const ready = calculation.status === "ok";
  const cities = country === "none" ? [] : regionCitiesForCountry(country);
  const city = REGION_CITIES.find((option) => option.id === cityId);
  const coefficient = city ? regionCoefficient(city, q) : null;
  const areaSquareMeters = ready ? (Number(a) / 1000) * (Number(b) / 1000) : null;
  const euroEstimate = city && areaSquareMeters !== null
    ? regionalOfficeEuroEstimate(areaSquareMeters, city, q)
    : null;
  const regionalUsd = ready && city ? regionalUsdEstimate(calculation.energy, city) : null;
  const displayedAmount = ready ? euroEstimate ?? regionalUsd ?? calculation.energy : null;
  const formattedAmount = displayedAmount === null
    ? "—"
    : `≈ ${euroEstimate !== null ? "€" : "$"}${Number(formatUer(displayedAmount)).toLocaleString("en-US", { maximumFractionDigits: 3 })}`;
  const allocation = displayedAmount === null ? null : allocateResource(displayedAmount, resourcePercentages);
  const isAdapted = resourcePercentages.some((value, index) => value !== BASE_RESOURCE_PERCENTAGES[index]);
  const changeShare = (index: number, value: number) =>
    setResourcePercentages((current) => adaptResourcePercentages(current, index, value));
  const currencySymbol = euroEstimate !== null ? "€" : "$";
  const formatShare = (amount: number) =>
    currencySymbol + amount.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: amount < 1 ? 12 : 0,
    });
  const scenarioParams = writeUnoScenario({ a, b, c, quality, country, cityId, shares: resourcePercentages });
  const aboutPath = localePath("/unocalc/about") + "?" + scenarioParams.toString();
  const tryExample = () => {
    setA("10000");
    setB("10000");
    setC("3000");
    setQuality("basic");
    setCountry("none");
    setCityId("");
    setResourcePercentages(BASE_RESOURCE_PERCENTAGES);
    setCopyStatus(null);
  };
  const copyText = async (mode: "summary" | "link") => {
    const link = window.location.origin + localePath("/unocalc") + "?" + scenarioParams.toString();
    const summary = [
      "UNOcalc — " + t.summaryTitle,
      "",
      t.length + ": " + a + " " + t.unit,
      t.width + ": " + b + " " + t.unit,
      t.height + ": " + c + " " + t.unit,
      t.volume + ": " + (ready ? formatVolume(calculation.volume) : "—") + " m³",
      t.selection + ": " + t.levels[quality].label,
      t.reference + ": " + (ready ? formatUer(calculation.energy) : "—") + " U.E.R.",
      (euroEstimate !== null ? t.officeCostReference : t.costReference) + ": " + formattedAmount,
      city ? t.regionCity + ": " + city.name[locale] : t.noRegion,
      "",
      t.allocationHeading,
      ...RESOURCE_SHARES.map((share, index) =>
        t.allocationNames[share.id] + ": " + resourcePercentages[index] + "% — " +
        (allocation ? formatShare(allocation.parts[index].amount) : "—")
      ),
      "",
      euroEstimate !== null ? t.regionNotApplied : t.summaryAssumptions,
      t.disclaimer,
      link,
    ].join("\n");
    try {
      const text = mode === "link" ? link : summary;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        const succeeded = document.execCommand("copy");
        document.body.removeChild(area);
        if (!succeeded) throw new Error("copy failed");
      }
      setCopyStatus(mode);
    } catch {
      setCopyStatus("error");
    }
  };
  const feedback =
    calculation.status === "invalid"
      ? t.invalid
      : calculation.status === "out-of-range"
        ? t.outOfRange
        : null;

  const dimensions = [
    { key: "length", label: t.length, value: a, set: setA },
    { key: "width", label: t.width, value: b, set: setB },
    { key: "height", label: t.height, value: c, set: setC },
  ];


  return (
    <div
      className="min-h-screen bg-background font-body text-foreground"
      style={{
        paddingTop: "max(2.25rem, env(safe-area-inset-top))",
        paddingBottom: "max(2rem, calc(env(safe-area-inset-bottom) + 1rem))",
        paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
        paddingRight: "max(1.25rem, env(safe-area-inset-right))",
      }}
    >
      <LanguageSwitcher />
      <main className="mx-auto w-full max-w-[1060px]">
        <header className="flex items-center justify-between border-b border-foreground/25 pb-4 pr-2">
          <h1 className="text-[25px] font-light leading-none tracking-[-0.045em] sm:text-[28px]">
            UNO<span className="font-normal">calc</span>
          </h1>
          <nav className="flex items-center gap-5 sm:gap-7">
            <Link
              to={aboutPath}
              className="inline-flex min-h-9 items-center border-b border-foreground/35 text-[12px] tracking-[0.03em] text-foreground/85 transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              {t.aboutLink}
            </Link>
            <Link
              to={localePath("/")}
              className="inline-flex min-h-9 items-center text-[12px] tracking-[0.12em] text-foreground/80 transition-colors hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              .uno
            </Link>
          </nav>
        </header>


        <section className="mt-7" aria-labelledby="unocalc-crystal-title">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end sm:gap-8">
            <div>
              <p className="text-[11px] font-normal uppercase tracking-[0.17em] text-foreground/70">{t.eyebrow}</p>
              <h2 id="unocalc-crystal-title" className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-light tracking-[-0.03em]">{t.crystalHeading}</h2>
            </div>
            <p className="max-w-[430px] text-[12px] font-light leading-[1.7] text-foreground/70">{t.crystalIntro}</p>
          </div>
          <UnoCrystalScene locale={locale} dimensions={[a, b, c]} onOpenInputs={openCrystalInputs} />
          <p className="mx-auto mt-3 max-w-[760px] text-[11px] font-light leading-[1.7] text-foreground/60">{t.crystalFootnote}</p>
        </section>

        {crystalInputsOpen && (
          <div ref={crystalInputsRef} className="mx-auto mt-7 max-w-[760px] border-y border-foreground/25 bg-foreground/[0.018] px-4 py-6 sm:px-8" id="unocalc-crystal-inputs">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-[12px] font-medium uppercase tracking-[0.13em]">{t.crystalInputs}</h3>
              <button type="button" onClick={() => setCrystalInputsOpen(false)}
                className="min-h-9 border-b border-foreground/30 text-[12px] text-foreground/70 hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                {t.crystalClose} ×
              </button>
            </div>
            <p className="mt-3 text-[12px] font-light leading-[1.65] text-foreground/70">{t.dimensionNote}</p>
            <div className="mt-5 grid grid-cols-3 gap-3 sm:gap-6">
              {dimensions.map((field) => (
                <label key={field.key} className="block min-w-0 text-[12px] text-foreground/75">
                  {field.label} / {t.unit}
                  <input type="number" inputMode="decimal" min="0" step="any"
                    value={field.value} onChange={(event) => field.set(event.target.value)}
                    aria-invalid={isInvalidDimension(field.value)}
                    className="mt-2 w-full min-w-0 rounded-none border-0 border-b border-foreground/30 bg-transparent py-2 text-[23px] font-light tabular-nums outline-none focus:border-primary aria-[invalid=true]:border-red-600/75"
                    placeholder="—" />
                </label>
              ))}
            </div>
            {feedback && <p role="alert" className="mt-3 text-[12px] text-red-700">{feedback}</p>}
            <fieldset className="mt-6">
              <legend className="text-[12px] font-medium uppercase tracking-[0.1em]">{t.settings}</legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {qualityLevels.map((level) => (
                  <label key={level} className={"flex min-h-11 cursor-pointer items-center gap-2 border px-3 py-2 text-[12px] leading-snug " +
                    (quality === level ? "border-foreground/60 bg-foreground/[0.045]" : "border-border/70")}>
                    <input type="radio" name="unocalc-crystal-quality" checked={quality === level}
                      onChange={() => setQuality(level)} className="accent-foreground" />
                    {t.levels[level].label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="mt-6 flex flex-wrap items-baseline justify-between gap-3 border-t border-foreground/20 pt-4">
              <span className="text-[12px] text-foreground/70">{t.crystalResult}</span>
              <output className="text-[26px] font-light tabular-nums" aria-live="polite">
                {ready ? formatUer(calculation.energy) + " U.E.R." : "—"}
              </output>
            </div>
            <p className="mt-2 text-[11px] text-foreground/65">
              {ready ? t.indexMeaning : t.crystalEmpty}
            </p>
            <button type="button" onClick={openDetails}
              className="mt-5 min-h-10 border-b border-foreground/40 text-[12px] hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
              {t.crystalDetails} →
            </button>
          </div>
        )}

        <div className="mx-auto mt-8 flex max-w-[760px] justify-center border-t border-border/60 pt-5">
          <button type="button" onClick={() => detailsOpen ? setDetailsOpen(false) : openDetails()}
            aria-expanded={detailsOpen} className="min-h-10 border-b border-foreground/35 text-[12px] text-foreground/80 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            {detailsOpen ? t.crystalDetailsHide : t.crystalDetails} {detailsOpen ? "−" : "+"}
          </button>
        </div>

        {detailsOpen && (
          <div ref={detailsRef}>
        <section className="mb-8 mt-7 grid gap-3 border-b border-border/75 pb-7 sm:mb-10 sm:mt-9 sm:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] sm:gap-10" aria-label="UNOcalc">
          <div>
            <p className="mb-2 text-[11px] font-normal uppercase tracking-[0.17em] text-foreground/80">{t.eyebrow}</p>
            <p className="text-[20px] font-light leading-tight tracking-[-0.015em] text-foreground sm:text-[25px]">{t.heroTop}</p>
          </div>
          <p className="max-w-[490px] text-[13px] font-light leading-[1.75] text-foreground/75">{t.intro}</p>
        </section>

        <div className="grid items-start gap-9 md:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] md:gap-10 lg:gap-14">
          <div>
            <section aria-labelledby="unocalc-dimensions">
              <div className="mb-4 flex flex-col gap-1">
                <h2 id="unocalc-dimensions" className="text-[12px] font-medium uppercase tracking-[0.13em]">{t.dimensions}</h2>
                <p className="text-[12px] font-light leading-[1.65] text-foreground/80">{t.dimensionNote}</p>
                <button
                  type="button"
                  onClick={tryExample}
                  className="mt-2 self-start border-b border-foreground/35 py-1 text-left text-[11px] font-normal text-foreground/75 transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {t.example} ↗
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 sm:gap-5">
                {dimensions.map((field) => (
                  <div key={field.key} className="min-w-0">
                    <label htmlFor={"unocalc-" + field.key} className="block text-[12px] font-light text-foreground/80">
                      {field.label} <span className="text-foreground/75">/ {t.unit}</span>
                    </label>
                    <input
                      id={"unocalc-" + field.key}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      value={field.value}
                      onChange={(event) => field.set(event.target.value)}
                      aria-invalid={isInvalidDimension(field.value)}
                      aria-describedby={feedback ? "unocalc-feedback" : undefined}
                      placeholder="—"
                      className="mt-1 w-full min-w-0 rounded-none border-0 border-b border-foreground/30 bg-transparent py-2.5 text-[23px] font-light tracking-[-0.025em] tabular-nums text-foreground outline-none transition-colors placeholder:text-foreground/25 focus:border-primary aria-[invalid=true]:border-red-600/75 sm:text-[25px]"
                    />
                  </div>
                ))}
              </div>
              {feedback && <p id="unocalc-feedback" role="alert" className="mt-3 text-[12px] text-red-700">{feedback}</p>}
              <div className="mt-4 flex items-baseline justify-between gap-3 border-b border-border/60 py-2">
                <span className="text-[12px] text-foreground/75">{t.volume}</span>
                <span className="text-[20px] font-light tabular-nums tracking-[-0.02em]">
                  {ready ? formatVolume(calculation.volume) : "—"}
                  <span className="ml-1 text-[12px] text-foreground/75">{t.cubic}</span>
                </span>
              </div>
            </section>

            <fieldset className="mt-8">
              <legend className="w-full border-t border-foreground/25 pt-4 text-[12px] font-medium uppercase tracking-[0.13em]">{t.settings}</legend>
              <p className="mb-4 mt-1 text-[12px] font-light text-foreground/80">{t.qualityNote}</p>
              <div className="divide-y divide-border/65 border-y border-border/65">
                {qualityLevels.map((level) => {
                  const active = quality === level;
                  const item = t.levels[level];
                  return (
                    <label
                      key={level}
                      className={
                        "group relative flex cursor-pointer items-center gap-3 py-3 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary sm:gap-4 " +
                        (active ? "bg-foreground/[0.035]" : "hover:bg-foreground/[0.02]")
                      }
                    >
                      <input
                        type="radio"
                        name="unocalc-level"
                        value={level}
                        checked={active}
                        onChange={() => setQuality(level)}
                        className="sr-only"
                      />
                      <span className="min-w-0 flex-1 pl-3 pr-2">
                        <span className={"block text-[13px] font-normal leading-[1.4] " + (active ? "text-foreground" : "text-foreground/80")}>{item.label}</span>
                        <span className="mt-0.5 block text-[12px] font-light leading-[1.55] text-foreground/80">{item.hint}</span>
                      </span>
                      <span
                        aria-hidden="true"
                        className={"mr-3 h-3 w-3 shrink-0 rounded-full border border-foreground/45 " + (active ? "bg-foreground" : "bg-transparent")}
                      />
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <section className="mt-8 border-t border-foreground/25 pt-4" aria-labelledby="unocalc-region-title">
              <h2 id="unocalc-region-title" className="text-[12px] font-medium uppercase tracking-[0.13em]">{t.regionalHeading}</h2>
              <p className="mt-2 text-[12px] font-light leading-[1.7] text-foreground/80">{t.regionalIntro}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-5">
                <div>
                  <label htmlFor="unocalc-country" className="mb-2 block text-[12px] text-foreground/80">{t.regionCountry}</label>
                  <select
                    id="unocalc-country"
                    value={country}
                    onChange={(event) => {
                      const next = event.target.value as RegionCountryCode | "none";
                      setCountry(next);
                      setCityId(next === "none" ? "" : regionCitiesForCountry(next)[0]?.id ?? "");
                    }}
                    className="w-full min-w-0 rounded-none border border-border/80 bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary focus-visible:ring-1 focus-visible:ring-primary"
                  >
                    <option value="none">{t.noRegion}</option>
                    {REGION_COUNTRIES.map((item) => (
                      <option key={item.code} value={item.code}>{item.name[locale]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="unocalc-city" className="mb-2 block text-[12px] text-foreground/80">{t.regionCity}</label>
                  <select
                    id="unocalc-city"
                    value={cityId}
                    onChange={(event) => setCityId(event.target.value)}
                    disabled={country === "none"}
                    className="w-full min-w-0 rounded-none border border-border/80 bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-primary focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-45"
                  >
                    {country === "none" && <option value="">{t.selectCity}</option>}
                    {cities.map((item) => (
                      <option key={item.id} value={item.id}>{item.name[locale]}</option>
                    ))}
                  </select>
                </div>
              </div>
              {city && coefficient !== null && (
                <div className="mt-4 border-t border-border/60 pt-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-[12px] text-foreground/80">{t.regionalFactor}</span>
                    <span className="text-[23px] font-light tabular-nums">× {coefficient.toFixed(city?.family === "eu-office" ? 3 : 2)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-foreground/75">
                    {t.regionReference}: {city.family === "ua-apartment" ? t.ukraineBaseline : t.europeBaseline}
                  </p>
                  <p className="mt-3 text-[11px] font-light leading-[1.7] text-foreground/80">
                    {city.family === "ua-apartment" ? t.uaMethod : t.euMethod}
                  </p>
                  <a
                    href={REGION_SOURCES[city.family].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex min-h-9 items-center border-b border-foreground/30 text-[11px] text-foreground hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                  >
                    {t.regionalSource} · {REGION_SOURCES[city.family].year} ↗
                  </a>
                </div>
              )}
            </section>
          </div>

          <section className="md:border-l md:border-border/70 md:pl-8 lg:pl-10" aria-labelledby="unocalc-result">
            <div className="flex items-baseline justify-between gap-2">
              <h2 id="unocalc-result" className="text-[12px] font-medium uppercase tracking-[0.13em]">{t.result}</h2>
              <span className="text-[10px] tracking-[0.17em] text-foreground/75">A × B × C</span>
            </div>
            <div className="mt-4">
              <VolumeDiagram dimensions={[a, b, c]} level={q} label={t.wireframe} />
              <p className="mt-2 text-[11px] text-foreground/75">{t.wireframeNote}</p>
            </div>
            <div className="mt-5 flex items-center justify-between gap-3">
              <span className="text-[12px] font-medium text-foreground/80">{t.reference}</span>
              <span className="text-[11px] tracking-[0.12em] text-foreground/75">U.E.R.</span>
            </div>
            <output
              aria-live="polite"
              className="mt-2 block break-all border-b border-foreground/35 pb-4 text-right text-[clamp(3rem,6vw,4.5rem)] font-extralight leading-[1.1] tracking-[-0.045em] tabular-nums"
            >
              {ready ? formatUer(calculation.energy) : "—"}
            </output>
            <p className="mt-3 text-[11px] font-light leading-[1.7] text-foreground/70">{t.indexMeaning}</p>
            <div className="mt-4 flex items-baseline justify-between gap-3 border-t border-border/60 pt-4">
              <span className="text-[12px] text-foreground/80">{euroEstimate !== null ? t.officeCostReference : t.costReference}</span>
              <span className="text-[20px] font-light tabular-nums text-foreground/90">{formattedAmount}</span>
            </div>
            {city?.family === "eu-office" && coefficient !== null && (
              <div className="mt-3 border-b border-border/60 pb-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-[12px] text-foreground/80">{t.regionalFactor} · {t.europeBaseline}</span>
                  <span className="text-[20px] font-light tabular-nums">× {coefficient.toFixed(3)}</span>
                </div>
                {areaSquareMeters !== null && (
                  <div className="mt-2 flex items-baseline justify-between gap-3">
                    <span className="text-[12px] text-foreground/80">{t.areaLabel}</span>
                    <span className="text-[13px] font-light tabular-nums">{formatVolume(areaSquareMeters)} m²</span>
                  </div>
                )}
                <p className="mt-3 text-[11px] font-light leading-[1.6] text-foreground/80">
                  {t.unadjustedLabel}: {ready ? formatUer(calculation.energy) : "—"} U.E.R.
                </p>
              </div>
            )}
            <div className="mt-4 flex justify-between gap-4 border-t border-border/60 pt-4">
              <span className="text-[12px] text-foreground/80">{t.selection}</span>
              <span className="text-right text-[13px] font-normal">{t.levels[quality].label}</span>
            </div>
            <p className="mt-4 text-[12px] font-light leading-[1.65] text-foreground/80">
              {ready
                ? euroEstimate !== null
                  ? t.regionNotApplied + " " + t.regionUpdated
                  : regionalUsd !== null
                    ? t.regionApplied + ". " + t.costBasis + " " + t.regionUpdated
                    : t.costBasis
                : feedback ?? t.prompt}
            </p>
            {ready && (
              <section aria-labelledby="unocalc-corridor" className="mt-6 border-t border-border/70 pt-4">
                <h3 id="unocalc-corridor" className="text-[12px] font-medium uppercase tracking-[0.13em]">{t.corridorWorking}</h3>
                <div className="mt-4 flex h-3 overflow-hidden rounded-sm" role="img" aria-label={t.corridorWorking + "; " + t.corridorOuter}>
                  <div className="w-1/4 bg-foreground/15" />
                  <div className="w-1/2 bg-foreground/35" />
                  <div className="w-1/4 bg-foreground/15" />
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[11px] tabular-nums text-foreground/75">
                  {[-20, -10, 0, 10, 20].map((delta) => (
                    <span key={delta}>{delta > 0 ? "+" : ""}{delta}%</span>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-[12px]">
                  <div>
                    <p className="text-foreground/75">{t.corridorWorking}</p>
                    <p className="mt-1 tabular-nums">{formatUer(calculation.energy * 0.9)} – {formatUer(calculation.energy * 1.1)} U.E.R.</p>
                  </div>
                  <div>
                    <p className="text-foreground/75">{t.corridorOuter}</p>
                    <p className="mt-1 tabular-nums">{formatUer(calculation.energy * 0.8)} – {formatUer(calculation.energy * 1.2)} U.E.R.</p>
                  </div>
                </div>
                <p className="mt-3 text-[11px] font-light leading-[1.7] text-foreground/70">{t.corridorNote}</p>
              </section>
            )}
            <aside className="mt-5 border-t border-border/70 pt-4" aria-labelledby="unocalc-reading">
              <h3 id="unocalc-reading" className="text-[12px] font-medium uppercase tracking-[0.13em]">{t.readTitle}</h3>
              <p className="mt-2 text-[12px] font-light leading-[1.75] text-foreground/80">{t.readInsight}</p>
              <h4 className="mt-4 text-[12px] font-medium">{t.nextStepTitle}</h4>
              <p className="mt-2 text-[12px] font-light leading-[1.75] text-foreground/80">{t.nextStep}</p>
              <p className="mt-3 text-[11px] font-light leading-[1.7] text-foreground/70">{t.readLimit}</p>
              <p className="mt-2 text-[11px] font-light leading-[1.7] text-foreground/70">{t.educationalNote}</p>
              <Link to={aboutPath} className="mt-3 inline-flex min-h-9 items-center border-b border-foreground/35 text-[12px] hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{t.aboutLink} →</Link>
            </aside>
            <section aria-labelledby="unocalc-allocation-title" className="mt-8 border-t border-foreground/25 pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <h3 id="unocalc-allocation-title" className="text-[12px] font-medium uppercase tracking-[0.13em]">
                  {t.allocationHeading}
                </h3>
                <span className="text-[12px] tabular-nums text-foreground/80">100%</span>
              </div>
              <p className="mt-2 text-[12px] font-light leading-[1.65] text-foreground/80">{t.allocationIntro}</p>
              <p className="mt-2 border-l border-foreground/30 pl-3 text-[11px] font-light leading-[1.7] text-foreground/75">{t.allocationGuide}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[12px] font-medium text-foreground/80">
                  {isAdapted ? t.allocationAdapted : t.allocationBalanced}
                </span>
                <button
                  type="button"
                  disabled={!isAdapted}
                  onClick={() => setResourcePercentages(BASE_RESOURCE_PERCENTAGES)}
                  className="min-h-9 border-b border-foreground/30 text-[12px] text-foreground/80 transition-colors hover:text-foreground disabled:cursor-default disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {t.allocationReset}
                </button>
              </div>
              <p className="mt-1 text-[11px] font-light leading-[1.6] text-foreground/75">{t.allocationFlexibility}</p>
              <div className="mt-4 border-y border-border/60 py-4">
                <UnoBalanceDiagram
                  shares={resourcePercentages}
                  labels={t.allocationNames}
                  onShareChange={changeShare}
                  dragHint={t.allocationDragHint}
                  adjustLabel={t.allocationAdjust}
                  investmentLabel={t.investmentDiagramLabel}
                  investmentHint={t.investmentDiagramHint}
                  centerHint={t.componentsAdjustHint}
                  locale={locale}
                />
              </div>
              <div className="mt-2 divide-y divide-border/60">
                {RESOURCE_SHARES.map((share, index) => {
                  const part = allocation?.parts[index];
                  const currentPercent = resourcePercentages[index];
                  const shareLocale = locale === "en" ? "en-US" : "ru-RU";
                  return (
                    <div key={share.id} className="py-3 text-[13px]">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="min-w-0 flex-1 text-foreground/85">{t.allocationNames[share.id]}</span>
                        <span className="w-16 shrink-0 text-right tabular-nums text-foreground/75">
                          {currentPercent.toLocaleString(shareLocale)}%
                          {currentPercent !== share.percent && (
                            <span className="ml-1 text-[10px] text-foreground/60">
                              {currentPercent > share.percent ? "+" : "−"}
                              {Math.abs(currentPercent - share.percent).toLocaleString(shareLocale)}
                            </span>
                          )}
                        </span>
                        <span className="w-[108px] shrink-0 text-right font-light tabular-nums sm:w-[122px]">
                          {part ? formatShare(part.amount) : "—"}
                        </span>
                      </div>

                    </div>
                  );
                })}
              </div>
              <div className="flex items-baseline justify-between gap-3 border-t border-foreground/25 pt-3 text-[12px]">
                <span className="text-foreground/75">{t.allocationTotal}</span>
                <span className="font-medium tabular-nums">
                  {allocation ? formatShare(allocation.displayedTotal) : "—"}
                </span>
              </div>
              <p className="mt-3 text-[11px] font-light leading-[1.65] text-foreground/75">
                {t.allocationBeyond}
              </p>
              <aside className="mt-6 border-t border-border/70 pt-4" aria-labelledby="unocalc-investor">
                <h4 id="unocalc-investor" className="text-[12px] font-medium uppercase tracking-[0.13em]">{t.investorTitle}</h4>
                <p className="mt-2 text-[12px] font-light leading-[1.75] text-foreground/80">{t.investorNote}</p>
                <Link to={aboutPath + "#investment"} className="mt-3 inline-flex min-h-9 items-center border-b border-foreground/35 text-[12px] hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
                  {t.investorLink} →
                </Link>
              </aside>
            </section>
            <div className="mt-7 border-t border-border/70 pt-4">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => { void copyText("summary"); }}
                  className="inline-flex min-h-10 items-center border-b border-foreground/40 text-[12px] text-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {t.copySummary} ↗
                </button>
                <button
                  type="button"
                  onClick={() => { void copyText("link"); }}
                  className="inline-flex min-h-10 items-center border-b border-foreground/40 text-[12px] text-foreground transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  {t.copyLink} ↗
                </button>
              </div>
              <p className="mt-3 text-[11px] font-light leading-[1.7] text-foreground/70">{t.sharingNote}</p>
              <p role="status" aria-live="polite" className="mt-2 min-h-5 text-[12px] text-foreground/80">
                {copyStatus === "summary" ? t.copiedSummary : copyStatus === "link" ? t.copiedLink : copyStatus === "error" ? t.copyError : ""}
              </p>
            </div>
          </section>
        </div>

          </div>
        )}

        <footer className="mt-10 flex flex-col justify-between gap-2 border-t border-border/70 pt-4 text-[12px] font-light leading-[1.7] text-foreground/75 md:mt-12 md:flex-row md:gap-10">
          <p>U.E.R. — unit of energy resonance / {t.definition}</p>
          <p className="max-w-[490px]">{t.disclaimer}</p>
        </footer>
      </main>
    </div>
  );
};

export default UnoCalc;
