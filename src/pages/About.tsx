import { Link } from "react-router-dom";

const About = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="max-w-xl w-full">
        <div className="flex items-center justify-between mb-10">
          <h1 className="text-sm tracking-[0.15em] font-normal">R. Yuriy Kolesnikov</h1>
          <Link
            to="/"
            className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors"
          >
            .uno
          </Link>
        </div>

        <p className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground mb-8">.uno studio</p>

        <div className="text-[13px] leading-[1.85] text-foreground/85 space-y-5">
          <p>
            Я есть и являю собой творческое сознание. Мои действия направлены с целью повышение качества жизни во всём её многообразии и великолепии, жизни как арены, состоящей из элементов определяющих пространственную структуру оной во времени, опирающуюся на фундаментальные свойства материи, используя цифровую виртуальность как инструмент для создания и обретения значимых и необходимых элементов нашей повседневности.
          </p>
          <p>
            Таким образом моё восприятие сконцентрировано на предмете, продукте, или же элементе жизни в голографическом формате пространственной структуры безразмерной единицы вселенной.
          </p>
          <p>
            Знаю это и надеюсь, что моё соучастие поможет каждому почувствовать себя счастливее и веселее. В этом есть проявление любви и заботы о человеке, живущем на планете Земля, как сущности высшего сознания мира.
          </p>
        </div>
      </div>
    </div>
  );
};

export default About;
