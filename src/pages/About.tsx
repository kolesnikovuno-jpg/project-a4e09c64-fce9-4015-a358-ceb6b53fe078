import Layout from "@/components/Layout";

const About = () => (
  <Layout>
    <section className="container mx-auto px-6 py-24">
      <p className="text-sm font-medium uppercase text-primary mb-4">
        О нас
      </p>
      <h1 className="text-3xl md:text-5xl mb-6 max-w-xl">
        Кто мы <span className="text-primary">такие</span>
      </h1>

      <div className="max-w-2xl space-y-6 text-muted-foreground leading-relaxed">
        <p>
          Мы — небольшая, но амбициозная команда, которая верит в силу простоты и качества. 
          Каждый наш проект начинается с глубокого понимания задач клиента.
        </p>
        <p>
          За годы работы мы накопили богатый опыт в дизайне, разработке и стратегическом 
          планировании. Мы не просто выполняем задачи — мы становимся партнёрами наших клиентов.
        </p>
        <p>
          Наш подход — минимум лишнего, максимум результата. Мы ценим прозрачность, 
          открытость и долгосрочные отношения.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-8 mt-16">
        {[
          { num: "50+", label: "Проектов" },
          { num: "5 лет", label: "Опыта" },
          { num: "30+", label: "Клиентов" },
        ].map((stat) => (
          <div key={stat.label} className="text-center p-8 rounded-xl border bg-card">
            <div className="font-heading text-3xl text-primary mb-1">{stat.num}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  </Layout>
);

export default About;
