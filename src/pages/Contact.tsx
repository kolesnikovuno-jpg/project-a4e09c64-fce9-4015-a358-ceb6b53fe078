import { Mail, Phone, MapPin } from "lucide-react";
import Layout from "@/components/Layout";

const contacts = [
  { icon: Mail, label: "Email", value: "hello@example.com" },
  { icon: Phone, label: "Телефон", value: "+7 (999) 123-45-67" },
  { icon: MapPin, label: "Адрес", value: "Москва, Россия" },
];

const Contact = () => (
  <Layout>
    <section className="container mx-auto px-6 py-24">
      <p className="text-sm font-medium tracking-[0.15em] uppercase text-primary mb-4">
        Контакты
      </p>
      <h1 className="text-3xl md:text-5xl mb-6 max-w-xl">
        Свяжитесь <span className="text-primary">с нами</span>
      </h1>
      <p className="text-muted-foreground max-w-lg mb-16 leading-relaxed">
        Готовы обсудить ваш проект? Напишите нам или позвоните — мы всегда на связи.
      </p>

      <div className="grid sm:grid-cols-3 gap-6 max-w-2xl">
        {contacts.map((c) => (
          <div
            key={c.label}
            className="p-8 rounded-xl border bg-card text-center"
          >
            <c.icon className="text-primary mx-auto mb-4" size={28} />
            <div className="text-sm text-muted-foreground mb-1">{c.label}</div>
            <div className="font-medium text-sm">{c.value}</div>
          </div>
        ))}
      </div>
    </section>
  </Layout>
);

export default Contact;
