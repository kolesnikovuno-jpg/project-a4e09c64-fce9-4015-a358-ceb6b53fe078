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

  const squares = Array.from({ length: 9 });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="grid grid-cols-3 gap-[4%] aspect-square w-[20vw] min-w-[180px]"
      >
        {squares.map((_, i) => (
          <a
            key={i}
            href="#"
            aria-label={`Раздел ${i + 1}`}
            className="block w-full aspect-square transition-all duration-300 hover:brightness-90 active:brightness-75"
            style={{ backgroundColor: "#C8D9E6" }}
          />
        ))}
      </motion.div>
    </div>
  );
};

export default UnoStudio;
