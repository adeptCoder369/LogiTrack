import React from "react";
import ReactDOM from "react-dom/client";
import api from "@/lib/api";
import { initOfflineSupport } from "@/lib/offline";
import { initMobileListeners } from "@/lib/mobile";
import "@/index.css";
import App from "@/App";
import { registerServiceWorker } from "./serviceWorkerRegistration";

initOfflineSupport(api);
initMobileListeners();
registerServiceWorker();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
