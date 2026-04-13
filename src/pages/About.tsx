import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import PageTransition from "@/components/PageTransition";

const About = () => {
  const navigate = useNavigate();

  return (
    <PageTransition>
      <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
        <div className="max-w-xl w-full">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Назад"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-sm tracking-[0.15em] font-normal">R.Yury Kolesnikov</h1>
            </div>
            <Link to="/" className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors">
              .uno
            </Link>
          </div>

          <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-8">.uno studio</p>

          <div className="text-[13px] leading-[1.85] text-foreground/85 space-y-5">
            <p>
              Я есть и являю собой творческое сознание. Мои действия направлены с целью повышение качества жизни во всём
              её многообразии и великолепии, жизни как арены, состоящей из элементов определяющих пространственную
              структуру оной во времени, опирающуюся на фундаментальные свойства материи, используя цифровую виртуальность
              как инструмент для создания и обретения значимых и необходимых элементов нашей повседневности.
            </p>

            <div className="w-12 h-px bg-primary/30 my-6" />

            <p>
              Таким образом моё восприятие сконцентрировано на предмете, продукте, или же элементе жизни в голографическом
              формате пространственной структуры безразмерной единицы вселенной.
            </p>

            <div className="w-12 h-px bg-primary/30 my-6" />

            <p className="text-primary/90 font-medium">
              Знаю это и надеюсь, что моё соучастие поможет каждому почувствовать себя счастливее и веселее.
            </p>
            <p>
              В этом есть проявление любви и заботы о человеке, живущем на планете Земля, как сущности высшего сознания мира.
            </p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default About;
