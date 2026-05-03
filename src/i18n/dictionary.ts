import type { Locale } from "./config";

// Structural shape — derived from EN but widened to plain `string` so RU/UK
// values are not narrowed to literal types of the EN source.
export type Dictionary = {
  nav: { back: string; info: string; ar: string; uno: string };
  index: {
    structure_label: string;
    tagline: string;
    pricing_link: string;
    architect_design_art: string;
    studio_suffix: string;
    author_link: string;
    aria_open: string;
    aria_close: string;
  };
  about: {
    seo_title: string;
    name: string;
    studio_label: string;
    back_aria: string;
    body_1: string;
    body_2: string;
    body_3: string;
    body_4: string;
  };
  pricing: {
    seo_title: string;
    header: string;
    back_aria: string;
    essence_label: string;
    essence_lead_1: string;
    essence_lead_2: string;
    essence_body_1: string;
    essence_body_2: string;
    process_label: string;
    process_body: string;
    entry_label: string;
    entry_body: string;
    stage_result_label: string;
    stage_result_items: readonly string[];
    cost_value: string;
    cost_body: string;
    cost_after: string;
    further_label: string;
    further_body: string;
    final_label: string;
    final_value: string;
    final_body: string;
    terms_label: string;
    terms_body: string;
    rights_label: string;
    rights_body: string;
    contact_label: string;
    contact_body: string;
    contact_telegram: string;
    back_button: string;
  };
  garden: {
    password_placeholder: string;
    password_error: string;
    bud_label_lyra: string;
    bud_label_unocalc: string;
    aria_element: string;
  };
  gateway: {
    studio_suffix: string;
    enter: string;
  };
  notfound: {
    message: string;
  };
  lyra: {
    hero_caption: string;
    rotated_line: string;
    dimensions_alt: string;
    hero_alt: string;
    seo_title: string;
    seo_description: string;
  };
  lyra_info: {
    ref: string;
    title: string;
    model_label: string;
    model_value: string;
    status_label: string;
    status_value: string;
    sections: {
      overview: string;
      specifications: string;
      structure: string;
      material: string;
      share: string;
      contact: string;
    };
    overview: readonly string[];
    spec_keys: { height: string; width: string; length: string };
    structure: readonly string[];
    material_keys: { textile: string; frame: string; color: string };
    material_values: { textile: string; frame: string; color: string };
    copy_link: string;
    copy_done: string;
    copy_failed: string;
    system_share: string;
    link_copied: string;
    qr_label: string;
    process_label: string;
    process_flow: string;
    production_label: string;
    production_lines: readonly string[];
    inquiry_label: string;
    technical_label: string;
    technical_description: string;
    technical_link: string;
    contact_telegram: string;
    contact_email: string;
    footer_left: string;
    footer_right: string;
    close_aria: string;
  };
};

