/**
 * Kolesnikov.studio — single editable source of all site copy.
 *
 * Every string on the new site lives here, grouped per locale. Editing text
 * later means editing this file only; no component changes required.
 */

import type { Locale } from "@/i18n/config";

export type CaseCategory =
  | "SPACE"
  | "OBJECT"
  | "PRODUCT"
  | "SYSTEM"
  | "MATERIAL"
  | "TECHNOLOGY"
  | "CONCEPT";

export interface CaseItem {
  /** stable id, used for anchors */
  id: string;
  /** display code, e.g. "01" */
  code: string;
  category: CaseCategory;
  title: string;
  /** stage label as used elsewhere on the site */
  stage: string;
  question: string;
  /** null = layer intentionally left empty (not yet documented) */
  observed: string | null;
  tension: string | null;
  opportunity: string | null;
  created: string | null;
  next: string | null;
  /** internal route (locale prefix added automatically when it starts with "/") */
  href?: string;
  /** absolute path/import handled in component */
  image?: "lyra" | "nava" | "void" | null;
}

export interface StudioContent {
  nav: {
    brand: string;
    method: string;
    cases: string;
    exchange: string;
    studio: string;
    start: string;
    menu: string;
  };
  meta: {
    title: string;
    description: string;
  };
  home: {
    number: string;
    label: string;
    role: string;
    statement: string;
    secondary: string;
    ctaPrimary: string;
    ctaSecondary: string;
    conceptLines: string[];
    chainLabel: string;
    chain: string[];
    scroll: string;
  };
  method: {
    number: string;
    title: string;
    intro: string[];
    steps: { key: string; title: string; body: string }[];
    closing: string[];
  };
  cases: {
    number: string;
    title: string;
    intro: string;
    labels: {
      observed: string;
      tension: string;
      opportunity: string;
      created: string;
      next: string;
      pending: string;
      open: string;
      question: string;
    };
    items: CaseItem[];
  };
  exchange: {
    number: string;
    title: string;
    intro: string[];
    youBringLabel: string;
    youBring: string[];
    iBringLabel: string;
    iBring: string[];
    modelsLabel: string;
    models: { key: string; title: string; body: string }[];
    statement: string;
    diagramLabel: string;
    diagram: string[];
    note: string;
  };
  studio: {
    number: string;
    title: string;
    positioning: string;
    role: string;
    disciplinesLabel: string;
    disciplines: { key: string; body: string }[];
    statement: string;
    contactLabel: string;
  };
  start: {
    number: string;
    title: string;
    subtitle: string;
    q1: string;
    q1Options: string[];
    q2: string;
    q2Options: string[];
    q3: string;
    q3Options: string[];
    nameLabel: string;
    emailLabel: string;
    descLabel: string;
    descPlaceholder: string;
    cta: string;
    altLabel: string;
    telegram: string;
    email: string;
    copy: string;
    copied: string;
    required: string;
    sentNote: string;
  };
  footer: {
    left: string;
    right: string;
    email: string;
    telegram: string;
  };
}

const CONTACT = {
  email: "kolesnikov.uno@gmail.com",
  telegram: "https://t.me/kolesnikov_uno",
};

export const contact = CONTACT;

