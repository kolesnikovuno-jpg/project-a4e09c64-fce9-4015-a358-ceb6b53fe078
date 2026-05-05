import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { processTokenFromUrl } from "./lib/participationUser";

// Best-effort: exchange ?token= for a user identity on first paint.
void processTokenFromUrl();

// Recognise returning users from localStorage.
try {
  const userId = localStorage.getItem("user_id");
  if (userId) console.log("User recognized:", userId);
} catch {
  /* ignore */
}

createRoot(document.getElementById("root")!).render(<App />);
