import { Link } from "react-router-dom";

const UnoCalc = () => (
  <div className="min-h-screen flex items-start md:items-center justify-center bg-background px-6 py-16 md:py-0">
    <div className="max-w-xl w-full">
      <div className="flex items-center justify-between mb-8 md:mb-10">
        <h1 className="text-[17px] md:text-[19px] font-semibold tracking-tight text-foreground">
          unocalc
        </h1>
        <Link
          to="/"
          className="text-[13px] text-primary font-medium hover:text-primary/80 transition-colors"
        >
          .uno
        </Link>
      </div>

      <p className="text-[13px] text-muted-foreground">
        Скоро здесь появится калькулятор.
      </p>
    </div>
  </div>
);

export default UnoCalc;