const en: StudioContent = {
  nav: {
    brand: "Kolesnikov.studio",
    method: "Method",
    cases: "Cases",
    exchange: "Exchange",
    studio: "Studio",
    start: "Start",
    menu: "Menu",
  },
  meta: {
    title: "Kolesnikov.studio — Architecture · Design · Research · Product",
    description:
      "Kolesnikov.studio discovers economically interesting opportunities and turns them into products, spaces, systems and other workable forms.",
  },
  home: {
    number: "01",
    label: "KOLESNIKOV.STUDIO",
    role: "architect · designer · creator",
    statement:
      "I discover economically interesting opportunities and turn them into product constructions.",
    secondary:
      "I research where demand, value and possibility intersect — then turn what I find into a product, service, space, object, system or other workable form.",
    ctaPrimary: "Start a conversation",
    ctaSecondary: "View cases",
    conceptLines: ["I don't start with a predefined product.", "I start with a signal."],
    chainLabel: "sequence",
    chain: [
      "SIGNAL",
      "ANALYSIS",
      "DIAGNOSIS",
      "CONCEPT",
      "PROJECTION",
      "PROTOTYPE",
      "PRODUCT",
    ],
    scroll: "scroll",
  },
  method: {
    number: "02",
    title: "METHOD",
    intro: [
      "Most projects begin with a request.",
      "I often begin earlier — with something that does not yet have a name.",
    ],
    steps: [
      {
        key: "OBSERVE",
        title: "OBSERVE",
        body: "Find a signal: a problem, contradiction, unmet demand, material opportunity, technological possibility, behavioural pattern or emerging need.",
      },
      {
        key: "ANALYZE",
        title: "ANALYZE",
        body: "Understand the structure: who is affected, what creates value, what people are actually willing to exchange — money, time, attention, access or trust.",
      },
      {
        key: "CONCEPT",
        title: "CONCEPT",
        body: "Identify the core opportunity and formulate a possible solution.",
      },
      {
        key: "CONSTRUCT",
        title: "CONSTRUCT",
        body: "Turn the concept into a concrete form: product, service, space, object, system, technology or prototype.",
      },
      {
        key: "REALIZE",
        title: "REALIZE",
        body: "Test, prototype, transfer to production, develop a partnership or build the final implementation.",
      },
    ],
    closing: [
      "The result is not necessarily a product.",
      "The result is a clearer and more valuable form of a possibility.",
    ],
  },
  cases: {
    number: "03",
    title: "CASES",
    intro:
      "Projects organised around what was observed and what it became — not around disciplines.",
    labels: {
      observed: "observed",
      tension: "tension",
      opportunity: "opportunity",
      created: "created",
      next: "next form of realization",
      pending: "layer not documented yet",
      open: "open project",
      question: "question",
    },
    items: [
      {
        id: "lyra",
        code: "01",
        category: "OBJECT",
        title: "LYRA",
        stage: "prototype",
        question:
          "How can support be produced by tension rather than by mass?",
        observed:
          "Seating is usually built as volume: frame, filling, weight, specialised manufacturing.",
        tension:
          "The more material is added for comfort, the heavier and more production-dependent the object becomes.",
        opportunity:
          "A support structure where a flexible tension system carries the body, with minimal material.",
        created:
          "Tension-based seating system. Plywood and painted frame, DYNEEMA weaving cord, adaptive response. Built as a prototype with technical drawings and dimensions.",
        next:
          "Made-to-order production line, or licensing of the tension structure to a furniture manufacturer.",
        href: "/lyra",
        image: "lyra",
      },
      {
        id: "nava",
        code: "02",
        category: "OBJECT",
        title: "NAVA",
        stage: "prototype",
        question:
          "Can a single continuous line carry a body and hold a soft volume at the same time?",
        observed:
          "Lounge chairs normally separate structure and comfort into two distinct assemblies.",
        tension:
          "Two systems mean two production processes, two costs and a heavier object.",
        opportunity:
          "Closed-loop geometry that distributes load through one continuous frame while suspending the soft shell.",
        created:
          "Lounge chair with a continuous metal frame and a suspended felt shell. Prototype with technical sheet and 3D model.",
        next: null,
        href: "/nava",
        image: "nava",
      },
      {
        id: "void",
        code: "03",
        category: "CONCEPT",
        title: "VOID",
        stage: "concept",
        question: "What remains when form is removed?",
        observed: null,
        tension: null,
        opportunity: null,
        created: "Concept study. Visual and spatial research, not yet materialised.",
        next: null,
        href: "/void",
        image: "void",
      },
      {
        id: "semantic-time",
        code: "04",
        category: "PRODUCT",
        title: "SEMANTIC TIME",
        stage: "in use",
        question:
          "Can a repeating everyday signal be read as structure instead of coincidence?",
        observed:
          "People notice numeric patterns in time and have no non-mystical language to describe them.",
        tension:
          "The available interpretations are either predictive or dismissive; neither is analytical.",
        opportunity:
          "A cognitive instrument that classifies a time pattern structurally and returns a calm, analytical reading.",
        created:
          "A working web instrument with pattern classification, three observation modes and a shareable result.",
        next:
          "Extension into a broader instrument for structural observation.",
        href: "/semantic",
        image: null,
      },
    ],
  },
  exchange: {
    number: "04",
    title: "EXCHANGE",
    intro: [
      "I don't sell ideas.",
      "I create forms of value that can be developed, tested, produced or transferred.",
    ],
    youBringLabel: "You bring",
    youBring: [
      "problem",
      "idea",
      "unfinished product",
      "material",
      "technology",
      "business opportunity",
      "space",
      "observation",
      "question",
    ],
    iBringLabel: "I bring",
    iBring: [
      "research",
      "diagnosis",
      "concept",
      "product architecture",
      "design",
      "prototype",
      "system",
    ],
    modelsLabel: "Collaboration models",
    models: [
      { key: "RESEARCH", title: "RESEARCH", body: "Research and diagnosis of an opportunity." },
      { key: "CONCEPT", title: "CONCEPT", body: "Development of a concept and product architecture." },
      {
        key: "PROTOTYPE",
        title: "PROTOTYPE",
        body: "Transformation of the concept into a testable physical, spatial or digital form.",
      },
      {
        key: "PARTNERSHIP",
        title: "PARTNERSHIP",
        body: "Joint development where the exchange can include fixed payment, participation in the result, licensing, ownership or another agreed model.",
      },
    ],
    statement:
      "The exchange can be based on a fee, participation in the result, ownership, licensing, or a hybrid model — depending on the project.",
    diagramLabel: "structure of exchange",
    diagram: ["VALUE CREATED", "FORM OF REALIZATION", "FORM OF EXCHANGE"],
    note: "The form of exchange is determined by the type of value created, not by a fixed package.",
  },
  studio: {
    number: "05",
    title: "STUDIO",
    positioning:
      "Kolesnikov.studio is an author-led practice operating between architecture, design, research and product development.",
    role: "architect · designer · creator",
    disciplinesLabel: "One function, four instruments",
    disciplines: [
      { key: "ARCHITECTURE", body: "Used to work with space and systems." },
      { key: "DESIGN", body: "Used to work with objects and interfaces." },
      { key: "RESEARCH", body: "Used to discover structure and opportunity." },
      { key: "PRODUCT", body: "Used to turn an idea into a working form." },
    ],
    statement:
      "I am interested in the point where an observation becomes a structure, a structure becomes a concept, and a concept becomes something that can exist in the real world.",
    contactLabel: "contact",
  },
  start: {
    number: "06",
    title: "START WITH WHAT YOU HAVE.",
    subtitle: "You don't need to know what the final product should be.",
    q1: "What do you have?",
    q1Options: [
      "Problem",
      "Idea",
      "Product",
      "Space",
      "Material",
      "Technology",
      "Business opportunity",
      "Something else",
    ],
    q2: "What is the current state?",
    q2Options: [
      "I only have an observation.",
      "I have a concept.",
      "I have a prototype.",
      "I have an existing product.",
      "I have a business but something is not working.",
      "I don't know yet.",
    ],
    q3: "What do you want to discover?",
    q3Options: [
      "What is the opportunity?",
      "Who needs it?",
      "What are people willing to pay for?",
      "What could it become?",
      "How can it be developed?",
      "How can it be produced?",
      "How can it be positioned?",
    ],
    nameLabel: "Name",
    emailLabel: "Email",
    descLabel: "Short description",
    descPlaceholder: "What you observed, or what is not working.",
    cta: "Start a conversation",
    altLabel: "or write directly",
    telegram: "Telegram",
    email: "Email",
    copy: "Copy summary",
    copied: "Copied",
    required: "Add a short description so the conversation can start.",
    sentNote: "Your mail client opens with the summary prepared.",
  },
  footer: {
    left: "Kolesnikov.studio",
    right: "architecture · design · research · product",
    email: "email",
    telegram: "telegram",
  },
};

