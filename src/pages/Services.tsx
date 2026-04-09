import { Sparkles, Target, Zap, Palette, Code, BarChart3 } from "lucide-react";
import Layout from "@/components/Layout";

const allServices = [
  { icon: Sparkles, title: "Брендинг", desc: "Разработка фирменного стиля, логотипа и визуальной идентичности." },
  { icon: Palette, title: "UI/UX Дизайн", desc: "Проектирование удобных и красивых пользовательских интерфейсов." },
  { icon: Target, title: "Стратегия", desc: "Анализ рынка, позиционирование и планирование роста." },
  { icon: BarChart3, title: "Аналитика", desc: "Сбор и анализ данных для принятия обоснованных решений." },
  { icon: Code, title: "Веб-разработка", desc: "Создание современных, быстрых и адаптивных веб-сайтов." },
  { icon: Zap, title: "Автоматизация", desc: "Оптимизация бизнес-процессов с помощью технологий." },
];

const Services = () => (
  <Layout>
    <section className="container mx-auto px-6 py-24">
      <p className="text-sm font-medium tracking-[0.15em] uppercase text-primary mb-4">
        Услуги
      </p>
      <h1 className="text-3xl md:text-5xl mb-6 max-w-xl">
        Что мы <span className="text-primary">предлагаем</span>
      </h1>
      <p className="text-muted-foreground max-w-lg mb-16 leading-relaxed">
        Полный спектр услуг для развития вашего бизнеса в цифровом пространстве.
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {allServices.map((s) => (
          <div
            key={s.title}
            className="p-8 rounded-xl border bg-card hover:border-primary/40 transition-all duration-300"
          >
            <s.icon className="text-primary mb-4" size={28} />
            <h3 className="font-heading text-lg mb-2">{s.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  </Layout>
);

export default Services;
