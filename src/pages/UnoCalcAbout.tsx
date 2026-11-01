import { Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";

const aboutCopy = {
  ru: {
    eyebrow: "UNOcalc / принцип",
    navApp: "к расчёту",
    navHome: ".uno",
    title: "Простая мера сложного созидания.",
    lead: "UNOcalc помогает оценить исходную ресурсную ёмкость объекта — прежде чем выбирать технологию, исполнителя или сравнивать цены. Это система координат для осмысленных решений, а не попытка угадать цену продажи.",
    statement: "Не ограничить возможности, а увидеть достаточные условия результата.",
    stepsTitle: "Три основы модели",
    steps: [
      { n: "01", name: "Контейнер", text: "Длина, ширина и высота задают габаритный пространственный масштаб объекта." },
      { n: "02", name: "Плотность качества", text: "Выбранный уровень исполнения задаёт условную ресурсоёмкость воплощения формы." },
      { n: "03", name: "Баланс", text: "Ресурс рассматривается как согласованное участие четырёх необходимых сторон." },
    ],
    whyTitle: "Что мы пытаемся измерить",
    why: [
      "Любой объект требует материалов, труда, знаний, времени, инструментов и организации. Технологии могут уменьшать затраты на единицу результата, но не отменяют условий его полноценного создания.",
      "Ресурсная ёмкость — авторская оценочная мера совокупного обеспечения объекта заданного масштаба и качества. Это не вес материала, не физическая энергия и не подтверждённая себестоимость.",
      "UNOcalc делает видимым то, что опытный мастер часто оценивает практически: соответствуют ли условия задачи предполагаемому результату.",
    ],
    geometryTitle: "Почему простая геометрия",
    geometry: [
      "Вместо моделирования каждой детали используется прямоугольная габаритная оболочка. Её достаточно для первоначальной точки отсчёта, будь то дом, кресло или светильник.",
      "Скатная крыша, например, увеличивает внешнюю высоту контейнера, хотя реальный объём под ней иной. Но и её создание требует узлов, материалов и сложных операций. UNOcalc не измеряет эти сложности отдельно — проверка того, насколько оболочка их отражает, остаётся задачей калибровки.",
    ],
    qualityTitle: "Польза. Прочность. Красота.",
    qualityLead: "Качество — не цена отделки и не сложность формы. В архитектурной традиции оно связано с пользой, надёжностью и целостностью. Дорогие материалы не компенсируют ошибочное решение, а простой объект может быть сделан полноценно.",
    levels: [
      { name: "Базовая форма", text: "Необходимая польза, надёжность и добротное исполнение без избыточных решений." },
      { name: "Функциональная архитектура", text: "Более глубокая согласованность функций, конструкции, материалов и деталировки." },
      { name: "Поле силы", text: "Индивидуально настроенная целостность формы, среды и исполнения с повышенными требованиями к соответствию." },
    ],
    balanceTitle: "Четыре стороны одного результата",
    balanceLead: "Ритейл, проектирование, реализация и комплектующие равнозначны по необходимости — но не по размеру денежной доли. Ни одна сторона не может заменить собой остальные.",
    shares: [
      { value: "20%", name: "Ритейл", text: "Выход к потребителю, организация обращения и предоставления результата." },
      { value: "20%", name: "Проектирование", text: "Замысел, расчёт, согласование решений и контроль соответствия." },
      { value: "20%", name: "Реализация", text: "Мастерство, изготовление, сборка, монтаж и качество исполнения." },
      { value: "40%", name: "Комплектующие", text: "Материалы, элементы, оборудование и снабжение." },
    ],
    balanceNote: "20 / 20 / 20 / 40 — исходная авторская пропорция, а не обязательная структура фактических затрат любого производства. В приложении доли можно немного перераспределять, сохраняя 100%.",
    treeTitle: "Принцип дерева",
    tree: [
      "Ветер отклоняет ветви, но дерево сохраняет несущую структуру. Так и мастер может менять технологию, конструкцию, последовательность и способ организации работ, не отказываясь от требований к результату.",
      "Гибкость — в решениях и распределении нагрузки. Твёрдость — в пользе, прочности, качестве и необходимой достаточности. Выход за исходный ориентир допустим, если понятны его причины и последствия.",
    ],
    readTitle: "Как читать результат",
    read: [
      { title: "U.E.R. — условный индекс", text: "Показывает результат авторской формулы для габаритного объёма и выбранного уровня качества. Это не физическая единица энергии." },
      { title: "Денежный ориентир — гипотеза", text: "Отображение 1 U.E.R. ≈ $1 — рабочее допущение, не подтверждённая стоимость строительства или изготовления. Региональные сравнения опираются на отдельные ограниченные рынки." },
      { title: "Отклонение — повод задать вопрос", text: "Дешевле ориентира? За счёт чего получена экономия и сохранено ли качество? Дороже? Какие свойства, риски или условия оправдывают дополнительные ресурсы?" },
      { title: "Это не смета", text: "Для решения о финансировании и производстве нужны проектные данные, спецификации, предложения исполнителей и проверка рисков. Коэффициенты UNOcalc пока не прошли независимую универсальную валидацию." },
    ],
    finish: "Мера нужна не для запрета, а для свободы разумно выбирать.",
    cta: "Перейти к расчёту",
    foot: "UNOcalc — авторская модель предварительной ресурсной достаточности. Геометрия / качество / баланс.",
  },
  en: {
    eyebrow: "UNOcalc / principle",
    navApp: "calculator",
    navHome: ".uno",
    title: "A simple measure of complex creation.",
    lead: "UNOcalc gives an initial reference for an object's resource capacity — before choosing a technology, contractor or price. It is a frame for informed decisions, not a prediction of the selling price.",
    statement: "Not to limit possibility, but to understand the conditions of a complete result.",
    stepsTitle: "Three foundations",
    steps: [
      { n: "01", name: "Container", text: "Length, width and height define an object's overall spatial scale." },
      { n: "02", name: "Quality density", text: "The selected execution level defines an assumed resource intensity for bringing the form into being." },
      { n: "03", name: "Balance", text: "Resources are considered through four interdependent contributions." },
    ],
    whyTitle: "What we are trying to measure",
    why: [
      "Every object requires materials, work, knowledge, time, tools and coordination. Technology can reduce resources per finished unit, but it cannot remove the conditions required for a sound outcome.",
      "Resource capacity is an author-defined estimate of the overall support needed for a given scale and intended quality. It is not material weight, physical energy, or verified production cost.",
      "UNOcalc makes visible what an experienced craftsperson often senses in practice: whether the conditions match the desired outcome.",
    ],
    geometryTitle: "Why simple geometry",
    geometry: [
      "Instead of modelling every detail, UNOcalc uses a rectangular bounding container. It establishes a starting scale for a house, chair or lamp alike.",
      "A pitched roof, for instance, raises the bounding height even though its actual enclosed volume differs. The roof also entails joints, materials and demanding operations. UNOcalc does not measure these separately; whether the bounding container captures them well enough remains a question for validation.",
    ],
    qualityTitle: "Utility. Strength. Beauty.",
    qualityLead: "Quality is not the price of finishes or the complexity of a shape. Architectural tradition connects it with usefulness, durability and coherence. Expensive materials cannot redeem a flawed design, while a simple object can be made exceptionally well.",
    levels: [
      { name: "Basic form", text: "Essential utility, reliability and sound execution without unnecessary complications." },
      { name: "Functional architecture", text: "Deeper integration of function, construction, materials and detailing." },
      { name: "Field of strength", text: "Individually tuned coherence of form, environment and execution, with more demanding requirements." },
    ],
    balanceTitle: "Four contributions to one result",
    balanceLead: "Retail, design, execution and components are equally necessary, though their monetary shares are different. None can replace the others.",
    shares: [
      { value: "20%", name: "Retail", text: "Connecting the result with the people who use it, distribution and market access." },
      { value: "20%", name: "Project / design", text: "Concept, planning, coordination of decisions and design intent." },
      { value: "20%", name: "Execution", text: "Craft, production, assembly, installation and workmanship." },
      { value: "40%", name: "Components", text: "Materials, parts, equipment and supply." },
    ],
    balanceNote: "20 / 20 / 20 / 40 is an initial author-defined proportion, not a universal breakdown of actual costs. The app allows limited redistribution while keeping the sum at 100%.",
    treeTitle: "The tree principle",
    tree: [
      "Wind moves the branches while the tree retains its supporting structure. A craftsperson may likewise change the method, construction, sequence or organisation without abandoning the required outcome.",
      "Flexibility belongs to decisions and redistribution of work. Firmness belongs to utility, strength, quality and sufficiency. Exceeding the initial reference is reasonable when its causes and consequences are understood.",
    ],
    readTitle: "How to interpret the output",
    read: [
      { title: "U.E.R. is a model index", text: "The result of the author-defined equation for bounding volume and selected execution level. It is not a physical unit of energy." },
      { title: "Currency is a working hypothesis", text: "The display assumption 1 U.E.R. ≈ $1 is not validated build or production cost. Regional comparisons draw from different, limited market datasets." },
      { title: "A difference invites questions", text: "Below the reference: what made the savings possible, and was quality preserved? Above it: which properties, risks or circumstances justify more resources?" },
      { title: "This is not an estimate", text: "Funding and production decisions require plans, specifications, actual quotes and risk evaluation. UNOcalc coefficients have not received independent universal validation." },
    ],
    finish: "A reference is not a prohibition — it makes informed choice possible.",
    cta: "Open calculator",
    foot: "UNOcalc — an author-defined model of preliminary resource sufficiency. Geometry / quality / balance.",
  },
  uk: {
    eyebrow: "UNOcalc / принцип",
    navApp: "до розрахунку",
    navHome: ".uno",
    title: "Проста міра складного творення.",
    lead: "UNOcalc допомагає оцінити початкову ресурсну місткість об’єкта — перш ніж обирати технологію, виконавця чи порівнювати ціни. Це система координат для свідомих рішень, а не спроба вгадати ціну продажу.",
    statement: "Не обмежувати можливості, а побачити достатні умови результату.",
    stepsTitle: "Три основи моделі",
    steps: [
      { n: "01", name: "Контейнер", text: "Довжина, ширина й висота задають габаритний просторовий масштаб об’єкта." },
      { n: "02", name: "Щільність якості", text: "Обраний рівень виконання визначає умовну ресурсоємність втілення форми." },
      { n: "03", name: "Баланс", text: "Ресурс розглядається як узгоджена участь чотирьох необхідних сторін." },
    ],
    whyTitle: "Що ми прагнемо виміряти",
    why: [
      "Будь-який об’єкт потребує матеріалів, праці, знань, часу, інструментів та організації. Технології можуть зменшувати витрати на одиницю результату, але не скасовують умов його повноцінного створення.",
      "Ресурсна місткість — авторська оцінна міра сукупного забезпечення об’єкта заданого масштабу і якості. Це не вага матеріалу, не фізична енергія і не підтверджена собівартість.",
      "UNOcalc робить видимим те, що досвідчений майстер часто оцінює на практиці: чи відповідають умови задачі очікуваному результату.",
    ],
    geometryTitle: "Чому проста геометрія",
    geometry: [
      "Замість моделювання кожної деталі використовується прямокутна габаритна оболонка. Вона задає початковий масштаб для будинку, крісла чи світильника.",
      "Скатний дах, наприклад, збільшує зовнішню висоту контейнера, хоча його фактичний об’єм інший. Але його створення також потребує вузлів, матеріалів і складних операцій. UNOcalc не вимірює цю складність окремо — те, наскільки оболонка її відображає, потребує перевірки.",
    ],
    qualityTitle: "Користь. Міцність. Краса.",
    qualityLead: "Якість — не ціна оздоблення і не складність форми. Архітектурна традиція пов’язує її з користю, надійністю та цілісністю. Дорогі матеріали не виправляють помилкове рішення, а простий об’єкт може бути створений повноцінно.",
    levels: [
      { name: "Базова форма", text: "Необхідна користь, надійність і добротне виконання без зайвих ускладнень." },
      { name: "Функціональна архітектура", text: "Глибша узгодженість функції, конструкції, матеріалів і деталей." },
      { name: "Поле сили", text: "Індивідуально налаштована цілісність форми, середовища та виконання з підвищеними вимогами до відповідності." },
    ],
    balanceTitle: "Чотири сторони одного результату",
    balanceLead: "Ритейл, проєктування, реалізація та комплектуючі рівнозначні за необхідністю, хоча їхні грошові частки різні. Жодна сторона не замінює решту.",
    shares: [
      { value: "20%", name: "Ритейл", text: "Вихід до споживача, організація обігу та надання результату." },
      { value: "20%", name: "Проєктування", text: "Задум, розрахунок, узгодження рішень і відповідність проєкту." },
      { value: "20%", name: "Реалізація", text: "Майстерність, виготовлення, складання, монтаж і якість виконання." },
      { value: "40%", name: "Комплектуючі", text: "Матеріали, елементи, обладнання та постачання." },
    ],
    balanceNote: "20 / 20 / 20 / 40 — початкова авторська пропорція, а не обов’язкова структура фактичних витрат будь-якого виробництва. У застосунку частки можна трохи перерозподіляти, зберігаючи 100%.",
    treeTitle: "Принцип дерева",
    tree: [
      "Вітер відхиляє гілки, але дерево зберігає несучу структуру. Так само майстер може змінити технологію, конструкцію, послідовність і спосіб організації, не відмовляючись від вимог до результату.",
      "Гнучкість — у рішеннях і розподілі навантаження. Твердість — у користі, міцності, якості та достатності. Вихід за початковий орієнтир допустимий, коли зрозумілі його причини й наслідки.",
    ],
    readTitle: "Як читати результат",
    read: [
      { title: "U.E.R. — умовний індекс", text: "Результат авторської формули для габаритного об’єму та обраного рівня якості. Це не фізична одиниця енергії." },
      { title: "Грошовий орієнтир — гіпотеза", text: "Відображення 1 U.E.R. ≈ $1 — робоче припущення, а не підтверджена вартість будівництва чи виготовлення. Регіональні порівняння спираються на окремі обмежені ринки." },
      { title: "Відхилення — привід запитати", text: "Дешевше орієнтира? Завдяки чому досягнуто економії й чи збережено якість? Дорожче? Які властивості, ризики або умови виправдовують додаткові ресурси?" },
      { title: "Це не кошторис", text: "Для рішень про фінансування та виробництво потрібні проєктні дані, специфікації, пропозиції виконавців і перевірка ризиків. Коефіцієнти UNOcalc ще не пройшли незалежну універсальну перевірку." },
    ],
    finish: "Міра потрібна не для заборони, а для свободи розумного вибору.",
    cta: "Перейти до розрахунку",
    foot: "UNOcalc — авторська модель попередньої ресурсної достатності. Геометрія / якість / баланс.",
  },
} as const;

export default function UnoCalcAbout() {
  const { locale, localePath } = useLocale();
  const t = aboutCopy[locale];
  const { search } = useLocation();
  const calculatorPath = localePath("/unocalc") + search;
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
      <main className="mx-auto w-full max-w-[900px]">
        <header className="flex items-center justify-between gap-4 border-b border-foreground/25 pb-4">
          <Link to={calculatorPath} className="text-[25px] font-light tracking-[-0.045em] hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
            UNO<span className="font-normal">calc</span>
          </Link>
          <nav className="flex items-center gap-5 text-[12px] tracking-[0.08em]">
            <Link to={calculatorPath} className="border-b border-foreground/35 py-1 hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{t.navApp}</Link>
            <Link to={localePath("/")} className="hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{t.navHome}</Link>
          </nav>
        </header>
        <section className="border-b border-border/70 pb-10 pt-12 sm:pb-14 sm:pt-16">
          <p className="text-[11px] uppercase tracking-[0.18em] text-foreground/70">{t.eyebrow}</p>
          <h1 className="mt-5 max-w-[730px] text-[clamp(2.3rem,6vw,4.2rem)] font-light leading-[1.13] tracking-[-0.05em]">{t.title}</h1>
          <p className="mt-7 max-w-[680px] text-[15px] font-light leading-[1.85] text-foreground/85">{t.lead}</p>
          <p className="mt-8 max-w-[680px] border-l border-foreground/45 pl-5 text-[16px] font-normal leading-[1.6]">{t.statement}</p>
        </section>
        <section className="border-b border-border/70 py-10 sm:py-12" aria-labelledby="unocalc-about-steps">
          <h2 id="unocalc-about-steps" className="text-[11px] uppercase tracking-[0.16em] text-foreground/70">{t.stepsTitle}</h2>
          <div className="mt-7 grid gap-7 sm:grid-cols-3 sm:gap-6">
            {t.steps.map((step) => (
              <div key={step.n} className="border-t border-foreground/30 pt-3">
                <span className="text-[11px] tabular-nums text-foreground/55">{step.n}</span>
                <h3 className="mt-5 text-[18px] font-light">{step.name}</h3>
                <p className="mt-2 text-[13px] leading-[1.75] text-foreground/80">{step.text}</p>
              </div>
            ))}
          </div>
        </section>
        <ArticleSection id="why" title={t.whyTitle} paragraphs={t.why} />
        <ArticleSection id="geometry" title={t.geometryTitle} paragraphs={t.geometry} />
        <section className="border-b border-border/70 py-10 sm:py-12" aria-labelledby="about-quality">
          <h2 id="about-quality" className="text-[23px] font-light tracking-[-0.025em]">{t.qualityTitle}</h2>
          <p className="mt-4 max-w-[720px] text-[14px] leading-[1.9] text-foreground/80">{t.qualityLead}</p>
          <div className="mt-7 divide-y divide-border/65 border-t border-border/65">
            {t.levels.map((level, index) => (
              <div key={level.name} className="grid gap-2 py-4 sm:grid-cols-[32px_220px_1fr] sm:gap-4">
                <span className="text-[11px] tabular-nums text-foreground/55">0{index + 1}</span>
                <h3 className="text-[14px] font-medium">{level.name}</h3>
                <p className="text-[13px] leading-[1.7] text-foreground/75">{level.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="border-b border-border/70 py-10 sm:py-12" aria-labelledby="about-balance">
          <h2 id="about-balance" className="text-[23px] font-light tracking-[-0.025em]">{t.balanceTitle}</h2>
          <p className="mt-4 max-w-[720px] text-[14px] leading-[1.9] text-foreground/80">{t.balanceLead}</p>
          <div className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2">
            {t.shares.map((share) => (
              <div key={share.name} className="grid grid-cols-[80px_1fr] gap-4 border-t border-foreground/25 pt-4">
                <span className="text-[25px] font-light tabular-nums">{share.value}</span>
                <div>
                  <h3 className="text-[14px] font-medium">{share.name}</h3>
                  <p className="mt-2 text-[13px] leading-[1.7] text-foreground/75">{share.text}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-7 text-[12px] leading-[1.85] text-foreground/70">{t.balanceNote}</p>
        </section>
        <ArticleSection id="tree" title={t.treeTitle} paragraphs={t.tree} />
        <section className="border-b border-border/70 py-10 sm:py-12" aria-labelledby="about-reading">
          <h2 id="about-reading" className="text-[23px] font-light tracking-[-0.025em]">{t.readTitle}</h2>
          <div className="mt-7 divide-y divide-border/70">
            {t.read.map((item, index) => (
              <div key={item.title} className="grid gap-2 py-5 sm:grid-cols-[32px_210px_1fr] sm:gap-4">
                <span className="text-[11px] tabular-nums text-foreground/55">0{index + 1}</span>
                <h3 className="text-[14px] font-medium">{item.title}</h3>
                <p className="text-[13px] leading-[1.8] text-foreground/80">{item.text}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="py-12 sm:py-16">
          <p className="max-w-[700px] text-[clamp(1.5rem,3.5vw,2.1rem)] font-light leading-[1.4] tracking-[-0.025em]">{t.finish}</p>
          <Link
            to={calculatorPath}
            className="mt-8 inline-flex min-h-11 items-center border-b border-foreground/50 text-[13px] transition-colors hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          >
            {t.cta} <span aria-hidden="true" className="ml-4">→</span>
          </Link>
        </section>
        <footer className="border-t border-border/70 pt-4 text-[11px] leading-[1.8] text-foreground/65">{t.foot}</footer>
      </main>
    </div>
  );
}

function ArticleSection({ id, title, paragraphs }: { id: string; title: string; paragraphs: readonly string[] }) {
  return (
    <section className="border-b border-border/70 py-10 sm:py-12" aria-labelledby={"about-" + id}>
      <h2 id={"about-" + id} className="text-[23px] font-light tracking-[-0.025em]">{title}</h2>
      <div className="mt-4 max-w-[720px] space-y-4 text-[14px] leading-[1.9] text-foreground/80">
        {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      </div>
    </section>
  );
}