const ru: StudioContent = {
  nav: {
    brand: "Kolesnikov.studio",
    method: "Метод",
    cases: "Кейсы",
    exchange: "Обмен",
    studio: "Студия",
    start: "Начать",
    menu: "Меню",
  },
  meta: {
    title: "Kolesnikov.studio — Архитектура · Дизайн · Исследование · Продукт",
    description:
      "Kolesnikov.studio обнаруживает экономически интересные возможности и превращает их в продукты, пространства, системы и другие рабочие формы.",
  },
  home: {
    number: "01",
    label: "KOLESNIKOV.STUDIO",
    role: "архитектор · дизайнер · создатель",
    statement:
      "Я обнаруживаю экономически интересные возможности и превращаю их в продуктовые конструкции.",
    secondary:
      "Я исследую точку, где пересекаются спрос, ценность и возможность, — и превращаю найденное в продукт, сервис, пространство, объект, систему или другую рабочую форму.",
    ctaPrimary: "Начать разговор",
    ctaSecondary: "Смотреть кейсы",
    conceptLines: ["Я не начинаю с заранее заданного продукта.", "Я начинаю с сигнала."],
    chainLabel: "последовательность",
    chain: [
      "СИГНАЛ",
      "АНАЛИЗ",
      "ДИАГНОЗ",
      "КОНЦЕПТ",
      "ПРОЕКЦИЯ",
      "ПРОТОТИП",
      "ПРОДУКТ",
    ],
    scroll: "листать",
  },
  method: {
    number: "02",
    title: "МЕТОД",
    intro: [
      "Большинство проектов начинается с запроса.",
      "Я часто начинаю раньше — с того, что ещё не имеет названия.",
    ],
    steps: [
      {
        key: "OBSERVE",
        title: "НАБЛЮДЕНИЕ",
        body: "Найти сигнал: проблему, противоречие, неудовлетворённый спрос, материальную возможность, технологическую возможность, поведенческий паттерн или формирующуюся потребность.",
      },
      {
        key: "ANALYZE",
        title: "АНАЛИЗ",
        body: "Понять структуру: кого это затрагивает, что создаёт ценность, что люди действительно готовы отдавать в обмен — деньги, время, внимание, доступ или доверие.",
      },
      {
        key: "CONCEPT",
        title: "КОНЦЕПТ",
        body: "Определить ядро возможности и сформулировать возможное решение.",
      },
      {
        key: "CONSTRUCT",
        title: "КОНСТРУКЦИЯ",
        body: "Превратить концепт в конкретную форму: продукт, сервис, пространство, объект, систему, технологию или прототип.",
      },
      {
        key: "REALIZE",
        title: "РЕАЛИЗАЦИЯ",
        body: "Проверить, прототипировать, передать в производство, выстроить партнёрство или довести до финального воплощения.",
      },
    ],
    closing: [
      "Результат — не обязательно продукт.",
      "Результат — более ясная и более ценная форма возможности.",
    ],
  },
  cases: {
    number: "03",
    title: "КЕЙСЫ",
    intro:
      "Проекты собраны вокруг того, что было замечено и во что это превратилось, — а не вокруг дисциплин.",
    labels: {
      observed: "наблюдение",
      tension: "напряжение",
      opportunity: "возможность",
      created: "что создано",
      next: "следующая форма реализации",
      pending: "слой ещё не задокументирован",
      open: "открыть проект",
      question: "вопрос",
    },
    items: [
      {
        id: "lyra",
        code: "01",
        category: "OBJECT",
        title: "LYRA",
        stage: "прототип",
        question: "Может ли опора создаваться натяжением, а не массой?",
        observed:
          "Сиденье обычно строится как объём: каркас, наполнение, вес, специализированное производство.",
        tension:
          "Чем больше материала добавляется ради комфорта, тем тяжелее объект и тем сильнее он зависит от производства.",
        opportunity:
          "Структура опоры, где тело держит гибкая система натяжения при минимуме материала.",
        created:
          "Система сидения на натяжении. Каркас из фанеры с покраской, шнур DYNEEMA, адаптивный отклик. Прототип с чертежами и размерами.",
        next:
          "Производство под заказ или лицензирование конструкции натяжения мебельному производителю.",
        href: "/lyra",
        image: "lyra",
      },
      {
        id: "nava",
        code: "02",
        category: "OBJECT",
        title: "NAVA",
        stage: "прототип",
        question:
          "Может ли одна непрерывная линия одновременно держать тело и удерживать мягкий объём?",
        observed:
          "В лаунж-креслах структура и комфорт обычно разделены на две отдельные сборки.",
        tension: "Две системы — это два процесса производства, две стоимости и более тяжёлый объект.",
        opportunity:
          "Замкнутая геометрия, распределяющая нагрузку через один непрерывный каркас и подвешивающая мягкую оболочку.",
        created:
          "Лаунж-кресло с непрерывным металлическим каркасом и подвешенной войлочной оболочкой. Прототип с техническим листом и 3D-моделью.",
        next: null,
        href: "/nava",
        image: "nava",
      },
      {
        id: "void",
        code: "03",
        category: "CONCEPT",
        title: "VOID",
        stage: "концепт",
        question: "Что остаётся, когда форма убрана?",
        observed: null,
        tension: null,
        opportunity: null,
        created: "Концептуальное исследование. Визуальная и пространственная работа, пока не материализована.",
        next: null,
        href: "/void",
        image: "void",
      },
      {
        id: "semantic-time",
        code: "04",
        category: "PRODUCT",
        title: "SEMANTIC TIME",
        stage: "работает",
        question:
          "Можно ли читать повторяющийся бытовой сигнал как структуру, а не как совпадение?",
        observed:
          "Люди замечают числовые паттерны времени и не имеют немистического языка, чтобы их описать.",
        tension:
          "Доступные трактовки либо предсказательные, либо отрицающие; ни одна не является аналитической.",
        opportunity:
          "Когнитивный инструмент, который структурно классифицирует паттерн и возвращает спокойное аналитическое прочтение.",
        created:
          "Работающий веб-инструмент: классификация паттернов, три режима наблюдения, результат, которым можно поделиться.",
        next: "Расширение до более широкого инструмента структурного наблюдения.",
        href: "/semantic",
        image: null,
      },
    ],
  },
  exchange: {
    number: "04",
    title: "ОБМЕН",
    intro: [
      "Я не продаю идеи.",
      "Я создаю формы ценности, которые можно развивать, проверять, производить или передавать.",
    ],
    youBringLabel: "Вы приносите",
    youBring: [
      "проблему",
      "идею",
      "незавершённый продукт",
      "материал",
      "технологию",
      "бизнес-возможность",
      "пространство",
      "наблюдение",
      "вопрос",
    ],
    iBringLabel: "Я приношу",
    iBring: [
      "исследование",
      "диагностику",
      "концепт",
      "архитектуру продукта",
      "дизайн",
      "прототип",
      "систему",
    ],
    modelsLabel: "Модели сотрудничества",
    models: [
      { key: "RESEARCH", title: "ИССЛЕДОВАНИЕ", body: "Исследование и диагностика возможности." },
      { key: "CONCEPT", title: "КОНЦЕПТ", body: "Разработка концепта и архитектуры продукта." },
      {
        key: "PROTOTYPE",
        title: "ПРОТОТИП",
        body: "Превращение концепта в проверяемую физическую, пространственную или цифровую форму.",
      },
      {
        key: "PARTNERSHIP",
        title: "ПАРТНЁРСТВО",
        body: "Совместная разработка, где обмен может включать фиксированную оплату, участие в результате, лицензирование, владение или другую согласованную модель.",
      },
    ],
    statement:
      "Обмен может строиться на гонораре, участии в результате, владении, лицензировании или гибридной модели — в зависимости от проекта.",
    diagramLabel: "структура обмена",
    diagram: ["СОЗДАННАЯ ЦЕННОСТЬ", "ФОРМА РЕАЛИЗАЦИИ", "ФОРМА ОБМЕНА"],
    note: "Форма обмена определяется типом создаваемой ценности, а не фиксированным пакетом.",
  },
  studio: {
    number: "05",
    title: "СТУДИЯ",
    positioning:
      "Kolesnikov.studio — авторская практика, работающая между архитектурой, дизайном, исследованием и разработкой продукта.",
    role: "архитектор · дизайнер · создатель",
    disciplinesLabel: "Одна функция, четыре инструмента",
    disciplines: [
      { key: "АРХИТЕКТУРА", body: "Используется для работы с пространством и системами." },
      { key: "ДИЗАЙН", body: "Используется для работы с объектами и интерфейсами." },
      { key: "ИССЛЕДОВАНИЕ", body: "Используется, чтобы обнаружить структуру и возможность." },
      { key: "ПРОДУКТ", body: "Используется, чтобы превратить идею в работающую форму." },
    ],
    statement:
      "Меня интересует точка, где наблюдение становится структурой, структура становится концептом, а концепт становится тем, что может существовать в реальном мире.",
    contactLabel: "контакт",
  },
  start: {
    number: "06",
    title: "НАЧНИТЕ С ТОГО, ЧТО У ВАС ЕСТЬ.",
    subtitle: "Вам не нужно знать, каким должен быть финальный продукт.",
    q1: "Что у вас есть?",
    q1Options: [
      "Проблема",
      "Идея",
      "Продукт",
      "Пространство",
      "Материал",
      "Технология",
      "Бизнес-возможность",
      "Что-то другое",
    ],
    q2: "В каком это состоянии сейчас?",
    q2Options: [
      "У меня только наблюдение.",
      "У меня есть концепт.",
      "У меня есть прототип.",
      "У меня есть работающий продукт.",
      "У меня есть бизнес, но что-то не работает.",
      "Пока не знаю.",
    ],
    q3: "Что вы хотите обнаружить?",
    q3Options: [
      "В чём возможность?",
      "Кому это нужно?",
      "За что люди готовы платить?",
      "Чем это может стать?",
      "Как это развивать?",
      "Как это произвести?",
      "Как это позиционировать?",
    ],
    nameLabel: "Имя",
    emailLabel: "Email",
    descLabel: "Короткое описание",
    descPlaceholder: "Что вы заметили или что не работает.",
    cta: "Начать разговор",
    altLabel: "или написать напрямую",
    telegram: "Telegram",
    email: "Email",
    copy: "Скопировать сводку",
    copied: "Скопировано",
    required: "Добавьте короткое описание, чтобы разговор мог начаться.",
    sentNote: "Почтовый клиент откроется с подготовленной сводкой.",
  },
  footer: {
    left: "Kolesnikov.studio",
    right: "архитектура · дизайн · исследование · продукт",
    email: "email",
    telegram: "telegram",
  },
};

