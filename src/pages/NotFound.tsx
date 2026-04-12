import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-[15px] font-medium text-foreground mb-2">404</p>
        <p className="text-[13px] text-muted-foreground mb-6">Страница не найдена</p>
        <Link to="/" className="text-[13px] text-primary hover:text-primary/80 transition-colors">
          ← .uno
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
