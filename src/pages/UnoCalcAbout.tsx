import { Link, useLocation } from "react-router-dom";
import LanguageSwitcher from "@/i18n/LanguageSwitcher";
import { useLocale } from "@/i18n/useLocale";
import { calculateUno, formatUer, formatVolume } from "@/lib/unocalc";

const aboutCopy = {
  ru: {
    eyebrow: "UNOcalc / просветительская модель",
    navApp: "к расчёту",
    navHome: ".uno",
    title: "Не норматив. Система координат.",
    lead: "UNOcalc помогает исследовать ресурсную достаточность создаваемого объекта. Он не выносит окончательное суждение о цене или качестве, а предлагает простую структуру, с которой можно задавать более точные вопросы.",
    statement: "Не утверждать единственную меру, а учиться видеть взаимосвязь формы, качества и ресурса.",
    purposeTitle: "Зачем нужен такой инструмент",
    purposeLead: "Норматив фиксирует требования в пределах своей области. UNOcalc предлагает другой тип ценности: наблюдать, сравнивать и осознанно обсуждать ресурс, а не принимать число за истину.",
    purposeParagraphs: ["Модель намеренно проста. Габаритный контейнер, выбранный уровень исполнения и исходный ресурсный баланс дают условную точку отсчёта. Её можно проверять, оспаривать и уточнять.","Просветительский характер не делает формулу фактом: коэффициенты и соответствие денежной стоимости остаются авторскими гипотезами. Требования безопасности, расчёт прочности и применимые нормативы модель не заменяет."],
    exampleTitle: "Учебный пример, не реальный объект",
    exampleIntro: "Представим условный объект габаритами 10 × 10 × 3 м на уровне «Базовая форма». UNOcalc рассчитывает индекс по собственному алгоритму; фактическая себестоимость здесь неизвестна.",
    exampleVolume: "Габаритный объём",
    exampleIndex: "Индекс модели",
    exampleQuestion: "Что делать с результатом? Сопоставить его с реальной сметой или предложением только при одинаковом составе работ и зафиксировать, какие различия объясняются конструкцией, технологией и условиями выполнения.",
    exampleCaution: "Это демонстрация механики формулы, не проверенный рыночный кейс и не доказательство точности UNOcalc.",
    exampleTry: "Открыть этот пример в калькуляторе",
    stepsTitle: "Три основы модели",
    steps: [
      { n: "01", name: "Контейнер", text: "Длина, ширина и высота задают габаритный пространственный масштаб объекта." },
      { n: "02", name: "Плотность качества", text: "Выбранный уровень исполнения задаёт условную ресурсоёмкость воплощения формы." },
      { n: "03", name: "Баланс", text: "Ресурс созидания распределяется между тремя рабочими ветвями и центральной комплектацией; инвестиция обеспечивает его поступление." },
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
    balanceTitle: "Основание и четыре ветви",
    balanceLead: "В дереве UNOcalc идея — вершина, комплектация — материальное основание ствола и центральный круг. От центра отходят четыре ветви: проектирование, реализация, ритейл и инвестиция. Инвестиция направляет капитал в систему, а не забирает долю из бюджета созидания.",
    shares: [
      { value: "20%", name: "Ритейл", text: "Выход к потребителю, организация обращения и предоставления результата." },
      { value: "20%", name: "Проектирование", text: "Замысел, расчёт, согласование решений и контроль соответствия." },
      { value: "20%", name: "Реализация", text: "Мастерство, изготовление, сборка, монтаж и качество исполнения." },
      { value: "40%", name: "Комплектующие", text: "Материалы, элементы, оборудование и снабжение." },
    ],
    balanceNote: "20 / 20 / 20 / 40 — доли расходного ресурса: ритейл, проектирование, реализация и комплектация в центре. Это исходная авторская пропорция, не обязательная рыночная норма. Три ветви регулируются непосредственно на диаграмме, центральная комплектация — кнопками ±. Инвестиционная ветвь не имеет расходного процента.",
    investmentTitle: "Что получает инвестор от UNOcalc",
    investmentLead: "Инвестиция — дающая сторона: источник капитала, а не пятая статья расходов. Она обеспечивает ресурс созидания, который уже распределяется между проектированием, реализацией, ритейлом и комплектующими. Повторно включать инвестицию в эти 100% означало бы дважды учесть один ресурс.",
    investmentFlow: [
      { title: "Инвестиция", text: "Поступление капитала. Источник обеспечения, а не расходная доля." },
      { title: "Созидание · 100%", text: "20% ритейл · 20% проект · 20% реализация · 40% комплектующие. Исходный баланс модели." },
      { title: "Продукт", text: "Результат, для которого требуется обеспечить пользу, прочность и красоту." },
    ],
    investmentWhyTitle: "Практическая польза для инвестора",
    investmentWhy: [
      "До вложения средств инвестор видит не только идею, но и условную ёмкость её воплощения: масштаб, требуемый уровень исполнения и четыре направления обеспечения. Это основа для предметного разговора с автором и производством.",
      "Когда появляются типовое производство, отработанная технология и устойчивый сбыт, некоторые повторные затраты могут снижаться. Экономия способна высвободить ресурс для возврата капитала и последующего дохода, но не гарантирует его.",
      "UNOcalc не прогнозирует прибыль, сроки окупаемости, дивиденды или долю инвестора. Эти условия определяются фактической экономикой проекта и соглашениями сторон. Денежный ориентир U.E.R. пока остаётся гипотезой.",
    ],
    investmentNote: "Инвестор финансирует возможность созидания — он не обязан получать отдельную долю первоначального распределения. Его возможное вознаграждение возникает из результатов деятельности и отдельного соглашения, а не из арифметики UNOcalc.",
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
    eyebrow: "UNOcalc / educational model",
    navApp: "calculator",
    navHome: ".uno",
    title: "Not a standard. A frame of reference.",
    lead: "UNOcalc invites exploration of the resources involved in making an object. Rather than deciding what something must cost or how good it is, it offers a simple structure for asking more precise questions.",
    statement: "Not to prescribe one true measure, but to understand the relationship between form, quality and resources.",
    purposeTitle: "Why this tool exists",
    purposeLead: "A standard sets requirements within its scope. UNOcalc offers a different kind of value: observing, comparing and discussing resources without treating one number as final truth.",
    purposeParagraphs: ["The model is deliberately simple. The bounding container, intended execution level and initial resource allocation provide a hypothetical reference point that can be tested, challenged and revised.","An educational purpose does not prove the formula: its coefficients and any currency equivalence remain author-defined hypotheses. UNOcalc cannot replace structural engineering, safety rules or applicable standards."],
    exampleTitle: "Worked illustration, not a verified project",
    exampleIntro: "Consider a hypothetical 10 × 10 × 3 m object at the Basic Form level. UNOcalc computes an index using its own equation; the object's actual cost is unknown.",
    exampleVolume: "Bounding volume",
    exampleIndex: "Model index",
    exampleQuestion: "What next? Compare against an actual quote only for an equivalent scope, and investigate how construction, technology, workmanship and local conditions explain differences.",
    exampleCaution: "This demonstrates how the equation works; it is not a validated market case or evidence that UNOcalc is accurate.",
    exampleTry: "Open this example in the calculator",
    stepsTitle: "Three foundations",
    steps: [
      { n: "01", name: "Container", text: "Length, width and height define an object's overall spatial scale." },
      { n: "02", name: "Quality density", text: "The selected execution level defines an assumed resource intensity for bringing the form into being." },
      { n: "03", name: "Balance", text: "The creation resource is allocated between three working branches and central components, while investment supplies funding." },
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
    balanceTitle: "The foundation and four branches",
    balanceLead: "In the UNOcalc tree, the idea is the apex; components form the material base of the trunk and the central circle. Four branches surround it: design, execution, retail and investment. Investment brings capital into the system rather than taking a share of the creation budget.",
    shares: [
      { value: "20%", name: "Retail", text: "Connecting the result with the people who use it, distribution and market access." },
      { value: "20%", name: "Project / design", text: "Concept, planning, coordination of decisions and design intent." },
      { value: "20%", name: "Execution", text: "Craft, production, assembly, installation and workmanship." },
      { value: "40%", name: "Components", text: "Materials, parts, equipment and supply." },
    ],
    balanceNote: "20 / 20 / 20 / 40 represents creation-resource shares for retail, design, execution and central components. It is an author's starting balance, not a universal accounting rule. Drag the three execution branches; use ± to adjust central components. Investment carries no expense percentage.",
    investmentTitle: "What UNOcalc offers an investor",
    investmentLead: "Investment is an incoming source of capital, not a fifth expense category. It enables the creative resource that is then allocated between design, production, retail and components. Adding investment again to the 100% allocation would count the same resource twice.",
    investmentFlow: [
      { title: "Investment", text: "Capital supplied to make the project possible; a funding source, not an expense share." },
      { title: "Creation · 100%", text: "20% retail · 20% design · 20% execution · 40% components. The model's initial allocation." },
      { title: "Product", text: "The result, which must fulfil utility, strength and beauty." },
    ],
    investmentWhyTitle: "Why it may be useful to an investor",
    investmentWhy: [
      "Before committing funds, an investor can see more than an idea: an indicative resource envelope, execution level and four areas of support. It gives the author, manufacturer and investor a shared starting point.",
      "Repeat production, established methods and stable distribution can reduce some recurring costs. Savings may create room for capital recovery and eventual returns, but do not guarantee them.",
      "UNOcalc does not forecast profits, payback periods, dividends or equity shares. These depend on actual project economics and separate agreements. The currency interpretation of U.E.R. remains an unvalidated assumption.",
    ],
    investmentNote: "An investor finances the possibility of creation, without claiming a new share of the initial production allocation. Any return comes from subsequent results and a separate agreement — not from UNOcalc arithmetic.",
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
    eyebrow: "UNOcalc / просвітницька модель",
    navApp: "до розрахунку",
    navHome: ".uno",
    title: "Не норматив. Система координат.",
    lead: "UNOcalc допомагає досліджувати ресурсну достатність створюваного об’єкта. Він не виносить остаточного судження про ціну чи якість, а пропонує просту структуру для точніших запитань.",
    statement: "Не проголошувати єдину міру, а вчитися бачити взаємозв’язок форми, якості та ресурсу.",
    purposeTitle: "Навіщо потрібен цей інструмент",
    purposeLead: "Норматив встановлює вимоги у своїй сфері. UNOcalc пропонує іншу цінність: спостерігати, порівнювати й усвідомлено обговорювати ресурс, не сприймаючи число як остаточну істину.",
    purposeParagraphs: ["Модель навмисно проста. Габаритний контейнер, обраний рівень виконання та вихідний ресурсний баланс дають умовну точку відліку, яку можна перевіряти, ставити під сумнів та уточнювати.","Просвітницький характер не доводить формулу: коефіцієнти та грошовий еквівалент залишаються авторськими гіпотезами. Вимоги безпеки, інженерні розрахунки та чинні нормативи модель не замінює."],
    exampleTitle: "Навчальний приклад, не реальний об’єкт",
    exampleIntro: "Уявімо умовний об’єкт габаритами 10 × 10 × 3 м на рівні «Базова форма». UNOcalc обчислює індекс за власним алгоритмом; фактична собівартість тут невідома.",
    exampleVolume: "Габаритний об’єм",
    exampleIndex: "Індекс моделі",
    exampleQuestion: "Що робити з результатом? Порівняти з реальною пропозицією лише за однакового складу робіт і дослідити вплив конструкції, технології, майстерності та умов виконання.",
    exampleCaution: "Це демонстрація роботи формули, не перевірений ринковий приклад і не доказ точності UNOcalc.",
    exampleTry: "Відкрити цей приклад у калькуляторі",
    stepsTitle: "Три основи моделі",
    steps: [
      { n: "01", name: "Контейнер", text: "Довжина, ширина й висота задають габаритний просторовий масштаб об’єкта." },
      { n: "02", name: "Щільність якості", text: "Обраний рівень виконання визначає умовну ресурсоємність втілення форми." },
      { n: "03", name: "Баланс", text: "Ресурс створення розподіляється між трьома робочими гілками та центральними комплектуючими; інвестиція забезпечує його надходження." },
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
    balanceTitle: "Основа та чотири гілки",
    balanceLead: "У дереві UNOcalc ідея — вершина, комплектуючі — матеріальна основа стовбура й центральне коло. Чотири гілки навколо: проєктування, реалізація, ритейл та інвестиція. Інвестиція спрямовує капітал у систему, а не забирає частку з бюджету створення.",
    shares: [
      { value: "20%", name: "Ритейл", text: "Вихід до споживача, організація обігу та надання результату." },
      { value: "20%", name: "Проєктування", text: "Задум, розрахунок, узгодження рішень і відповідність проєкту." },
      { value: "20%", name: "Реалізація", text: "Майстерність, виготовлення, складання, монтаж і якість виконання." },
      { value: "40%", name: "Комплектуючі", text: "Матеріали, елементи, обладнання та постачання." },
    ],
    balanceNote: "20 / 20 / 20 / 40 — частки витратного ресурсу: ритейл, проєктування, реалізація і центральні комплектуючі. Це початкова авторська пропорція, а не універсальна норма. Три робочі гілки регулюються на діаграмі, центральні комплектуючі — кнопками ±. Інвестиційна гілка не має витратного відсотка.",
    investmentTitle: "Що UNOcalc дає інвестору",
    investmentLead: "Інвестиція — сторона, що надає капітал, а не п’ята стаття витрат. Вона забезпечує ресурс створення, який уже розподіляється між проєктуванням, реалізацією, ритейлом і комплектуючими. Додавання інвестиції до цих 100% вдруге означало б подвійний облік.",
    investmentFlow: [
      { title: "Інвестиція", text: "Надходження капіталу: джерело забезпечення, а не частка витрат." },
      { title: "Створення · 100%", text: "20% ритейл · 20% проєкт · 20% реалізація · 40% комплектуючі. Вихідний баланс моделі." },
      { title: "Продукт", text: "Результат, у якому необхідно забезпечити користь, міцність і красу." },
    ],
    investmentWhyTitle: "Практична користь для інвестора",
    investmentWhy: [
      "До вкладення коштів інвестор бачить не лише ідею, а й умовну ресурсну місткість її втілення: масштаб, рівень виконання та чотири напрями забезпечення. Це основа для розмови з автором і виробництвом.",
      "Повторюване виробництво, відпрацьована технологія і стабільний збут можуть зменшувати частину повторних витрат. Економія може створювати можливість повернення капіталу й доходу, але не гарантує їх.",
      "UNOcalc не прогнозує прибуток, окупність, дивіденди або частку інвестора. Ці умови визначаються фактичною економікою проєкту й окремими угодами. Грошовий еквівалент U.E.R. залишається неперевіреним припущенням.",
    ],
    investmentNote: "Інвестор фінансує можливість створення, але не отримує нову частку початкового розподілу витрат. Можлива винагорода виникає з подальших результатів діяльності та окремої домовленості, а не з арифметики UNOcalc.",
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
  const examplePath = localePath("/unocalc") + "?a=10000&b=10000&c=3000&quality=basic";
  const example = calculateUno({ a: "10000", b: "10000", c: "3000", q: 108 });
  const exampleVolume = example.status === "ok" ? formatVolume(example.volume) : "—";
  const exampleIndex = example.status === "ok" ? formatUer(example.energy) : "—";
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
        <section className="border-b border-border/70 py-10 sm:py-12" aria-labelledby="unocalc-purpose">
          <h2 id="unocalc-purpose" className="text-[23px] font-light tracking-[-0.025em]">{t.purposeTitle}</h2>
          <p className="mt-4 max-w-[720px] text-[15px] font-light leading-[1.85]">{t.purposeLead}</p>
          <div className="mt-4 max-w-[720px] space-y-3 text-[13px] leading-[1.85] text-foreground/75">
            {t.purposeParagraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
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
        <section className="border-b border-border/70 py-10 sm:py-12" aria-labelledby="unocalc-example">
          <h2 id="unocalc-example" className="text-[23px] font-light tracking-[-0.025em]">{t.exampleTitle}</h2>
          <p className="mt-4 max-w-[720px] text-[13px] leading-[1.85] text-foreground/80">{t.exampleIntro}</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            <div className="border-t border-foreground/30 pt-3">
              <span className="text-[11px] text-foreground/70">A × B × C</span>
              <p className="mt-4 text-[21px] font-light tabular-nums">10 × 10 × 3 <span className="text-[12px]">m</span></p>
            </div>
            <div className="border-t border-foreground/30 pt-3">
              <span className="text-[11px] text-foreground/70">{t.exampleVolume}</span>
              <p className="mt-4 text-[21px] font-light tabular-nums">{exampleVolume} <span className="text-[12px]">m³</span></p>
            </div>
            <div className="border-t border-foreground/30 pt-3">
              <span className="text-[11px] text-foreground/70">{t.exampleIndex}</span>
              <p className="mt-4 text-[21px] font-light tabular-nums">{exampleIndex} <span className="text-[12px]">U.E.R.</span></p>
            </div>
          </div>
          <p className="mt-6 max-w-[720px] text-[13px] leading-[1.85] text-foreground/80">{t.exampleQuestion}</p>
          <p className="mt-3 max-w-[720px] text-[11px] leading-[1.75] text-foreground/65">{t.exampleCaution}</p>
          <Link to={examplePath} className="mt-5 inline-flex min-h-10 items-center border-b border-foreground/40 text-[12px] hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">{t.exampleTry} →</Link>
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

        <section id="investment" className="scroll-mt-10 border-b border-border/70 py-10 sm:py-12" aria-labelledby="about-investment">
          <h2 id="about-investment" className="text-[23px] font-light tracking-[-0.025em]">{t.investmentTitle}</h2>
          <p className="mt-4 max-w-[720px] text-[14px] leading-[1.9] text-foreground/80">{t.investmentLead}</p>
          <div className="mt-8 grid items-stretch gap-2 sm:grid-cols-3">
            {t.investmentFlow.map((part, index) => (
              <div key={part.title} className="relative border border-border/80 p-4 sm:min-h-[154px]">
                <span className="text-[11px] tabular-nums text-foreground/50">0{index + 1}</span>
                <h3 className="mt-4 text-[17px] font-light">{part.title}</h3>
                <p className="mt-2 text-[12px] leading-[1.7] text-foreground/75">{part.text}</p>
              </div>
            ))}
          </div>
          <h3 className="mt-9 text-[13px] font-medium">{t.investmentWhyTitle}</h3>
          <div className="mt-3 max-w-[720px] space-y-4 text-[13px] leading-[1.8] text-foreground/80">
            {t.investmentWhy.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
          <p className="mt-6 max-w-[720px] border-l border-foreground/40 pl-4 text-[12px] leading-[1.8] text-foreground/75">{t.investmentNote}</p>
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