const uk: StudioContent = {
  ...ru,
  nav: {
    brand: "Kolesnikov.studio",
    method: "Метод",
    cases: "Кейси",
    exchange: "Обмін",
    studio: "Студія",
    start: "Почати",
    menu: "Меню",
  },
  meta: {
    title: "Kolesnikov.studio — Архітектура · Дизайн · Дослідження · Продукт",
    description:
      "Kolesnikov.studio виявляє економічно цікаві можливості та перетворює їх на продукти, простори, системи та інші робочі форми.",
  },
  home: {
    number: "01",
    label: "KOLESNIKOV.STUDIO",
    role: "архітектор · дизайнер · творець",
    statement:
      "Я виявляю економічно цікаві можливості та перетворюю їх на продуктові конструкції.",
    secondary:
      "Я досліджую точку, де перетинаються попит, цінність і можливість, — і перетворюю знайдене на продукт, сервіс, простір, об'єкт, систему або іншу робочу форму.",
    ctaPrimary: "Почати розмову",
    ctaSecondary: "Дивитись кейси",
    conceptLines: ["Я не починаю із заздалегідь заданого продукту.", "Я починаю із сигналу."],
    chainLabel: "послідовність",
    chain: ["СИГНАЛ", "АНАЛІЗ", "ДІАГНОЗ", "КОНЦЕПТ", "ПРОЕКЦІЯ", "ПРОТОТИП", "ПРОДУКТ"],
    scroll: "гортати",
  },
  method: {
    number: "02",
    title: "МЕТОД",
    intro: [
      "Більшість проєктів починається із запиту.",
      "Я часто починаю раніше — з того, що ще не має назви.",
    ],
    steps: [
      {
        key: "OBSERVE",
        title: "СПОСТЕРЕЖЕННЯ",
        body: "Знайти сигнал: проблему, суперечність, незадоволений попит, матеріальну можливість, технологічну можливість, поведінковий патерн або потребу, що формується.",
      },
      {
        key: "ANALYZE",
        title: "АНАЛІЗ",
        body: "Зрозуміти структуру: кого це стосується, що створює цінність, що люди справді готові віддавати в обмін — гроші, час, увагу, доступ або довіру.",
      },
      {
        key: "CONCEPT",
        title: "КОНЦЕПТ",
        body: "Визначити ядро можливості та сформулювати можливе рішення.",
      },
      {
        key: "CONSTRUCT",
        title: "КОНСТРУКЦІЯ",
        body: "Перетворити концепт на конкретну форму: продукт, сервіс, простір, об'єкт, систему, технологію або прототип.",
      },
      {
        key: "REALIZE",
        title: "РЕАЛІЗАЦІЯ",
        body: "Перевірити, прототипувати, передати у виробництво, вибудувати партнерство або довести до фінального втілення.",
      },
    ],
    closing: [
      "Результат — не обов'язково продукт.",
      "Результат — ясніша та цінніша форма можливості.",
    ],
  },
  exchange: {
    ...ru.exchange,
    title: "ОБМІН",
    intro: [
      "Я не продаю ідеї.",
      "Я створюю форми цінності, які можна розвивати, перевіряти, виробляти або передавати.",
    ],
    youBringLabel: "Ви приносите",
    iBringLabel: "Я приношу",
    modelsLabel: "Моделі співпраці",
    statement:
      "Обмін може будуватися на гонорарі, участі в результаті, володінні, ліцензуванні або гібридній моделі — залежно від проєкту.",
    diagramLabel: "структура обміну",
    diagram: ["СТВОРЕНА ЦІННІСТЬ", "ФОРМА РЕАЛІЗАЦІЇ", "ФОРМА ОБМІНУ"],
    note: "Форма обміну визначається типом створюваної цінності, а не фіксованим пакетом.",
  },
  studio: {
    ...ru.studio,
    title: "СТУДІЯ",
    positioning:
      "Kolesnikov.studio — авторська практика, що працює між архітектурою, дизайном, дослідженням і розробкою продукту.",
    role: "архітектор · дизайнер · творець",
    disciplinesLabel: "Одна функція, чотири інструменти",
    statement:
      "Мене цікавить точка, де спостереження стає структурою, структура стає концептом, а концепт стає тим, що може існувати в реальному світі.",
    contactLabel: "контакт",
  },
  start: {
    ...ru.start,
    title: "ПОЧНІТЬ З ТОГО, ЩО У ВАС Є.",
    subtitle: "Вам не потрібно знати, яким має бути фінальний продукт.",
    q1: "Що у вас є?",
    q2: "У якому це стані зараз?",
    q3: "Що ви хочете виявити?",
    nameLabel: "Ім'я",
    descLabel: "Короткий опис",
    cta: "Почати розмову",
    altLabel: "або написати напряму",
  },
  footer: {
    left: "Kolesnikov.studio",
    right: "архітектура · дизайн · дослідження · продукт",
    email: "email",
    telegram: "telegram",
  },
};

const CONTENT: Record<Locale, StudioContent> = { en, ru, uk };

export const getStudioContent = (locale: Locale): StudioContent => CONTENT[locale] ?? en;
