import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { processTokenFromUrl } from "./lib/participationUser";

// Best-effort: exchange ?token= for a user identity on first paint.
void processTokenFromUrl();

createRoot(document.getElementById("root")!).render(<App />);
