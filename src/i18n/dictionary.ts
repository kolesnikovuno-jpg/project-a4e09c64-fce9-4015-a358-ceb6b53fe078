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
    bud_label_nava: string;
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
    description: string;
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
  nava: {
    hero_caption: string;
    rotated_line: string;
    dimensions_alt: string;
    hero_alt: string;
    seo_title: string;
    seo_description: string;
    description: string;
  };
  nava_info: {
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
  participation: {
    link: string;
    title: string;
    intro: string;
    stage_label: string;
    stage_value: string;
    goal_label: string;
    goal_value: string;
    limit: string;
    request_button: string;
    form_name: string;
    form_email: string;
    form_message: string;
    form_message_optional: string;
    form_telegram: string;
    form_telegram_placeholder: string;
    form_sentiment_label: string;
    form_sentiment_support: string;
    form_sentiment_participation: string;
    form_sentiment_undecided: string;
    form_sentiment_material: string;
    submit: string;
    submitting: string;
    error: string;
    success_text: string;
    proceed_link: string;
    direct_support_title: string;
    donate_link: string;
    close_aria: string;
    action_requested_title: string;
    action_allowed_title: string;
    action_greeting: string;
  };
  clarity: {
    seo_title: string;
    seo_description: string;
    teaser_link: string;
    header: string;
    back_aria: string;
    lead_1: string;
    lead_2: string;
    body_1: string;
    body_2: string;
    bridge: string;
    for_label: string;
    for_items: readonly string[];
    not_for_label: string;
    not_for_items: readonly string[];
    process_label: string;
    process_steps: readonly { n: string; title: string; body: string }[];
    outcome_label: string;
    outcome_body: string;
    format_label: string;
    format_body: string;
    cta_button: string;
    cta_note: string;
    intake: {
      header: string;
      back_aria: string;
      step_label: string;
      of_label: string;
      next: string;
      back: string;
      submit: string;
      submitting: string;
      optional: string;
      situation_title: string;
      situation_intro: string;
      situation_field_label: string;
      situation_field_placeholder: string;
      uncertain_title: string;
      uncertain_intro: string;
      uncertain_field_label: string;
      uncertain_field_placeholder: string;
      scope_title: string;
      scope_intro: string;
      scope_field_label: string;
      scope_field_placeholder: string;
      scope_refs_label: string;
      scope_refs_placeholder: string;
      attachments_title: string;
      attachments_intro: string;
      attachments_hint: string;
      attachments_add: string;
      attachments_remove: string;
      attachments_expand: string;
      contact_title: string;
      contact_intro: string;
      contact_name_label: string;
      contact_email_label: string;
      validation_required: string;
      validation_email: string;
      confirm_title: string;
      confirm_body: string;
      confirm_signature: string;
      back_to_site: string;
      submit_error: string;
    };
  };
  semantic: SemanticDict;
};

// Shared structural shape for the Semantic Time block (added to every locale).
export type SemanticDict = {
  brand: string;
  tagline: string;
  nav_interface: string;
  nav_about: string;
  hero_title: string;
  hero_lead: string;
  mode_current: string;
  mode_manual: string;
  mode_symbol: string;
  manual_placeholder: string;
  symbol_placeholder: string;
  refresh: string;
  interpret: string;
  interpreting: string;
  err_rate: string;
  err_credits: string;
  err_generic: string;
  generating: string;
  label_structure: string;
  label_core: string;
  label_deep: string;
  label_architectural: string;
  label_reflection: string;
  label_recommendation: string;
  row_value: string;
  row_pattern: string;
  row_dominant: string;
  row_dynamics: string;
  row_direction: string;
  row_tension: string;
  row_interaction: string;
  row_principles: string;
  tension_low: string;
  tension_medium: string;
  tension_high: string;
  patterns: Record<string, string>;
  dynamics: Record<string, string>;
  principles: Record<string, string>;
  principles_short: Record<string, string>;
  about: {
    title: string;
    p1: string;
    p2: string;
    p3: string;
    footnote: string;
  };
};

