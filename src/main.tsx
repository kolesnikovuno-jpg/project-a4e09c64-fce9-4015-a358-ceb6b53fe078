import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { processTokenFromUrl } from "./lib/participationUser";

/**
 * This historical branch is still bound to egg-test.kolesnikov.studio.
 * Retire its visible UI without deleting the domain, existing bookmarks,
 * projects, or authentication fragments. Every old visit now reaches the
 * canonical, actively developed EGG origin instead.
 */
if (window.location.hostname === "egg-test.kolesnikov.studio") {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const params = new URLSearchParams(window.location.search);
  let destination = "/egg/connect";
  if (/^\/(?:ru|uk|en)\/egg$/.test(path)) destination = path;
  else if (path === "/egg/workspace") destination = "/ru/egg";
  else if (path === "/egg/author") {
    destination = "/ru/egg";
    params.set("start", "idea");
  }
  else if (path === "/egg" && params.has("project")) destination = "/ru/egg";
  else if (["/egg/connect", "/egg/yolk", "/egg/collab"].includes(path)) destination = path;
  else if (/^\/(?:ru|uk|en)\/egg\/yolk$/.test(path)) destination = "/egg/yolk";
  const query = params.toString();
  window.location.replace(
    "https://egg.kolesnikov.studio" + destination +
    (query ? "?" + query : "") + window.location.hash
  );
} else {
  // Best effort: exchange ?token= for a user identity on first paint.
  void processTokenFromUrl();

  try {
    const userId = localStorage.getItem("user_id");
    if (userId) console.log("User recognized:", userId);
  } catch {
    /* ignore */
  }
  createRoot(document.getElementById("root")!).render(<App />);
}
