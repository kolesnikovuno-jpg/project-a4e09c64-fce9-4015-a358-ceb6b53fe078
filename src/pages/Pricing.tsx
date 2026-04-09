const Pricing = () => (
  <div className="min-h-screen flex items-start md:items-center justify-center bg-background px-6 py-16 md:py-0">
    <div className="max-w-xl w-full">
      <h1 className="text-[17px] md:text-[19px] font-semibold tracking-tight text-foreground mb-8 md:mb-10">
        Стоимость и формат
      </h1>

      <div className="space-y-5 md:space-y-6 text-[13px] md:text-[14px] text-muted-foreground leading-relaxed">
        <p>
          Работа начинается с первичной консультации без обязательств и позволяет
          определить направление и ориентиры проекта.
        </p>

        <p>
          Вход в работу составляет 500–1000$ (в зависимости от масштаба задачи)
          и входит в итоговую стоимость.
        </p>

        <p>
          После анализа формируется структура проекта с расчётной оценкой затрат
          и фиксируется диапазон стоимости реализации.
        </p>

        <p>
          Далее работа ведётся поэтапно, с привязкой к фактическому ходу
          реализации.
        </p>

        <p className="text-foreground font-semibold tracking-tight text-[14px] md:text-[15px]">
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
