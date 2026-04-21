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
      <div className="min-h-screen bg-background px-5 sm:px-6 pt-20 sm:pt-24 md:pt-28 pb-24 sm:pb-28 md:pb-32">
        <div className="max-w-xl w-full mx-auto">
          <div className="flex items-center justify-between mb-10 md:mb-12">
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

          <div className="space-y-12 md:space-y-14 text-[13px] md:text-[14px] text-muted-foreground leading-[1.7]">
            {/* Process */}
            <div>
              <SectionLabel>Процесс</SectionLabel>
              <p>
                Работа начинается с анализа ситуации. На данном этапе определяется контекст, направление и принимается
                решение о дальнейшем формате работы.
              </p>
            </div>

            <div className="w-full h-px bg-border/30" />

            {/* Entry */}
            <div>
              <SectionLabel>Вход</SectionLabel>
              <p>Первый этап — анализ ситуации. Без его прохождения работа не продолжается.</p>

              <p className="text-foreground font-medium mt-6 tabular-nums">Стоимость: 300–1000 $</p>
              <p className="mt-1">
                в зависимости от масштаба задачи и глубины проработки. Сумма входит в итоговую стоимость.
              </p>

              <p className="mt-6">Результат этапа:</p>
              <ul className="mt-2 space-y-1.5">
                <li className="relative pl-4 before:content-['–'] before:absolute before:left-0">
                  формирование концепции
                </li>
                <li className="relative pl-4 before:content-['–'] before:absolute before:left-0">
                  понимание реальной задачи
                </li>
                <li className="relative pl-4 before:content-['–'] before:absolute before:left-0">
                  оценка диапазона стоимости реализации
                </li>
              </ul>
            </div>

            <div className="w-full h-px bg-border/30" />

            {/* Calculation */}
            <div>
              <SectionLabel>Расчёт</SectionLabel>
              <p>Далее — разработка проекта и контроль реализации, поэтапно, с привязкой к фактическому ходу работ.</p>
              <p className="text-foreground font-medium mt-6 tabular-nums">
                Итоговая стоимость моей работы составляет10–20 % от общих затрат на реализацию проекта
              </p>
              <p className="mt-1">
                Точный процент определяется после анализа, зависит от сложности, масштаба и уровня вовлечения,
                фиксируется до начала реализации.
              </p>
            </div>

            <div className="w-full h-px bg-border/30" />

            {/* Terms */}
            <div>
              <SectionLabel>Условия</SectionLabel>
              <p>
                Все ключевые параметры согласовываются заранее, изменения возможны только при изменении самой задачи.
              </p>
            </div>

            <div className="w-full h-px bg-border/30" />

            {/* Rights */}
            <div>
              <SectionLabel>Права</SectionLabel>
              <p>
                Работа ведётся на основании авторского права. Переданные решения не подлежат использованию без
                согласования. Права на результат передаются отдельно
              </p>
            </div>

            <div className="w-full h-px bg-border/30" />

            {/* Contact */}
            <div>
              <SectionLabel>Контакт</SectionLabel>
              <p>Когда появляется задача — напишите. Работа начинается с анализа ситуации.</p>
              <a
                href="https://t.me/kolesnikov_uno"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 text-[13px] text-primary font-medium border-b border-primary/30 hover:border-primary transition-colors"
              >
                Написать →
              </a>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Pricing;
