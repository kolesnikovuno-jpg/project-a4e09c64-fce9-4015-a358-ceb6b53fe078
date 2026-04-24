import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

const UnoStudio = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (sessionStorage.getItem("unostudio-gateway") !== "ok") {
      navigate("/gateway", { replace: true });
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-xl w-full text-left -ml-[0.35em]"
      >
        <span className="text-base tracking-[0.15em] font-normal text-foreground">
          .uno<span className="text-[9px] tracking-[0.08em] text-muted-foreground">studio</span>
        </span>
        <p className="mt-8 text-foreground/80 text-[15px] leading-[1.7] ml-[0.35em]">
          Закрытое пространство студии.
        </p>
      </motion.div>
    </div>
  );
};

export default UnoStudio;
