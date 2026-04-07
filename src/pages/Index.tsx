import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Target, Zap } from "lucide-react";
import Layout from "@/components/Layout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const services = [
  {
    icon: Sparkles,
    title: "Дизайн",
    desc: "Создаём уникальный визуальный стиль, который выделяет вас среди конкурентов.",
    link: "/services",
  },
  {
    icon: Target,
    title: "Стратегия",
    desc: "Разрабатываем эффективную стратегию для достижения ваших бизнес-целей.",
    link: "/services",
  },
  {
    icon: Zap,
    title: "Разработка",
    desc: "Воплощаем идеи в жизнь с помощью современных технологий.",
    link: "/services",
  },
];

const Index = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="container mx-auto px-6 py-24 md:py-40">
        <div className="max-w-2xl">
          <p className="text-sm font-medium tracking-widest uppercase text-primary mb-4">
            Добро пожаловать
          </p>
          <h1 className="text-4xl md:text-6xl leading-tight mb-6">
            Мы создаём<br />
            <span className="text-primary">цифровые решения</span>
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8 max-w-lg">
            Помогаем бизнесу расти через дизайн, стратегию и технологии. 
            Простые решения для сложных задач.
          </p>
          <div className="flex flex-wrap gap-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  Узнать больше <ArrowRight size={16} />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-heading text-xl">О нас кратко</DialogTitle>
                </DialogHeader>
                <p className="text-muted-foreground leading-relaxed">
                  Мы — команда профессионалов с многолетним опытом в сфере цифровых технологий. 
                  Наша миссия — создавать продукты, которые упрощают жизнь и помогают бизнесу достигать новых высот. 
                  Каждый проект — это индивидуальный подход и внимание к деталям.
                </p>
                <Link to="/about">
                  <Button variant="outline" className="mt-2 w-full gap-2">
                    Подробнее <ArrowRight size={14} />
                  </Button>
                </Link>
              </DialogContent>
            </Dialog>
            <Link to="/contact">
              <Button variant="outline" size="lg">
                Связаться
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Services preview */}
      <section className="container mx-auto px-6 pb-24">
        <h2 className="text-2xl md:text-3xl mb-12">Наши услуги</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {services.map((s) => (
            <Link
              key={s.title}
              to={s.link}
              className="group p-8 rounded-xl border bg-card hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5"
            >
              <s.icon className="text-primary mb-4" size={28} />
              <h3 className="font-heading text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              <span className="inline-flex items-center gap-1 mt-4 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                Подробнее <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </Layout>
  );
};

export default Index;
