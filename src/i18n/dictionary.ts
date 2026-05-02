import type { Locale } from "./config";

// Structural shape — derived from EN but widened to plain `string` so RU/UK
// values are not narrowed to literal types of the EN source.
export type Dictionary = {
  nav: { back: string; info: string; ar: string };
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
    contact_telegram: string;
    contact_email: string;
    footer_left: string;
    footer_right: string;
  };
};

// EN is the source of truth. RU and UA are adapted (not literal translation).
// Add new keys to EN first, then mirror to RU and UK.
export const dictionary: Record<Locale, Dictionary> = {
  en: {
    nav: {
      back: "← back",
      info: "info",
      ar: "ar",
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
      contact_telegram: "telegram",
      contact_email: "email",
      footer_left: "uno · studio",
      footer_right: "kolesnikov",
    },
  },
  ru: {
    nav: {
      back: "← назад",
      info: "инфо",
      ar: "ar",
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
      contact_telegram: "telegram",
      contact_email: "email",
      footer_left: "uno · studio",
      footer_right: "kolesnikov",
    },
  },
  uk: {
    nav: {
      back: "← назад",
      info: "інфо",
      ar: "ar",
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
      contact_telegram: "telegram",
      contact_email: "email",
      footer_left: "uno · studio",
      footer_right: "kolesnikov",
    },
  },
};

export const getDict = (locale: Locale): Dictionary => dictionary[locale];