// EN is the source of truth. RU and UA are adapted (not literal translation).
// Add new keys to EN first, then mirror to RU and UK.
export const dictionary: Record<Locale, Dictionary> = {
  en: {
    nav: { back: "← back", info: "info", ar: "ar", uno: ".uno" },
    index: {
      structure_label: "no structure — no solution.",
      tagline: "I uncover the structure and assemble the form where everything falls into place.",
      pricing_link: "Format & pricing →",
      architect_design_art: "architect  .  design  .  art",
      studio_suffix: "studio",
      author_link: "R.Yury Kolesnikov ⟶",
      aria_open: "Open",
      aria_close: "Close",
    },
    about: {
      seo_title: "About — .uno studio",
      name: "R.Yury Kolesnikov",
      studio_label: ".uno studio",
      back_aria: "Back",
      body_1:
        "I am, and I am a creative consciousness. My actions are aimed at raising the quality of life in all its variety and splendor — life as an arena composed of elements that define its spatial structure in time, resting on the fundamental properties of matter, using digital virtuality as a tool to create and obtain the meaningful and necessary elements of our everyday life.",
      body_2:
        "Thus, my perception is concentrated on the object, the product, or the element of life in a holographic format of the spatial structure of a dimensionless unit of the universe.",
      body_3:
        "I know this and hope my participation helps each person feel happier and lighter.",
      body_4:
        "In this is the manifestation of love and care for the human being living on planet Earth, as an entity of the higher consciousness of the world.",
    },
    pricing: {
      seo_title: "Format & pricing — .uno studio",
      header: "format & pricing",
      back_aria: "Back",
      essence_label: "The work",
      essence_lead_1: "Sometimes the problem is not the solution,",
      essence_lead_2: "it is the absence of structure.",
      essence_body_1: "I reveal the structure and translate it into a form",
      essence_body_2: "that works.",
      process_label: "Process",
      process_body:
        "Work begins with an analysis of the situation. At this stage we define the context, the direction, and decide on the further format of work.",
      entry_label: "Entry",
      entry_body:
        "The first stage is analysis of the situation. Without it, work does not continue.",
      stage_result_label: "Result of the stage:",
      stage_result_items: [
        "shaping the concept",
        "understanding the real task",
        "estimating the cost range of realization",
      ],
      cost_value: "Cost: 300⟶1000+ $",
      cost_body:
        "depending on the scale of the task and depth of the work. The amount is included in the final cost.",
      cost_after:
        "After the analysis we decide on the format of further work.",
      further_label: "Further work",
      further_body:
        "Then — project development and supervision of realization, in stages, tied to the actual progress of the work.",
      final_label: "Final cost",
      final_value: "10–20% of total project realization costs",
      final_body:
        "The exact percentage is determined after the analysis, depends on complexity, scale and level of involvement, and is fixed before realization begins.",
      terms_label: "Terms",
      terms_body:
        "All key parameters are agreed in advance; changes are possible only when the task itself changes.",
      rights_label: "Rights",
      rights_body:
        "Work is conducted under copyright. Delivered solutions may not be used without agreement. Rights to the result are transferred separately.",
      contact_label: "Contact",
      contact_body:
        "When a task appears — write. Work begins with analysis of the situation.",
      contact_telegram: "Write on Telegram →",
      back_button: "Back",
    },
    garden: {
      password_placeholder: "••••",
      password_error: "wrong password",
      bud_label_lyra: "Lyra — no effort",
      bud_label_unocalc: "unocalc",
      aria_element: "Element",
    },
    gateway: {
      studio_suffix: "studio",
      enter: "enter →",
    },
    notfound: {
      message: "Page not found",
    },
    lyra: {
      hero_caption: "Form that carries the body",
      rotated_line: "The lighter the effort — the more precise the support.",
      dimensions_alt: "Lyra — technical drawing with dimensions",
      hero_alt: "Lyra chair — woman reclining in a sunlit concrete interior",
      seo_title: "LYRA — .uno studio",
      seo_description:
        "LYRA — tension-based seating system. Flexible support structure, minimal material, adaptive response.",
    },
    lyra_info: {
      ref: "uno / lyra / 001",
      title: "LYRA",
      model_label: "model",
      model_value: "chair",
      status_label: "status",
      status_value: "prototype",
      sections: {
        overview: "overview",
        specifications: "specifications",
        structure: "structure",
        material: "material",
        share: "share · reference",
        contact: "contact",
      },
      overview: [
        "Tension-based seating system",
        "Flexible support structure",
        "Minimal material, adaptive response",
      ],
      spec_keys: { height: "height", width: "width", length: "length" },
      structure: ["tension system", "flexible support"],
      material_keys: { textile: "textile", frame: "frame", color: "color" },
      material_values: {
        textile: "DYNEEMA weaving cord",
        frame: "plywood and paint",
        color: "customizable",
      },
      copy_link: "copy link",
      copy_done: "copied",
      copy_failed: "failed",
      system_share: "system share",
      link_copied: "link copied",
      qr_label: "scan · transmit",
      process_label: "process",
      process_flow: "request → details → production",
      production_label: "production",
      production_lines: ["made to order", "lead time 4–6 weeks"],
      inquiry_label: "inquiry",
      technical_label: "technical",
      technical_description: "drawing & dimensions",
      technical_link: "view technical sheet",
      contact_telegram: "telegram",
      contact_email: "email",
      footer_left: "uno · studio",
      footer_right: "kolesnikov",
      close_aria: "close",
    },
  },
  ru: {
    nav: { back: "← назад", info: "инфо", ar: "ar", uno: ".uno" },
    index: {
      structure_label: "нет структуры — нет решения.",
      tagline: "выявляю структуру и собираю форму, в которой всё становится на место.",
      pricing_link: "Формат и стоимость →",
      architect_design_art: "architect  .  design  .  art",
      studio_suffix: "studio",
      author_link: "R.Yury Kolesnikov ⟶",
      aria_open: "Открыть",
      aria_close: "Закрыть",
    },
    about: {
      seo_title: "О себе — .uno studio",
      name: "R.Yury Kolesnikov",
      studio_label: ".uno studio",
      back_aria: "Назад",
      body_1:
        "Я есть и являю собой творческое сознание. Мои действия направлены с целью повышение качества жизни во всём её многообразии и великолепии, жизни как арены, состоящей из элементов определяющих пространственную структуру оной во времени, опирающуюся на фундаментальные свойства материи, используя цифровую виртуальность как инструмент для создания и обретения значимых и необходимых элементов нашей повседневности.",
      body_2:
        "Таким образом моё восприятие сконцентрировано на предмете, продукте, или же элементе жизни в голографическом формате пространственной структуры безразмерной единицы вселенной.",
      body_3:
        "Знаю это и надеюсь, что моё соучастие поможет каждому почувствовать себя счастливее и веселее.",
      body_4:
        "В этом есть проявление любви и заботы о человеке, живущем на планете Земля, как сущности высшего сознания мира.",
    },
    pricing: {
      seo_title: "Формат и стоимость — .uno studio",
      header: "формат и стоимость",
      back_aria: "Назад",
      essence_label: "Суть работы",
      essence_lead_1: "Иногда проблема не в решении,",
      essence_lead_2: "а в отсутствии структуры.",
      essence_body_1: "Я выявляю структуру и перевожу её в форму,",
      essence_body_2: "которая работает.",
      process_label: "Процесс",
      process_body:
        "Работа начинается с анализа ситуации. На данном этапе определяется контекст, направление и принимается решение о дальнейшем формате работы.",
      entry_label: "Вход",
      entry_body:
        "Первый этап — анализ ситуации. Без его прохождения работа не продолжается.",
      stage_result_label: "Результат этапа:",
      stage_result_items: [
        "формирование концепции",
        "понимание реальной задачи",
        "оценка диапазона стоимости реализации",
      ],
      cost_value: "Стоимость: 300⟶1000+ $",
      cost_body:
        "в зависимости от масштаба задачи и глубины проработки. Сумма входит в итоговую стоимость.",
      cost_after:
        "После анализа принимается решение о формате дальнейшей работы.",
      further_label: "Дальнейшая работа",
      further_body:
        "Далее — разработка проекта и контроль реализации, поэтапно, с привязкой к фактическому ходу работ.",
      final_label: "Итоговая стоимость",
      final_value: "10–20% от общих затрат на реализацию проекта",
      final_body:
        "Точный процент определяется после анализа, зависит от сложности, масштаба и уровня вовлечения, фиксируется до начала реализации.",
      terms_label: "Условия",
      terms_body:
        "Все ключевые параметры согласовываются заранее, изменения возможны только при изменении самой задачи.",
      rights_label: "Права",
      rights_body:
        "Работа ведётся на основании авторского права. Переданные решения не подлежат использованию без согласования. Права на результат передаются отдельно.",
      contact_label: "Контакт",
      contact_body:
        "Когда появляется задача — напишите. Работа начинается с анализа ситуации.",
      contact_telegram: "Написать в Telegram →",
      back_button: "Назад",
    },
    garden: {
      password_placeholder: "••••",
      password_error: "неверный пароль",
      bud_label_lyra: "Lyra — без усилия",
      bud_label_unocalc: "unocalc",
      aria_element: "Элемент",
    },
    gateway: {
      studio_suffix: "studio",
      enter: "войти →",
    },
    notfound: {
      message: "Страница не найдена",
    },
    lyra: {
      hero_caption: "Форма, что держит тело",
      rotated_line: "Чем меньше усилия — тем точнее поддержка.",
      dimensions_alt: "Lyra — технический чертёж с размерами",
      hero_alt: "Кресло Lyra — фигура в залитом светом бетонном интерьере",
      seo_title: "LYRA — .uno studio",
      seo_description:
        "LYRA — система сидения, основанная на натяжении. Гибкая опора, минимум материала, отзывчивая форма.",
    },
    lyra_info: {
      ref: "uno / lyra / 001",
      title: "LYRA",
      model_label: "тип",
      model_value: "кресло",
      status_label: "статус",
      status_value: "прототип",
      sections: {
        overview: "обзор",
        specifications: "характеристики",
        structure: "конструкция",
        material: "материал",
        share: "поделиться · ссылка",
        contact: "контакты",
      },
      overview: [
        "Система сидения на натяжении",
        "Гибкая поддерживающая структура",
        "Минимум материала, отзывчивая форма",
      ],
      spec_keys: { height: "высота", width: "ширина", length: "длина" },
      structure: ["система натяжения", "гибкая опора"],
      material_keys: { textile: "плетение", frame: "каркас", color: "цвет" },
      material_values: {
        textile: "шнур DYNEEMA",
        frame: "фанера и краска",
        color: "по выбору",
      },
      copy_link: "копировать ссылку",
      copy_done: "скопировано",
      copy_failed: "не удалось",
      system_share: "поделиться",
      link_copied: "ссылка скопирована",
      qr_label: "скан · передача",
      process_label: "процесс",
      process_flow: "запрос → детали → производство",
      production_label: "производство",
      production_lines: ["под заказ", "срок 4–6 недель"],
      inquiry_label: "запрос",
      contact_telegram: "telegram",
      contact_email: "email",
      footer_left: "uno · studio",
      footer_right: "kolesnikov",
      close_aria: "закрыть",
    },
  },
  uk: {
    nav: { back: "← назад", info: "інфо", ar: "ar", uno: ".uno" },
    index: {
      structure_label: "немає структури — немає рішення.",
      tagline: "виявляю структуру і збираю форму, в якій усе стає на місце.",
      pricing_link: "Формат і вартість →",
      architect_design_art: "architect  .  design  .  art",
      studio_suffix: "studio",
      author_link: "R.Yury Kolesnikov ⟶",
      aria_open: "Відкрити",
      aria_close: "Закрити",
    },
    about: {
      seo_title: "Про себе — .uno studio",
      name: "R.Yury Kolesnikov",
      studio_label: ".uno studio",
      back_aria: "Назад",
      body_1:
        "Я є і являю собою творчу свідомість. Мої дії спрямовані на підвищення якості життя в усьому його розмаїтті й розкоші — життя як арени, що складається з елементів, які визначають її просторову структуру в часі, спираючись на фундаментальні властивості матерії, використовуючи цифрову віртуальність як інструмент для створення й набуття значущих і необхідних елементів нашої повсякденності.",
      body_2:
        "Таким чином моє сприйняття зосереджено на предметі, продукті або ж елементі життя в голографічному форматі просторової структури безрозмірної одиниці всесвіту.",
      body_3:
        "Знаю це і сподіваюся, що моя співучасть допоможе кожному відчути себе щасливішим і веселішим.",
      body_4:
        "У цьому є прояв любові та турботи про людину, що живе на планеті Земля, як сутності вищої свідомості світу.",
    },
    pricing: {
      seo_title: "Формат і вартість — .uno studio",
      header: "формат і вартість",
      back_aria: "Назад",
      essence_label: "Суть роботи",
      essence_lead_1: "Іноді проблема не в рішенні,",
      essence_lead_2: "а у відсутності структури.",
      essence_body_1: "Я виявляю структуру і переводжу її у форму,",
      essence_body_2: "яка працює.",
      process_label: "Процес",
      process_body:
        "Робота починається з аналізу ситуації. На цьому етапі визначається контекст, напрямок і ухвалюється рішення про подальший формат роботи.",
      entry_label: "Вхід",
      entry_body:
        "Перший етап — аналіз ситуації. Без його проходження робота не продовжується.",
      stage_result_label: "Результат етапу:",
      stage_result_items: [
        "формування концепції",
        "розуміння реальної задачі",
        "оцінка діапазону вартості реалізації",
      ],
      cost_value: "Вартість: 300⟶1000+ $",
      cost_body:
        "залежно від масштабу задачі та глибини опрацювання. Сума входить у підсумкову вартість.",
      cost_after:
        "Після аналізу ухвалюється рішення про формат подальшої роботи.",
      further_label: "Подальша робота",
      further_body:
        "Далі — розробка проєкту і контроль реалізації, поетапно, з прив'язкою до фактичного ходу робіт.",
      final_label: "Підсумкова вартість",
      final_value: "10–20% від загальних витрат на реалізацію проєкту",
      final_body:
        "Точний відсоток визначається після аналізу, залежить від складності, масштабу й рівня залучення, фіксується до початку реалізації.",
      terms_label: "Умови",
      terms_body:
        "Усі ключові параметри узгоджуються заздалегідь, зміни можливі лише при зміні самої задачі.",
      rights_label: "Права",
      rights_body:
        "Робота ведеться на підставі авторського права. Передані рішення не підлягають використанню без узгодження. Права на результат передаються окремо.",
      contact_label: "Контакт",
      contact_body:
        "Коли з'являється задача — напишіть. Робота починається з аналізу ситуації.",
      contact_telegram: "Написати в Telegram →",
      back_button: "Назад",
    },
    garden: {
      password_placeholder: "••••",
      password_error: "невірний пароль",
      bud_label_lyra: "Lyra — без зусилля",
      bud_label_unocalc: "unocalc",
      aria_element: "Елемент",
    },
    gateway: {
      studio_suffix: "studio",
      enter: "увійти →",
    },
    notfound: {
      message: "Сторінку не знайдено",
    },
    lyra: {
      hero_caption: "Форма, що тримає тіло",
      rotated_line: "Що менше зусилля — то точніша підтримка.",
      dimensions_alt: "Lyra — технічне креслення з розмірами",
      hero_alt: "Крісло Lyra — постать у залитому світлом бетонному інтер'єрі",
      seo_title: "LYRA — .uno studio",
      seo_description:
        "LYRA — система сидіння на натягу. Гнучка опора, мінімум матеріалу, чутлива форма.",
    },
    lyra_info: {
      ref: "uno / lyra / 001",
      title: "LYRA",
      model_label: "тип",
      model_value: "крісло",
      status_label: "статус",
      status_value: "прототип",
      sections: {
        overview: "огляд",
        specifications: "характеристики",
        structure: "конструкція",
        material: "матеріал",
        share: "поділитись · посилання",
        contact: "контакти",
      },
      overview: [
        "Система сидіння на натягу",
        "Гнучка підтримуюча структура",
        "Мінімум матеріалу, чутлива форма",
      ],
      spec_keys: { height: "висота", width: "ширина", length: "довжина" },
      structure: ["система натягу", "гнучка опора"],
      material_keys: { textile: "плетіння", frame: "каркас", color: "колір" },
      material_values: {
        textile: "шнур DYNEEMA",
        frame: "фанера і фарба",
        color: "на вибір",
      },
      copy_link: "копіювати посилання",
      copy_done: "скопійовано",
      copy_failed: "не вдалося",
      system_share: "поділитись",
      link_copied: "посилання скопійовано",
      qr_label: "скан · передача",
      process_label: "процес",
      process_flow: "запит → деталі → виробництво",
      production_label: "виробництво",
      production_lines: ["на замовлення", "термін 4–6 тижнів"],
      inquiry_label: "запит",
      contact_telegram: "telegram",
      contact_email: "email",
      footer_left: "uno · studio",
      footer_right: "kolesnikov",
      close_aria: "закрити",
    },
  },
};

export const getDict = (locale: Locale): Dictionary => dictionary[locale];