// EN is the source of truth. RU and UA are adapted (not literal translation).
// Add new keys to EN first, then mirror to RU and UK.
export const dictionary: Record<Locale, Dictionary> = {
  en: {
    nav: { back: "← back", info: "info", ar: "ar", uno: ".uno" },
    index: {
      structure_label: "no structure — no solution.",
      tagline: "studio, experiments, systems, observations.",
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
      bud_label_nava: "Nava",
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
      description:
        "This object is not a fixed form.\nIt exists as a point of transition between idea and material.\n\nWhat you see is a state — not the final.\nIt can remain as it is, or move further into matter.\n\nThe decision defines the form.",
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
    nava: {
      hero_caption: "Form that holds the body",
      rotated_line: "Continuous structure. Single line support.",
      dimensions_alt: "Nava — technical drawing with dimensions",
      hero_alt: "Nava chair — woman reclining in a sunlit garden",
      seo_title: "NAVA — .uno studio",
      seo_description: "NAVA — placeholder description.",
      description:
        "This object is not a fixed form.\nIt exists as a point of transition between idea and material.\n\nWhat you see is a state — not the final.\nIt can remain as it is, or move further into reality.\n\nThe decision defines the form.",
    },
    nava_info: {
      ref: "uno / nava / 001",
      title: "NAVA",
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
        "A lounge chair defined by a continuous frame",
        "and a suspended soft volume.",
        "",
        "The structure distributes weight through a single loop,",
        "creating a stable yet lightweight support.",
      ],
      spec_keys: { height: "height", width: "width", length: "length" },
      structure: [
        "continuous metal frame",
        "suspended seat shell",
        "load distributed through closed loop geometry",
      ],
      material_keys: { textile: "textile", frame: "frame", color: "color" },
      material_values: { textile: "felt", frame: "metal", color: "custom" },
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
    participation: {
      link: "You can record your participation",
      title: "Participation",
      intro:
        "Participation is a form of involvement in the object's transition into matter.\n\nThis is not an investment.\nIt is a contribution to the process of realization.\n\nThe form is completed through decision and participation.\n\nYou record your participation in this process.",
      stage_label: "Current stage",
      stage_value: "Prototype",
      goal_label: "Goal",
      goal_value: "Physical realization of the object",
      limit: "The process is limited.\nCompletion closes participation.",
      request_button: "Request participation",
      form_name: "Name",
      form_email: "Email",
      form_message: "Message",
      form_message_optional: "optional",
      form_telegram: "Telegram",
      form_telegram_placeholder: "@username or link",
      form_sentiment_label: "Format of participation",
      form_sentiment_support: "Support the process",
      form_sentiment_participation: "Participation in realization",
      form_sentiment_undecided: "Leave it open",
      form_sentiment_material: "Material support",
      submit: "Submit",
      submitting: "Sending…",
      error: "Could not send. Please try again.",
      success_text:
        "Your request has been recorded.\n\nYou have entered the process of the object's realization.\n\nFurther development will proceed through the chosen channel of participation.",
      proceed_link: "Continue participation →",
      direct_support_title: "Direct support",
      donate_link: "Donate →",
      close_aria: "close",
      action_requested_title: "Request received",
      action_allowed_title: "Access confirmed",
      action_greeting: "Welcome",
    },
    clarity: {
      seo_title: "Structural Clarity — .uno studio",
      seo_description:
        "Structural Clarity — a written structural reading of a situation when the direction is unclear or a decision is not yet forming.",
      teaser_link: "Structural Clarity →",
      header: "structural clarity",
      back_aria: "Back",
      lead_1: "Sometimes the problem is not the lack of a solution.",
      lead_2: "It is that the situation does not yet have a form.",
      body_1:
        "Structural Clarity — a written reading of a situation when the direction is unclear, a decision is not forming, or the project is not yet defined.",
      body_2: "",
      for_label: "Suitable if",
      for_items: [
        "the direction is unclear",
        "there are too many options",
        "you sense a problem but it is not named",
        "the project needs to be defined before it is built",
      ],
      not_for_label: "Not suitable if",
      not_for_items: [
        "you need only an executor",
        "the decision is already known",
        "only validation of a chosen path is needed",
        "you need coaching or general consulting",
      ],
      process_label: "Process",
      process_steps: [
        { n: "01", title: "Submission", body: "You describe the situation in writing." },
        { n: "02", title: "Review", body: "If the format fits, terms and a payment link are sent." },
        { n: "03", title: "Analysis", body: "A structural reading of the situation. Usually 3–5 business days." },
        { n: "04", title: "Delivery", body: "You receive a written reading and the next working step." },
      ],
      outcome_label: "What you receive",
      outcome_body:
        "— a precise written structural reading of the situation\n— the key tension made visible\n— the real task named\n— the next meaningful step",
      format_label: "Format",
      format_body:
        "Asynchronous\nWritten\nNo calls\n\nPrice: €95\nTimeline: 3–5 business days\n\nEach request is reviewed individually.",
      cta_button: "Go to the request →",
      cta_note: "Five minutes. No call required.",
      bridge: "",
      intake: {
        header: "request",
        back_aria: "Back",
        step_label: "step",
        of_label: "of",
        next: "next →",
        back: "← back",
        submit: "submit →",
        submitting: "sending…",
        optional: "optional",
        situation_title: "What is happening?",
        situation_intro: "Briefly describe the situation you are facing.",
        situation_field_label: "Situation",
        situation_field_placeholder: "What is happening right now? What brought you to this request?",
        uncertain_title: "What is the main difficulty?",
        uncertain_intro: "What is keeping you from moving forward, deciding, or seeing the next step?",
        uncertain_field_label: "The difficulty",
        uncertain_field_placeholder: "What remains unresolved, overloads you, or blocks movement?",
        scope_title: "What frames matter here?",
        scope_intro: "Scale, timing, constraints, steps already taken, or important conditions.",
        scope_field_label: "Conditions & constraints",
        scope_field_placeholder: "For example: timing, budget, resources, constraints, or what has already been tried.",
        scope_refs_label: "Links",
        scope_refs_placeholder: "Links or URLs, one per line.",
        attachments_title: "Supporting materials",
        attachments_intro: "If needed, add additional materials.",
        attachments_hint: "JPG, PNG, WEBP or PDF · up to 10 MB each",
        attachments_add: "Add files",
        attachments_remove: "Remove",
        attachments_expand: "+ Add supporting materials",
        contact_title: "Contact",
        contact_intro: "So the response can be addressed correctly.",
        contact_name_label: "Name",
        contact_email_label: "Email",
        validation_required: "Please describe this to continue.",
        validation_email: "This email doesn't look complete.",
        confirm_title: "Received",
        confirm_body:
          "Your intake has been recorded. It will be read personally. If the work is suitable, a written response with terms will follow.",
        confirm_signature: "— .uno studio",
        back_to_site: "Back to the site",
        submit_error: "Submission failed. Please check your connection and try again.",
      },
    },
  },
  ru: {
    nav: { back: "← назад", info: "инфо", ar: "ar", uno: ".uno" },
    index: {
      structure_label: "нет структуры — нет решения.",
      tagline: "studio, experiments, systems, observations.",
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
      bud_label_nava: "Nava",
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
      description:
        "Этот объект не является фиксированной формой.\nОн существует как точка перехода между идеей и материалом.\n\nТо, что вы видите — состояние, а не финал.\nОн может остаться таким, как есть, или перейти в материю.\n\nРешение определяет форму.",
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
      technical_label: "техническое",
      technical_description: "чертёж и размеры",
      technical_link: "открыть технический лист",
      contact_telegram: "telegram",
      contact_email: "email",
      footer_left: "uno · studio",
      footer_right: "kolesnikov",
      close_aria: "закрыть",
    },
    nava: {
      hero_caption: "Форма, что держит тело",
      rotated_line: "Непрерывная структура. Опора одной линией.",
      dimensions_alt: "Nava — технический чертёж с размерами",
      hero_alt: "Кресло Nava — фигура в залитом светом саду",
      seo_title: "NAVA — .uno studio",
      seo_description: "NAVA — описание появится позже.",
      description:
        "Этот объект не является фиксированной формой.\nОн существует как точка перехода между идеей и материалом.\n\nТо, что вы видите — состояние, а не финал.\nОн может остаться таким, как есть, или перейти в материю.\n\nРешение определяет форму.",
    },
    nava_info: {
      ref: "uno / nava / 001",
      title: "NAVA",
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
        "Кресло-лаунж, образованное непрерывным каркасом",
        "и подвешенным мягким объёмом.",
        "",
        "Структура распределяет вес через единую петлю,",
        "создавая устойчивую и лёгкую опору.",
      ],
      spec_keys: { height: "высота", width: "ширина", length: "длина" },
      structure: [
        "непрерывный металлический каркас",
        "подвешенная оболочка сиденья",
        "нагрузка распределена по замкнутой петле",
      ],
      material_keys: { textile: "плетение", frame: "каркас", color: "цвет" },
      material_values: { textile: "войлок", frame: "металл", color: "на выбор" },
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
      technical_label: "техническое",
      technical_description: "чертёж и размеры",
      technical_link: "открыть технический лист",
      contact_telegram: "telegram",
      contact_email: "email",
      footer_left: "uno · studio",
      footer_right: "kolesnikov",
      close_aria: "закрыть",
    },
    participation: {
      link: "Вы можете зафиксировать своё участие",
      title: "Участие",
      intro:
        "Участие — это форма вовлечения в переход объекта в материю.\n\nЭто не инвестиция.\nЭто вклад в процесс реализации.\n\nФорма завершается через решение и участие.\n\nВы фиксируете своё участие в этом процессе.",
      stage_label: "Текущая стадия",
      stage_value: "Прототип",
      goal_label: "Цель",
      goal_value: "Физическая реализация объекта",
      limit: "Процесс ограничен.\nЗавершение закрывает участие.",
      request_button: "Запросить участие",
      form_name: "Имя",
      form_email: "Email",
      form_message: "Сообщение",
      form_message_optional: "необязательно",
      form_telegram: "Telegram",
      form_telegram_placeholder: "@username или ссылка",
      form_sentiment_label: "Формат участия",
      form_sentiment_support: "Поддержка процесса",
      form_sentiment_participation: "Участие в реализации",
      form_sentiment_undecided: "Оставить открытым",
      form_sentiment_material: "Материальная поддержка",
      submit: "Отправить",
      submitting: "Отправка…",
      error: "Не удалось отправить. Попробуйте ещё раз.",
      success_text:
        "Запрос зафиксирован.\n\nВы вошли в процесс реализации объекта.\n\nДальнейшее развитие будет происходить через выбранный канал участия.",
      proceed_link: "Продолжить участие →",
      direct_support_title: "Прямая поддержка",
      donate_link: "Донат →",
      close_aria: "закрыть",
      action_requested_title: "Запрос получен",
      action_allowed_title: "Доступ подтверждён",
      action_greeting: "Добро пожаловать",
    },
    clarity: {
      seo_title: "Структурная ясность — .uno studio",
      seo_description:
        "Структурная ясность — точечный структурный анализ ситуации. Работа начинается там, где не хватает структуры.",
      teaser_link: "Структурная ясность →",
      header: "структурная ясность",
      back_aria: "Назад",
      lead_1: "Иногда проблема не в отсутствии решения.",
      lead_2: "А в том, что ситуация ещё не имеет формы.",
      body_1:
        "Структурная ясность — письменный разбор ситуации, когда направление неясно, решение не складывается или проект ещё не определён.",
      body_2: "",
      for_label: "Подходит, если",
      for_items: [
        "направление неясно",
        "вариантов слишком много",
        "ощущение проблемы есть, но она не названа",
        "проект нужно определить до реализации",
      ],
      not_for_label: "Не подходит, если",
      not_for_items: [
        "нужен только исполнитель",
        "решение уже известно",
        "нужна только валидация выбранного пути",
        "нужен коучинг или общий консалтинг",
      ],
      process_label: "Процесс",
      process_steps: [
        { n: "01", title: "Заявка", body: "Вы описываете ситуацию письменно." },
        { n: "02", title: "Рассмотрение", body: "Если формат подходит, приходят условия и ссылка на оплату." },
        { n: "03", title: "Анализ", body: "Структурное чтение ситуации. Обычно 3–5 рабочих дней." },
        { n: "04", title: "Передача", body: "Вы получаете письменный разбор и следующий рабочий шаг." },
      ],
      outcome_label: "Что вы получаете",
      outcome_body:
        "— точное письменное структурное чтение ситуации\n— выявленное ключевое напряжение\n— названную реальную задачу\n— следующий осмысленный шаг",
      format_label: "Формат",
      format_body:
        "Асинхронно\nПисьменно\nБез звонков\n\nСтоимость: €95\nСрок: 3–5 рабочих дней\n\nКаждая заявка рассматривается индивидуально.",
      cta_button: "Перейти к заявке →",
      cta_note: "Пять минут. Звонок не требуется.",
      bridge: "",
      intake: {
        header: "заявка",
        back_aria: "Назад",
        step_label: "шаг",
        of_label: "из",
        next: "далее →",
        back: "← назад",
        submit: "отправить →",
        submitting: "отправка…",
        optional: "необязательно",
        situation_title: "Что происходит?",
        situation_intro: "Кратко опишите ситуацию, с которой вы столкнулись.",
        situation_field_label: "Ситуация",
        situation_field_placeholder: "Что происходит сейчас? Что привело вас к этому запросу?",
        uncertain_title: "В чём основное затруднение?",
        uncertain_intro: "Что мешает двигаться дальше, принять решение или увидеть следующий шаг?",
        uncertain_field_label: "Затруднение",
        uncertain_field_placeholder: "Что остаётся нерешённым, вызывает перегрузку или блокирует движение?",
        scope_title: "Какие рамки важно учитывать?",
        scope_intro: "Масштаб, сроки, ограничения, уже предпринятые шаги или важные условия.",
        scope_field_label: "Условия и ограничения",
        scope_field_placeholder: "Например: сроки, бюджет, ресурсы, ограничения или что уже предпринималось.",
        scope_refs_label: "Ссылки",
        scope_refs_placeholder: "Ссылки или URL, по одной в строке.",
        attachments_title: "Дополнительные материалы",
        attachments_intro: "Если нужно, добавьте дополнительные материалы.",
        attachments_hint: "JPG, PNG, WEBP или PDF · до 10 МБ каждый",
        attachments_add: "Добавить файлы",
        attachments_remove: "Удалить",
        attachments_expand: "+ Добавить материалы",
        contact_title: "Контакт",
        contact_intro: "Чтобы ответ был адресован корректно.",
        contact_name_label: "Имя",
        contact_email_label: "Email",
        validation_required: "Опишите это, чтобы продолжить.",
        validation_email: "Этот email выглядит неполным.",
        confirm_title: "Получено",
        confirm_body:
          "Заявка зафиксирована. Она будет прочитана лично. Если работа уместна — придёт письменный ответ с условиями.",
        confirm_signature: "— .uno studio",
        back_to_site: "Вернуться на сайт",
        submit_error: "Не удалось отправить. Проверьте соединение и попробуйте снова.",
      },
    },
  },
  uk: {
    nav: { back: "← назад", info: "інфо", ar: "ar", uno: ".uno" },
    index: {
      structure_label: "немає структури — немає рішення.",
      tagline: "studio, experiments, systems, observations.",
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
      bud_label_nava: "Nava",
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
      description:
        "Цей об'єкт не є фіксованою формою.\nВін існує як точка переходу між ідеєю та матерією.\n\nТе, що ви бачите — стан, а не фінал.\nВін може залишитися таким, як є, або перейти в матерію.\n\nРішення визначає форму.",
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
      technical_label: "технічне",
      technical_description: "креслення та розміри",
      technical_link: "відкрити технічний аркуш",
      contact_telegram: "telegram",
      contact_email: "email",
      footer_left: "uno · studio",
      footer_right: "kolesnikov",
      close_aria: "закрити",
    },
    nava: {
      hero_caption: "Форма, що тримає тіло",
      rotated_line: "Безперервна структура. Опора однією лінією.",
      dimensions_alt: "Nava — технічне креслення з розмірами",
      hero_alt: "Крісло Nava — постать у залитому світлом саду",
      seo_title: "NAVA — .uno studio",
      seo_description: "NAVA — опис з'явиться пізніше.",
      description:
        "Цей об'єкт не є фіксованою формою.\nВін існує як точка переходу між ідеєю та матерією.\n\nТе, що ви бачите — це стан, а не фінал.\nВін може залишитися таким, як є, або перейти в матеріальність.\n\nРішення визначає форму.",
    },
    nava_info: {
      ref: "uno / nava / 001",
      title: "NAVA",
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
        "Крісло-лаунж, утворене безперервним каркасом",
        "та підвішеним м'яким об'ємом.",
        "",
        "Структура розподіляє вагу через єдину петлю,",
        "створюючи стійку та легку опору.",
      ],
      spec_keys: { height: "висота", width: "ширина", length: "довжина" },
      structure: [
        "безперервний металевий каркас",
        "підвішена оболонка сидіння",
        "навантаження розподілене по замкненій петлі",
      ],
      material_keys: { textile: "плетіння", frame: "каркас", color: "колір" },
      material_values: { textile: "повсть", frame: "метал", color: "на вибір" },
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
      technical_label: "технічне",
      technical_description: "креслення та розміри",
      technical_link: "відкрити технічний аркуш",
      contact_telegram: "telegram",
      contact_email: "email",
      footer_left: "uno · studio",
      footer_right: "kolesnikov",
      close_aria: "закрити",
    },
    participation: {
      link: "Ви можете зафіксувати свою участь",
      title: "Участь",
      intro:
        "Участь — це форма залучення до переходу об'єкта в матерію.\n\nЦе не інвестиція.\nЦе внесок у процес реалізації.\n\nФорма завершується через рішення та участь.\n\nВи фіксуєте свою участь у цьому процесі.",
      stage_label: "Поточна стадія",
      stage_value: "Прототип",
      goal_label: "Мета",
      goal_value: "Фізична реалізація об'єкта",
      limit: "Процес обмежений.\nЗавершення закриває участь.",
      request_button: "Запросити участь",
      form_name: "Ім'я",
      form_email: "Email",
      form_message: "Повідомлення",
      form_message_optional: "необов'язково",
      form_telegram: "Telegram",
      form_telegram_placeholder: "@username або посилання",
      form_sentiment_label: "Формат участі",
      form_sentiment_support: "Підтримка процесу",
      form_sentiment_participation: "Участь у реалізації",
      form_sentiment_undecided: "Залишити відкритим",
      form_sentiment_material: "Матеріальна підтримка",
      submit: "Надіслати",
      submitting: "Надсилання…",
      error: "Не вдалося надіслати. Спробуйте ще раз.",
      success_text:
        "Запит зафіксовано.\n\nВи увійшли в процес реалізації об'єкта.\n\nПодальший розвиток відбуватиметься через обраний канал участі.",
      proceed_link: "Продовжити участь →",
      direct_support_title: "Пряма підтримка",
      donate_link: "Донат →",
      close_aria: "закрити",
      action_requested_title: "Запит отримано",
      action_allowed_title: "Доступ підтверджено",
      action_greeting: "Ласкаво просимо",
    },
    clarity: {
      seo_title: "Структурна ясність — .uno studio",
      seo_description:
        "Структурна ясність — точковий структурний аналіз ситуації. Робота починається там, де бракує структури.",
      teaser_link: "Структурна ясність →",
      header: "структурна ясність",
      back_aria: "Назад",
      lead_1: "Іноді проблема не у відсутності рішення.",
      lead_2: "А в тому, що ситуація ще не має форми.",
      body_1:
        "Структурна ясність — письмовий розбір ситуації, коли напрямок неясний, рішення не складається або проєкт ще не визначений.",
      body_2: "",
      for_label: "Підходить, якщо",
      for_items: [
        "напрямок неясний",
        "варіантів забагато",
        "відчуття проблеми є, але вона не названа",
        "проєкт треба визначити до реалізації",
      ],
      not_for_label: "Не підходить, якщо",
      not_for_items: [
        "потрібен лише виконавець",
        "рішення вже відоме",
        "потрібна лише валідація обраного шляху",
        "потрібен коучинг або загальний консалтинг",
      ],
      process_label: "Процес",
      process_steps: [
        { n: "01", title: "Заявка", body: "Ви описуєте ситуацію письмово." },
        { n: "02", title: "Розгляд", body: "Якщо формат підходить, надходять умови і посилання на оплату." },
        { n: "03", title: "Аналіз", body: "Структурне читання ситуації. Зазвичай 3–5 робочих днів." },
        { n: "04", title: "Передача", body: "Ви отримуєте письмовий розбір і наступний робочий крок." },
      ],
      outcome_label: "Що ви отримуєте",
      outcome_body:
        "— точне письмове структурне читання ситуації\n— виявлене ключове напруження\n— названу реальну задачу\n— наступний осмислений крок",
      format_label: "Формат",
      format_body:
        "Асинхронно\nПисьмово\nБез дзвінків\n\nВартість: €95\nТермін: 3–5 робочих днів\n\nКожна заявка розглядається індивідуально.",
      cta_button: "Перейти до заявки →",
      cta_note: "П'ять хвилин. Дзвінок не потрібен.",
      bridge: "",
      intake: {
        header: "заявка",
        back_aria: "Назад",
        step_label: "крок",
        of_label: "з",
        next: "далі →",
        back: "← назад",
        submit: "надіслати →",
        submitting: "надсилання…",
        optional: "необов'язково",
        situation_title: "Що відбувається?",
        situation_intro: "Коротко опишіть ситуацію, з якою ви зіткнулися.",
        situation_field_label: "Ситуація",
        situation_field_placeholder: "Що відбувається зараз? Що привело вас до цього запиту?",
        uncertain_title: "У чому основне утруднення?",
        uncertain_intro: "Що заважає рухатися далі, ухвалити рішення чи побачити наступний крок?",
        uncertain_field_label: "Утруднення",
        uncertain_field_placeholder: "Що залишається невирішеним, перевантажує або блокує рух?",
        scope_title: "Які рамки важливо врахувати?",
        scope_intro: "Масштаб, терміни, обмеження, вже зроблені кроки або важливі умови.",
        scope_field_label: "Умови та обмеження",
        scope_field_placeholder: "Наприклад: терміни, бюджет, ресурси, обмеження або що вже робилося.",
        scope_refs_label: "Посилання",
        scope_refs_placeholder: "Посилання або URL, по одному в рядку.",
        attachments_title: "Додаткові матеріали",
        attachments_intro: "Якщо потрібно, додайте додаткові матеріали.",
        attachments_hint: "JPG, PNG, WEBP або PDF · до 10 МБ кожен",
        attachments_add: "Додати файли",
        attachments_remove: "Видалити",
        attachments_expand: "+ Додати матеріали",
        contact_title: "Контакт",
        contact_intro: "Щоб відповідь було адресовано коректно.",
        contact_name_label: "Ім'я",
        contact_email_label: "Email",
        validation_required: "Опишіть це, щоб продовжити.",
        validation_email: "Цей email виглядає неповним.",
        confirm_title: "Отримано",
        confirm_body:
          "Заявку зафіксовано. Її буде прочитано особисто. Якщо робота доречна — надійде письмова відповідь з умовами.",
        confirm_signature: "— .uno studio",
        back_to_site: "Повернутися на сайт",
        submit_error: "Не вдалося надіслати. Перевірте з'єднання та спробуйте ще раз.",
      },
    },
  },
};

export const getDict = (locale: Locale): Dictionary => dictionary[locale];
