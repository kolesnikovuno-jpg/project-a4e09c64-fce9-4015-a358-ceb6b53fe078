/**
 * Kolesnikov — single editable source of copy for the redesigned site.
 * All strings for every locale live here.
 */

import type { Locale } from "@/i18n/config";

export interface WorkItem {
  id: string;
  title: string;
  type: string;
  description: string;
  href: string;
  image: "lyra" | "nava" | "void" | null;
}

export interface SiteContent {
  meta: { title: string; description: string };
  nav: { work: string; process: string; about: string; contact: string; menu: string; close: string };
  hero: {
    name: string;
    disciplines: string;
    statement: string;
    support: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  when: {
    number: string;
    label: string;
    headline: string;
    items: { n: string; title: string; body: string }[];
  };
  what: {
    number: string;
    label: string;
    headline: string;
    stages: { n: string; title: string; keywords: string[]; body: string }[];
  };
  work: { number: string; label: string; headline: string; items: WorkItem[]; open: string };
  author: {
    number: string;
    label: string;
    headline: string;
    role: string;
    paragraphs: string[];
  };
  start: {
    number: string;
    label: string;
    headline: string;
    body: string[];
    cta: string;
    nameLabel: string;
    contactLabel: string;
    messageLabel: string;
    messagePlaceholder: string;
    send: string;
    copy: string;
    copied: string;
    required: string;
    sentNote: string;
    or: string;
  };
  closing: { statement: string; small: string };
}

export const contact = {
  email: "kolesnikov.uno@gmail.com",
  telegram: "https://t.me/kolesnikov_uno",
};

const workEn: WorkItem[] = [
  {
    id: "lyra",
    title: "LYRA",
    type: "Object / Furniture",
    description: "A seating system where support is produced by tension instead of mass.",
    href: "/lyra",
    image: "lyra",
  },
  {
    id: "nava",
    title: "NAVA",
    type: "Object / Interior",
    description: "A lounge chair built from one continuous frame holding a suspended soft shell.",
    href: "/nava",
    image: "nava",
  },
  {
    id: "void",
    title: "VOID",
    type: "Concept",
    description: "A spatial study of what remains when form is removed.",
    href: "/void",
    image: "void",
  },
  {
    id: "semantic",
    title: "SEMANTIC TIME",
    type: "Product / Instrument",
    description: "A working instrument that reads repeating time patterns as structure.",
    href: "/semantic",
    image: null,
  },
];

const workRu: WorkItem[] = [
  { ...workEn[0], type: "Объект / Мебель", description: "Система сидения, где опора создаётся натяжением, а не массой." },
  { ...workEn[1], type: "Объект / Интерьер", description: "Кресло из одной непрерывной рамы, удерживающей подвешенную мягкую оболочку." },
  { ...workEn[2], type: "Концепт", description: "Пространственное исследование того, что остаётся, когда убрана форма." },
  { ...workEn[3], type: "Продукт / Инструмент", description: "Рабочий инструмент, который читает повторяющиеся паттерны времени как структуру." },
];

const workUk: WorkItem[] = [
  { ...workEn[0], type: "Об'єкт / Меблі", description: "Система сидіння, де опора створюється натягом, а не масою." },
  { ...workEn[1], type: "Об'єкт / Інтер'єр", description: "Крісло з однієї безперервної рами, що тримає підвішену м'яку оболонку." },
  { ...workEn[2], type: "Концепт", description: "Просторове дослідження того, що лишається, коли прибрано форму." },
  { ...workEn[3], type: "Продукт / Інструмент", description: "Робочий інструмент, який читає повторювані патерни часу як структуру." },
];

const en: SiteContent = {
  meta: {
    title: "Kolesnikov — Architecture · Design · Art",
    description:
      "Kolesnikov is an independent architecture, design and art practice focused on understanding the potential of spaces and turning ideas into clear concepts and tangible forms.",
  },
  nav: { work: "Work", process: "Process", about: "About", contact: "Contact", menu: "Menu", close: "Close" },
  hero: {
    name: "Kolesnikov",
    disciplines: "Architecture · Design · Art",
    statement: "I help understand what a space can become.",
    support:
      "Researching the structure, potential and constraints of a space — and turning them into a clear concept, direction and tangible form.",
    ctaPrimary: "Start a conversation",
    ctaSecondary: "View work",
  },
  when: {
    number: "01",
    label: "When to come",
    headline: "Come to me when the answer is not obvious.",
    items: [
      {
        n: "01",
        title: "You have a space, but don't know what to do with it.",
        body: "Apartment, house, site or commercial space.",
      },
      {
        n: "02",
        title: "You have a plan, but something doesn't work.",
        body: "The layout exists, but the space lacks clarity, logic or potential.",
      },
      {
        n: "03",
        title: "You are about to invest in a space.",
        body: "You want to understand its potential before committing significant money to renovation, reconstruction or development.",
      },
      {
        n: "04",
        title: "You have an idea, but it has not become a form yet.",
        body: "A concept, object or spatial idea needs to be translated into something tangible.",
      },
    ],
  },
  what: {
    number: "02",
    label: "What I do",
    headline: "From uncertainty to form.",
    stages: [
      {
        n: "01",
        title: "Understand",
        keywords: ["Research", "Analysis", "Diagnosis"],
        body: "Understand what exists, what is missing, what conflicts and what potential is hidden in the situation.",
      },
      {
        n: "02",
        title: "Define",
        keywords: ["Concept", "Spatial strategy", "Visual direction"],
        body: "Transform observations into a clear direction.",
      },
      {
        n: "03",
        title: "Realize",
        keywords: ["Architecture", "Interior", "Object", "Art"],
        body: "Turn the direction into a tangible result.",
      },
    ],
  },
  work: { number: "03", label: "Work", headline: "Selected work", items: workEn, open: "Open project" },
  author: {
    number: "04",
    label: "The author",
    headline: "Rostislav Kolesnikov",
    role: "Architect · Designer · Artist",
    paragraphs: [
      "I work at the intersection of space, structure, perception and form.",
      "My practice moves between architecture, design and art depending on what the problem requires. Sometimes the answer is a building or a layout, sometimes an object, sometimes a single decision that changes how a space is used.",
      "I start with the situation itself: what is there, what is missing, what it could become. The discipline follows from that, not the other way around.",
    ],
  },
  start: {
    number: "05",
    label: "How we start",
    headline: "Start with the situation, not the service.",
    body: [
      "Tell me what you have, what is not working, or what you are trying to create.",
      "I will help define what kind of work is actually needed.",
    ],
    cta: "Describe your situation",
    nameLabel: "Name",
    contactLabel: "Email / Telegram",
    messageLabel: "Tell me about the space or idea",
    messagePlaceholder: "A few sentences are enough.",
    send: "Send",
    copy: "Copy text",
    copied: "Copied",
    required: "Add a few words about the space or idea.",
    sentNote: "Your mail app opens with the message prepared.",
    or: "or write directly",
  },
  closing: {
    statement: "Space has potential before it has a project.",
    small: "Kolesnikov — Architecture · Design · Art",
  },
};

const ru: SiteContent = {
  meta: {
    title: "Колесников — Архитектура · Дизайн · Искусство",
    description:
      "Независимая практика архитектуры, дизайна и искусства: понять потенциал пространства и превратить идею в ясную концепцию и осязаемую форму.",
  },
  nav: { work: "Работы", process: "Процесс", about: "Обо мне", contact: "Контакт", menu: "Меню", close: "Закрыть" },
  hero: {
    name: "Колесников",
    disciplines: "Архитектура · Дизайн · Искусство",
    statement: "Я помогаю понять, чем может стать пространство.",
    support:
      "Исследую структуру, потенциал и ограничения пространства — и превращаю их в ясную концепцию, направление и осязаемую форму.",
    ctaPrimary: "Начать разговор",
    ctaSecondary: "Смотреть работы",
  },
  when: {
    number: "01",
    label: "Когда прийти",
    headline: "Приходите, когда ответ неочевиден.",
    items: [
      { n: "01", title: "У вас есть пространство, но непонятно, что с ним делать.", body: "Квартира, дом, участок или коммерческое помещение." },
      { n: "02", title: "План есть, но что-то не работает.", body: "Планировка существует, но пространству не хватает ясности, логики или потенциала." },
      { n: "03", title: "Вы собираетесь вложиться в пространство.", body: "Хотите понять его потенциал до того, как вкладывать серьёзные деньги в ремонт, реконструкцию или строительство." },
      { n: "04", title: "Есть идея, но она ещё не стала формой.", body: "Концепцию, объект или пространственную идею нужно перевести во что-то осязаемое." },
    ],
  },
  what: {
    number: "02",
    label: "Что я делаю",
    headline: "От неопределённости к форме.",
    stages: [
      { n: "01", title: "Понять", keywords: ["Исследование", "Анализ", "Диагноз"], body: "Понять, что есть, чего не хватает, что конфликтует и какой потенциал скрыт в ситуации." },
      { n: "02", title: "Определить", keywords: ["Концепция", "Пространственная стратегия", "Визуальное направление"], body: "Превратить наблюдения в ясное направление." },
      { n: "03", title: "Реализовать", keywords: ["Архитектура", "Интерьер", "Объект", "Искусство"], body: "Превратить направление в осязаемый результат." },
    ],
  },
  work: { number: "03", label: "Работы", headline: "Избранные работы", items: workRu, open: "Открыть проект" },
  author: {
    number: "04",
    label: "Автор",
    headline: "Ростислав Колесников",
    role: "Архитектор · Дизайнер · Художник",
    paragraphs: [
      "Я работаю на пересечении пространства, структуры, восприятия и формы.",
      "Практика движется между архитектурой, дизайном и искусством — в зависимости от того, чего требует задача. Иногда ответ — это здание или планировка, иногда объект, иногда одно решение, которое меняет способ использования пространства.",
      "Я начинаю с самой ситуации: что есть, чего не хватает, чем это может стать. Дисциплина следует из этого, а не наоборот.",
    ],
  },
  start: {
    number: "05",
    label: "Как мы начинаем",
    headline: "Начните с ситуации, а не с услуги.",
    body: [
      "Расскажите, что у вас есть, что не работает или что вы пытаетесь создать.",
      "Я помогу определить, какая работа нужна на самом деле.",
    ],
    cta: "Опишите вашу ситуацию",
    nameLabel: "Имя",
    contactLabel: "Email / Telegram",
    messageLabel: "Расскажите о пространстве или идее",
    messagePlaceholder: "Достаточно нескольких предложений.",
    send: "Отправить",
    copy: "Скопировать текст",
    copied: "Скопировано",
    required: "Напишите несколько слов о пространстве или идее.",
    sentNote: "Почтовое приложение откроется с готовым письмом.",
    or: "или напишите напрямую",
  },
  closing: {
    statement: "У пространства есть потенциал ещё до того, как появится проект.",
    small: "Колесников — Архитектура · Дизайн · Искусство",
  },
};

const uk: SiteContent = {
  meta: {
    title: "Колесников — Архітектура · Дизайн · Мистецтво",
    description:
      "Незалежна практика архітектури, дизайну та мистецтва: зрозуміти потенціал простору й перетворити ідею на ясну концепцію та відчутну форму.",
  },
  nav: { work: "Роботи", process: "Процес", about: "Про мене", contact: "Контакт", menu: "Меню", close: "Закрити" },
  hero: {
    name: "Колесников",
    disciplines: "Архітектура · Дизайн · Мистецтво",
    statement: "Я допомагаю зрозуміти, чим може стати простір.",
    support:
      "Досліджую структуру, потенціал і обмеження простору — і перетворюю їх на ясну концепцію, напрям та відчутну форму.",
    ctaPrimary: "Почати розмову",
    ctaSecondary: "Дивитись роботи",
  },
  when: {
    number: "01",
    label: "Коли приходити",
    headline: "Приходьте, коли відповідь неочевидна.",
    items: [
      { n: "01", title: "У вас є простір, але незрозуміло, що з ним робити.", body: "Квартира, будинок, ділянка або комерційне приміщення." },
      { n: "02", title: "План є, але щось не працює.", body: "Планування існує, але простору бракує ясності, логіки чи потенціалу." },
      { n: "03", title: "Ви збираєтесь вкластися в простір.", body: "Хочете зрозуміти його потенціал до того, як вкладати серйозні гроші в ремонт, реконструкцію чи будівництво." },
      { n: "04", title: "Є ідея, але вона ще не стала формою.", body: "Концепцію, об'єкт або просторову ідею треба перевести у щось відчутне." },
    ],
  },
  what: {
    number: "02",
    label: "Що я роблю",
    headline: "Від невизначеності до форми.",
    stages: [
      { n: "01", title: "Зрозуміти", keywords: ["Дослідження", "Аналіз", "Діагноз"], body: "Зрозуміти, що є, чого бракує, що конфліктує і який потенціал прихований у ситуації." },
      { n: "02", title: "Визначити", keywords: ["Концепція", "Просторова стратегія", "Візуальний напрям"], body: "Перетворити спостереження на ясний напрям." },
      { n: "03", title: "Реалізувати", keywords: ["Архітектура", "Інтер'єр", "Об'єкт", "Мистецтво"], body: "Перетворити напрям на відчутний результат." },
    ],
  },
  work: { number: "03", label: "Роботи", headline: "Вибрані роботи", items: workUk, open: "Відкрити проєкт" },
  author: {
    number: "04",
    label: "Автор",
    headline: "Ростислав Колесников",
    role: "Архітектор · Дизайнер · Художник",
    paragraphs: [
      "Я працюю на перетині простору, структури, сприйняття і форми.",
      "Практика рухається між архітектурою, дизайном і мистецтвом — залежно від того, чого потребує задача. Іноді відповідь — це будівля чи планування, іноді об'єкт, іноді одне рішення, яке змінює спосіб використання простору.",
      "Я починаю із самої ситуації: що є, чого бракує, чим це може стати. Дисципліна випливає з цього, а не навпаки.",
    ],
  },
  start: {
    number: "05",
    label: "Як ми починаємо",
    headline: "Почніть із ситуації, а не з послуги.",
    body: [
      "Розкажіть, що у вас є, що не працює або що ви намагаєтесь створити.",
      "Я допоможу визначити, яка робота потрібна насправді.",
    ],
    cta: "Опишіть вашу ситуацію",
    nameLabel: "Ім'я",
    contactLabel: "Email / Telegram",
    messageLabel: "Розкажіть про простір або ідею",
    messagePlaceholder: "Достатньо кількох речень.",
    send: "Надіслати",
    copy: "Скопіювати текст",
    copied: "Скопійовано",
    required: "Напишіть кілька слів про простір або ідею.",
    sentNote: "Поштовий застосунок відкриється з готовим листом.",
    or: "або напишіть напряму",
  },
  closing: {
    statement: "Простір має потенціал ще до того, як з'явиться проєкт.",
    small: "Колесников — Архітектура · Дизайн · Мистецтво",
  },
};

const MAP: Record<Locale, SiteContent> = { en, ru, uk } as Record<Locale, SiteContent>;

export const getSiteContent = (locale: Locale): SiteContent => MAP[locale] ?? en;
