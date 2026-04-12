import { Link } from "react-router-dom";

const Pricing = () => (
  <div className="min-h-screen flex items-start md:items-center justify-center bg-background px-6 py-16 md:py-0">
    <div className="max-w-xl w-full">
      <div className="flex items-center justify-between mb-8 md:mb-10">
        <h1 className="text-[15px] md:text-[16px] font-medium tracking-[0.04em] text-foreground">
          Стоимость и формат
        </h1>
        <Link
          to="/"
          className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors"
        >
          .uno
        </Link>
      </div>

      <div className="space-y-5 md:space-y-6 text-[13px] md:text-[14px] text-muted-foreground leading-relaxed">
        <p>
          Работа начинается с анализа ситуации — без обязательств. Это позволяет
          определить контекст, направление и ориентиры проекта.
        </p>

        <p>
          Вход в работу составляет 500–1000$ (в зависимости от масштаба задачи)
          и входит в итоговую стоимость.
        </p>

        <p>
          По итогам анализа формируется концепция с расчётной оценкой затрат
          и фиксируется диапазон стоимости реализации.
        </p>

        <p>
          Далее — разработка проекта и контроль реализации, поэтапно,
          с привязкой к фактическому ходу работ.
        </p>

        <p className="text-foreground font-medium tracking-[0.02em] text-[13px] md:text-[14px]">
          Итоговая стоимость моей работы составляет 10–20% от общих затрат на
          реализацию проекта (включительно).
        </p>

        <p>
          Точный процент определяется после анализа, зависит от сложности,
          масштаба и уровня вовлечения и фиксируется до начала реализации.
        </p>

        <p>
          Все ключевые параметры согласовываются заранее, изменения возможны
          только при изменении самой задачи.
        </p>

        <p>
          Работа ведётся на основании авторского права. Права на результат
          передаются по отдельному соглашению.
        </p>
      </div>

      <p className="mt-10 md:mt-12 text-[13px] md:text-[14px] text-muted-foreground">
        Если есть задача или что-то не сходится — напишите, разберём
      </p>

      <a
        href="https://t.me/kolesnikov_uno"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-block mt-4 text-[13px] text-primary font-medium hover:text-primary/80 transition-colors"
      >
        Написать →
      </a>
    </div>
  </div>
);

export default Pricing;
