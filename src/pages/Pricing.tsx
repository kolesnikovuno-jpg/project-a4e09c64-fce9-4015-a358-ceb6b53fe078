import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";

const SectionLabel = ({ children }: { children: string }) => (
  <p className="text-[9px] tracking-[0.2em] uppercase text-primary/70 font-medium mb-3">{children}</p>
);

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen flex items-start md:items-center justify-center bg-background px-6 py-16 md:py-0">
        <div className="max-w-xl w-full">
          <div className="flex items-center justify-between mb-8 md:mb-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Назад"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-[15px] md:text-[16px] font-medium tracking-[0.04em] text-foreground">
                Стоимость и формат
              </h1>
            </div>
            <Link to="/" className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors">
              .uno
            </Link>
          </div>

          <div className="space-y-8 text-[13px] md:text-[14px] text-muted-foreground leading-relaxed">
            {/* Section: Process */}
            <div>
              <SectionLabel>Процесс</SectionLabel>
              <p>
                Работа начинается с анализа ситуации. На данном этапе определяется контекст, направление и принимается
                взаимное решение о дальнейшем сотрудничестве.
              </p>
            </div>

            <div className="w-full h-px bg-border/50" />

            {/* Section: Entry */}
            <div>
              <SectionLabel>Вход</SectionLabel>
              <p className="text-foreground font-medium tracking-[0.02em]">Вход в работу:</p>
              <p className="mt-3">Первый этап — анализ ситуации.</p>
              <p className="mt-3">
                Стоимость: 300–1000$
                <br />
                (в зависимости от масштаба задачи и глубины проработки)
                <br />и входит в итоговую стоимость.
              </p>
              <p className="mt-3">Результат этапа:</p>
              <p className="mt-1">
                — формирование концепции
                <br />— понимание реальной задачи
                <br />— оценка диапазона стоимости реализации
              </p>
              <p className="text-foreground font-medium tracking-[0.02em] mt-3">
                Без прохождения этого этапа работа не продолжается.
              </p>
            </div>

            <div className="w-full h-px bg-border/50" />

            {/* Section: Cost */}
            <div>
              <SectionLabel>Стоимость</SectionLabel>
              <p>Далее — разработка проекта и контроль реализации, поэтапно, с привязкой к фактическому ходу работ.</p>
              <p className="text-foreground font-medium tracking-[0.02em] mt-3">
                Итоговая стоимость моей работы составляет 10–20% от общих затрат на реализацию проекта (включительно).
              </p>
              <p className="mt-3">
                Точный процент определяется после анализа, зависит от сложности, масштаба и уровня вовлечения и
                фиксируется до начала реализации.
              </p>
            </div>

            <div className="w-full h-px bg-border/50" />

            {/* Section: Terms */}
            <div>
              <SectionLabel>Условия</SectionLabel>
              <p>
                Все ключевые параметры согласовываются заранее, изменения возможны только при изменении самой задачи.
              </p>
            </div>

            <div className="w-full h-px bg-border/50" />

            {/* Section: Rights */}
            <div>
              <SectionLabel>Права</SectionLabel>
              <p>
                Работа ведётся на основании авторского права. Переданные решения не подлежат использованию без
                согласования. Права на результат передаются отдельно.
              </p>
            </div>
          </div>

          <p className="mt-10 md:mt-12 text-[13px] md:text-[14px] text-muted-foreground">
            Когда появляется задача — напишите. Работа начинается с анализа ситуации.
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
    </PageTransition>
  );
};

export default Pricing;
