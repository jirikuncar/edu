import "../styles/app.css";
import "./atlas.css";

import React from "react";
import { createRoot } from "react-dom/client";

import { mountShell, bindTitle, SECTIONS } from "../lib/shell.js";
import App from "./App.jsx";

mountShell(document.getElementById("shell"), "atlas");
bindTitle(SECTIONS[1].title);

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
