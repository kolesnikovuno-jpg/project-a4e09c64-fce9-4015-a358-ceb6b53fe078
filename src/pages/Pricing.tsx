import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";

const SectionLabel = ({ children }: { children: string }) => (
  <p className="text-[10px] tracking-[0.22em] uppercase text-primary/60 font-medium mb-4">{children}</p>
);

const Pricing = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background px-6 sm:px-10 md:px-16 lg:px-20 pt-16 sm:pt-20 md:pt-24 pb-20 md:pb-28">
        <div className="max-w-5xl w-full mx-auto">
          <div className="flex items-center justify-between mb-16 md:mb-20">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Назад"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-[12px] md:text-[13px] tracking-[0.04em] text-foreground">формат и стоимость</h1>
            </div>
            <Link to="/" className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors">
              .uno
            </Link>
          </div>

          <div className="text-[13px] md:text-[14px] text-muted-foreground leading-[1.7]">
            {/* Essence */}
            <section className="mb-8 md:mb-10">
              <SectionLabel>Суть работы</SectionLabel>
              <p className="text-foreground text-[14px] md:text-[16px] leading-[1] max-w-xl">
                Иногда проблема не в решении,
                <br />а в отсутствии структуры.
              </p>
              <p className="mt-5 max-w-xl">
                Я выявляю структуру и перевожу её в форму,
                <br />
                которая работает.
              </p>
            </section>

            <div className="w-full h-px bg-border/20 mb-8 md:mb-10" />

            {/* Process */}
            <section className="mb-8 md:mb-10">
              <SectionLabel>Процесс</SectionLabel>
              <p className="max-w-xl">
                Работа начинается с анализа ситуации.
                <br />
                На данном этапе определяется контекст, направление
                <br />и принимается решение о дальнейшем формате работы.
              </p>
            </section>

            <div className="w-full h-px bg-border/20 mb-8 md:mb-10" />

            {/* Entry / Result of stage */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12 mb-8 md:mb-10">
              <div>
                <SectionLabel>Вход</SectionLabel>
                <p>
                  Первый этап — анализ ситуации.
                  <br />
                  Без его прохождения
                  <br />
                  работа не продолжается.
                </p>

                <div className="mt-10">
                  <SectionLabel>Результат этапа:</SectionLabel>
                  <ul className="space-y-1.5">
                    <li className="relative pl-4 before:content-['—'] before:absolute before:left-0">
                      формирование концепции
                    </li>
                    <li className="relative pl-4 before:content-['—'] before:absolute before:left-0">
                      понимание реальной задачи
                    </li>
                    <li className="relative pl-4 before:content-['—'] before:absolute before:left-0">
                      оценка диапазона стоимости реализации
                    </li>
                  </ul>
                </div>
              </div>

              <div>
                <p className="text-foreground font-medium tabular-nums">Стоимость: 300⟶1000+ $</p>
                <p className="mt-2">
                  в зависимости от масштаба задачи
                  <br />
                  и глубины проработки.
                  <br />
                  Сумма входит в итоговую стоимость.
                </p>

                <p className="mt-10">
                  После анализа принимается решение
                  <br />о формате дальнейшей работы.
                </p>
              </div>
            </section>

            <div className="w-full h-px bg-border/20 mb-8 md:mb-10" />

            {/* Further work / Final cost */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12 mb-8 md:mb-10">
              <div>
                <SectionLabel>Дальнейшая работа</SectionLabel>
                <p>
                  Далее — разработка проекта
                  <br />
                  и контроль реализации,
                  <br />
                  поэтапно, с привязкой к фактическому
                  <br />
                  ходу работ.
                </p>
              </div>
              <div>
                <SectionLabel>Итоговая стоимость</SectionLabel>
                <p className="text-foreground text-[15px] md:text-[16px] font-medium tabular-nums leading-[1.5]">
                  10–20 % от общих затрат
                  <br />
                  на реализацию проекта
                </p>
                <p className="mt-4">
                  Точный процент определяется после анализа,
                  <br />
                  зависит от сложности, масштаба и уровня вовлечения,
                  <br />
                  фиксируется до начала реализации.
                </p>
              </div>
            </section>

            <div className="w-full h-px bg-border/20 mb-8 md:mb-10" />

            {/* Terms / Rights */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12 mb-8 md:mb-10">
              <div>
                <SectionLabel>Условия</SectionLabel>
                <p>
                  Все ключевые параметры согласовываются заранее,
                  <br />
                  изменения возможны только при изменении
                  <br />
                  самой задачи.
                </p>
              </div>
              <div>
                <SectionLabel>Права</SectionLabel>
                <p>
                  Работа ведётся на основании авторского права.
                  <br />
                  Переданные решения не подлежат использованию
                  <br />
                  без согласования. Права на результат
                  <br />
                  передаются отдельно.
                </p>
              </div>
            </section>

            <div className="w-full h-px bg-border/20 mb-8 md:mb-10" />

            {/* Contact */}
            <section>
              <SectionLabel>Контакт</SectionLabel>
              <p>
                Когда появляется задача — напишите.
                <br />
                Работа начинается с анализа ситуации.
              </p>
              <div className="mt-10 flex items-center justify-between">
                <a
                  href="https://t.me/kolesnikov_uno"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[13px] text-primary font-medium border-b border-primary/30 hover:border-primary transition-colors pb-0.5"
                >
                  Написать в Telegram →
                </a>
                <button
                  onClick={() => navigate(-1)}
                  className="text-[13px] text-muted-foreground hover:text-foreground transition-colors border-b border-border/50 hover:border-foreground pb-0.5"
                >
                  Назад
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Pricing;
