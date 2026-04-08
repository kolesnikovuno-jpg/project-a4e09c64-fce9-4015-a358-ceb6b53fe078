import { Link } from "react-router-dom";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const Header = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto flex items-center justify-between h-16 px-6">
        <Link to="/" className="font-heading text-xl">
          Визитка
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <Link to="/services" className="text-muted-foreground hover:text-foreground transition-colors">
            Услуги
          </Link>
          <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
            О нас
          </Link>
          <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
            Контакты
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          className="md:hidden text-foreground"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="md:hidden border-t bg-background px-6 py-4 flex flex-col gap-4 text-sm font-medium animate-in fade-in slide-in-from-top-2">
          <Link to="/services" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            Услуги
          </Link>
          <Link to="/about" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            О нас
          </Link>
          <Link to="/contact" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
            Контакты
          </Link>
        </nav>
      )}
    </header>
  );
};

export default Header;
